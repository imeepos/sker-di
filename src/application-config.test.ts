import { 
  provideApplicationConfig, 
  provideApplicationConfigFactory,
  APPLICATION_CONFIG, 
  APPLICATION_BOOTSTRAP_CONTEXT,
  WEB_APPLICATION_CONFIG,
  MICROSERVICE_APPLICATION_CONFIG,
  BaseApplicationConfig,
  WebApplicationConfig,
  MicroserviceApplicationConfig 
} from './application-config';
import { EnvironmentInjector } from './environment-injector';
import { createPlatformFactory } from './platform-factory';

describe('应用配置系统', () => {
  afterEach(() => {
    // 清理全局实例
    (EnvironmentInjector as any).rootInjectorInstance = null;
    (EnvironmentInjector as any).platformInjectorInstance = null;
  });

  describe('provideApplicationConfig', () => {
    it('应该为Web应用提供正确的配置', () => {
      const webConfig: WebApplicationConfig = {
        type: 'web',
        name: 'my-web-app',
        enableDebug: true,
        selector: '#app',
        enableRouting: true,
        basePath: '/web'
      };

      const providers = provideApplicationConfig(webConfig);
      
      // 首先创建平台注入器
      EnvironmentInjector.createRootInjector([]);
      const platformInjector = EnvironmentInjector.createPlatformInjector([]);
      const injector = EnvironmentInjector.createApplicationInjector(providers);

      // 验证基础配置
      const baseConfig = injector.get(APPLICATION_CONFIG);
      expect(baseConfig.name).toBe('my-web-app');
      expect(baseConfig.enableDebug).toBe(true);

      // 验证Web特定配置
      const specificConfig = injector.get(WEB_APPLICATION_CONFIG);
      expect(specificConfig.type).toBe('web');
      expect(specificConfig.selector).toBe('#app');
      expect(specificConfig.enableRouting).toBe(true);
      expect(specificConfig.basePath).toBe('/web');

      // 验证启动上下文
      const bootstrapContext = injector.get(APPLICATION_BOOTSTRAP_CONTEXT);
      expect(bootstrapContext.bootstrapTime).toBeGreaterThan(0);
      expect(bootstrapContext.platformName).toBe('default');

      injector.destroy();
    });

    it('应该为微服务应用提供正确的配置', () => {
      const microserviceConfig: MicroserviceApplicationConfig = {
        type: 'microservice',
        name: 'my-api-service',
        port: 3000,
        host: 'localhost',
        apiPrefix: '/api/v1',
        maxRequestSize: 1024
      };

      const providers = provideApplicationConfig(microserviceConfig);
      
      // 首先创建平台注入器
      EnvironmentInjector.createRootInjector([]);
      const platformInjector = EnvironmentInjector.createPlatformInjector([]);
      const injector = EnvironmentInjector.createApplicationInjector(providers);

      // 验证基础配置
      const baseConfig = injector.get(APPLICATION_CONFIG);
      expect(baseConfig.name).toBe('my-api-service');

      // 验证微服务特定配置
      const specificConfig = injector.get(MICROSERVICE_APPLICATION_CONFIG);
      expect(specificConfig.type).toBe('microservice');
      expect(specificConfig.port).toBe(3000);
      expect(specificConfig.host).toBe('localhost');
      expect(specificConfig.apiPrefix).toBe('/api/v1');
      expect(specificConfig.maxRequestSize).toBe(1024);

      injector.destroy();
    });
  });

  describe('provideApplicationConfigFactory', () => {
    it('应该支持动态配置创建', () => {
      let configCallCount = 0;
      
      const factory = () => {
        configCallCount++;
        return {
          type: 'web' as const,
          name: `dynamic-app-${configCallCount}`,
          enableDebug: configCallCount === 1,
          selector: '#dynamic-app'
        };
      };

      const providers = provideApplicationConfigFactory(factory);
      
      // 首先创建平台注入器
      EnvironmentInjector.createRootInjector([]);
      const platformInjector = EnvironmentInjector.createPlatformInjector([]);
      const injector = EnvironmentInjector.createApplicationInjector(providers);

      // 第一次获取配置
      const config1 = injector.get(APPLICATION_CONFIG);
      expect(config1.name).toBe('dynamic-app-1');
      expect(config1.enableDebug).toBe(true);

      // 配置工厂应该只调用一次（单例）
      const config2 = injector.get(APPLICATION_CONFIG);
      expect(config2).toBe(config1);
      expect(configCallCount).toBe(1);

      injector.destroy();
    });
  });
});

describe('平台应用配置集成', () => {
  afterEach(() => {
    // 清理全局实例
    (EnvironmentInjector as any).rootInjectorInstance = null;
    (EnvironmentInjector as any).platformInjectorInstance = null;
  });
  it('应该能够通过新配置系统引导应用', async () => {
    // 创建平台
    const platformFactory = createPlatformFactory(null, {
      config: { name: 'test-platform', version: '1.0.0' },
      providers: []
    });
    
    const platform = platformFactory();

    // 使用新配置系统
    const webConfig: WebApplicationConfig = {
      type: 'web',
      name: 'config-test-app',
      enableDebug: true,
      selector: '#test-app',
      enableRouting: false
    };

    const app = await platform.bootstrapApplication([
      ...provideApplicationConfig(webConfig),
      // 其他应用提供者
      { provide: 'TEST_SERVICE', useValue: 'test-service-value' }
    ]);

    // 验证应用可以注入配置
    const appConfig = app.injector.get(APPLICATION_CONFIG);
    expect(appConfig.name).toBe('config-test-app');
    expect(appConfig.enableDebug).toBe(true);

    const webAppConfig = app.injector.get(WEB_APPLICATION_CONFIG);
    expect(webAppConfig.selector).toBe('#test-app');
    expect(webAppConfig.enableRouting).toBe(false);

    const bootstrapContext = app.injector.get(APPLICATION_BOOTSTRAP_CONTEXT);
    expect(bootstrapContext.platformName).toBe('test-platform');

    // 验证其他服务也正常工作
    const testService = app.injector.get('TEST_SERVICE');
    expect(testService).toBe('test-service-value');

    app.destroy();
    platform.destroy();
  });


  it('应该为没有配置的应用提供默认配置', async () => {
    const platformFactory = createPlatformFactory(null, {
      config: { name: 'default-platform', version: '1.0.0' },
      providers: []
    });
    
    const platform = platformFactory();

    // 不提供任何配置
    const app = await platform.bootstrapApplication([
      { provide: 'TEST_SERVICE', useValue: 'test' }
    ]);

    // 验证默认配置被提供
    const appConfig = app.injector.get(APPLICATION_CONFIG);
    expect(appConfig.name).toMatch(/^app-\d+$/); // 格式: app-{timestamp}

    const bootstrapContext = app.injector.get(APPLICATION_BOOTSTRAP_CONTEXT);
    expect(bootstrapContext.platformName).toBe('default-platform');
    expect(bootstrapContext.bootstrapTime).toBeGreaterThan(0);

    app.destroy();
    platform.destroy();
  });
});
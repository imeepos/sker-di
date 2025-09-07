import { 
  provideApplicationConfig, 
  provideApplicationConfigFactory,
  APPLICATION_CONFIG, 
  APPLICATION_BOOTSTRAP_CONTEXT,
  BaseApplicationConfig,
  ApplicationConfig
} from './application-config';
import { 
  EnvironmentInjector,
  INJECTOR_REGISTRY,
  IInjectorRegistry,
  InjectorRegistry,
  createInjector 
} from './index';
import { createPlatformFactory, resetGlobalInjectorRegistry } from './platform-factory';

describe('应用配置系统', () => {
  let registry: IInjectorRegistry;

  beforeEach(() => {
    // 创建独立的注入器注册表
    const rootInjector = createInjector([
      { provide: INJECTOR_REGISTRY, useClass: InjectorRegistry }
    ], undefined, 'root');
    registry = rootInjector.get(INJECTOR_REGISTRY);
  });

  afterEach(() => {
    // 清理所有注入器
    registry && registry.destroyAll();
  });

  describe('provideApplicationConfig', () => {
    it('应该提供基础应用配置', () => {
      const appConfig: ApplicationConfig = {
        name: 'my-app',
        enableDebug: true,
        version: '1.0.0',
        environment: 'development'
      };

      const providers = provideApplicationConfig(appConfig);
      
      // 首先创建平台注入器
      registry.createRootInjector([]);
      const platformInjector = registry.createPlatformInjector([]);
      const injector = registry.createApplicationInjector(providers);

      // 验证基础配置
      const baseConfig = injector.get(APPLICATION_CONFIG);
      expect(baseConfig.name).toBe('my-app');
      expect(baseConfig.enableDebug).toBe(true);
      expect(baseConfig.version).toBe('1.0.0');
      expect(baseConfig.environment).toBe('development');

      // 验证启动上下文
      const bootstrapContext = injector.get(APPLICATION_BOOTSTRAP_CONTEXT);
      expect(bootstrapContext.bootstrapTime).toBeGreaterThan(0);
      expect(bootstrapContext.platformName).toBe('default');

      injector.destroy();
    });

    it('应该支持最小配置', () => {
      const minimalConfig: ApplicationConfig = {
        name: 'minimal-app'
      };

      const providers = provideApplicationConfig(minimalConfig);
      
      registry.createRootInjector([]);
      const platformInjector = registry.createPlatformInjector([]);
      const injector = registry.createApplicationInjector(providers);

      const baseConfig = injector.get(APPLICATION_CONFIG);
      expect(baseConfig.name).toBe('minimal-app');
      expect(baseConfig.enableDebug).toBeUndefined();
      expect(baseConfig.version).toBeUndefined();
      expect(baseConfig.environment).toBeUndefined();

      injector.destroy();
    });
  });

  describe('provideApplicationConfigFactory', () => {
    it('应该支持动态配置创建', () => {
      let configCallCount = 0;
      
      const factory = () => {
        configCallCount++;
        return {
          name: `dynamic-app-${configCallCount}`,
          enableDebug: configCallCount === 1,
          version: '1.0.0'
        };
      };

      const providers = provideApplicationConfigFactory(factory);
      
      // 首先创建平台注入器
      registry.createRootInjector([]);
      const platformInjector = registry.createPlatformInjector([]);
      const injector = registry.createApplicationInjector(providers);

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
  beforeEach(() => {
    // 重置全局状态
    resetGlobalInjectorRegistry();
  });

  afterEach(() => {
    // 重置全局状态
    resetGlobalInjectorRegistry();
  });

  it('应该能够通过新配置系统引导应用', async () => {
    // 创建平台
    const platformFactory = createPlatformFactory(null, {
      config: { name: 'test-platform', version: '1.0.0' },
      providers: []
    });
    
    const platform = platformFactory();

    // 使用新配置系统
    const appConfig: ApplicationConfig = {
      name: 'config-test-app',
      enableDebug: true,
      version: '1.0.0',
      environment: 'test'
    };

    const app = await platform.bootstrapApplication([
      ...provideApplicationConfig(appConfig),
      // 其他应用提供者
      { provide: 'TEST_SERVICE', useValue: 'test-service-value' }
    ]);

    // 验证应用可以注入配置
    const retrievedConfig = app.injector.get(APPLICATION_CONFIG);
    expect(retrievedConfig.name).toBe('config-test-app');
    expect(retrievedConfig.enableDebug).toBe(true);
    expect(retrievedConfig.version).toBe('1.0.0');
    expect(retrievedConfig.environment).toBe('test');

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
    const retrievedConfig = app.injector.get(APPLICATION_CONFIG);
    expect(retrievedConfig.name).toMatch(/^app-\d+$/); // 格式: app-{timestamp}

    const bootstrapContext = app.injector.get(APPLICATION_BOOTSTRAP_CONTEXT);
    expect(bootstrapContext.platformName).toBe('default-platform');
    expect(bootstrapContext.bootstrapTime).toBeGreaterThan(0);

    app.destroy();
    platform.destroy();
  });
});
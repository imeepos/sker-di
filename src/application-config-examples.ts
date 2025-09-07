/**
 * 应用配置系统使用示例
 * 展示如何使用新的基于依赖注入的应用配置系统
 */

import { 
  createPlatformFactory,
  provideApplicationConfig,
  provideApplicationConfigFactory,
  WebApplicationConfig,
  MicroserviceApplicationConfig,
  APPLICATION_CONFIG,
  APPLICATION_BOOTSTRAP_CONTEXT,
  WEB_APPLICATION_CONFIG,
  MICROSERVICE_APPLICATION_CONFIG,
  inject
} from './index';

// =============================================
// 示例1: Web应用配置
// =============================================

export async function webApplicationExample() {
  console.log('=== Web应用配置示例 ===');
  
  // 1. 定义Web应用配置
  const webConfig: WebApplicationConfig = {
    type: 'web',
    name: 'my-spa-app',
    version: '1.0.0',
    environment: 'production',
    enableDebug: false,
    selector: '#root',
    enableRouting: true,
    basePath: '/app',
    assetsPath: '/static'
  };

  // 2. 创建平台
  const webPlatformFactory = createPlatformFactory(null, {
    config: { name: 'web-platform', version: '1.0.0' },
    providers: []
  });
  
  const platform = webPlatformFactory();

  // 3. 使用新的配置系统引导应用
  const app = await platform.bootstrapApplication([
    // 提供应用配置
    ...provideApplicationConfig(webConfig),
    
    // 其他业务服务
    { provide: 'ROUTER_SERVICE', useClass: RouterService },
    { provide: 'HTTP_SERVICE', useClass: HttpService }
  ]);

  // 4. 在应用内部使用配置
  class MyWebComponent {
    constructor(
      @inject(APPLICATION_CONFIG) private config: WebApplicationConfig,
      @inject(WEB_APPLICATION_CONFIG) private webConfig: WebApplicationConfig,
      @inject(APPLICATION_BOOTSTRAP_CONTEXT) private context: any,
      @inject('ROUTER_SERVICE') private router: RouterService
    ) {}

    initialize() {
      console.log(`应用名称: ${this.config.name}`);
      console.log(`DOM选择器: ${this.webConfig.selector}`);
      console.log(`启动时间: ${new Date(this.context.bootstrapTime)}`);
      console.log(`平台: ${this.context.platformName}`);
    }
  }

  // 注册组件并启动
  const component = app.bootstrap(MyWebComponent);
  component.initialize();

  app.destroy();
  platform.destroy();
}

// =============================================
// 示例2: 微服务应用配置
// =============================================

export async function microserviceApplicationExample() {
  console.log('\n=== 微服务应用配置示例 ===');

  // 1. 定义微服务配置
  const microConfig: MicroserviceApplicationConfig = {
    type: 'microservice',
    name: 'user-service',
    version: '2.1.0',
    environment: 'development',
    enableDebug: true,
    port: 3000,
    host: 'localhost',
    apiPrefix: '/api/v1',
    maxRequestSize: 10 * 1024 * 1024 // 10MB
  };

  // 2. 创建平台
  const microPlatformFactory = createPlatformFactory(null, {
    config: { name: 'microservice-platform', version: '1.0.0' },
    providers: []
  });
  
  const platform = microPlatformFactory();

  // 3. 引导微服务应用
  const app = await platform.bootstrapApplication([
    ...provideApplicationConfig(microConfig),
    { provide: 'DATABASE_SERVICE', useClass: DatabaseService },
    { provide: 'AUTH_SERVICE', useClass: AuthService }
  ]);

  // 4. 微服务启动类
  class MicroserviceBootstrap {
    constructor(
      @inject(APPLICATION_CONFIG) private config: MicroserviceApplicationConfig,
      @inject(MICROSERVICE_APPLICATION_CONFIG) private microConfig: MicroserviceApplicationConfig,
      @inject('DATABASE_SERVICE') private db: DatabaseService
    ) {}

    async start() {
      console.log(`启动微服务: ${this.config.name} v${this.config.version}`);
      console.log(`监听端口: ${this.microConfig.host}:${this.microConfig.port}`);
      console.log(`API前缀: ${this.microConfig.apiPrefix}`);
      console.log(`调试模式: ${this.config.enableDebug ? '开启' : '关闭'}`);
      
      await this.db.connect();
      console.log('数据库连接成功');
    }
  }

  const bootstrap = app.bootstrap(MicroserviceBootstrap);
  await bootstrap.start();

  app.destroy();
  platform.destroy();
}

// =============================================
// 示例3: 动态配置工厂
// =============================================

export async function dynamicConfigExample() {
  console.log('\n=== 动态配置工厂示例 ===');

  // 1. 创建配置工厂（可根据环境变量动态生成）
  const configFactory = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const port = parseInt(process.env.PORT || '3000');
    
    return {
      type: 'microservice' as const,
      name: 'dynamic-service',
      environment: isProduction ? 'production' as const : 'development' as const,
      enableDebug: !isProduction,
      port,
      host: isProduction ? '0.0.0.0' : 'localhost',
      apiPrefix: '/api',
      maxRequestSize: isProduction ? 5 * 1024 * 1024 : 1024 * 1024
    };
  };

  // 2. 创建平台和应用
  const platformFactory = createPlatformFactory(null, {
    config: { name: 'dynamic-platform', version: '1.0.0' },
    providers: []
  });
  
  const platform = platformFactory();
  
  const app = await platform.bootstrapApplication([
    ...provideApplicationConfigFactory(configFactory),
    { provide: 'SERVICE', useClass: DynamicService }
  ]);

  // 3. 服务类使用动态配置
  class ConfigurableService {
    constructor(
      @inject(APPLICATION_CONFIG) private config: any,
      @inject(APPLICATION_BOOTSTRAP_CONTEXT) private context: any
    ) {}

    start() {
      console.log(`动态配置服务启动:`);
      console.log(`- 环境: ${this.config.environment}`);
      console.log(`- 端口: ${this.config.port}`);
      console.log(`- 调试: ${this.config.enableDebug}`);
      console.log(`- 启动时间: ${new Date(this.context.bootstrapTime)}`);
    }
  }

  const service = app.bootstrap(ConfigurableService);
  service.start();

  app.destroy();
  platform.destroy();
}

// =============================================
// 示例4: 向后兼容演示
// =============================================

export async function legacyCompatibilityExample() {
  console.log('\n=== 向后兼容示例 ===');

  const platformFactory = createPlatformFactory(null, {
    config: { name: 'legacy-platform', version: '1.0.0' },
    providers: []
  });
  
  const platform = platformFactory();

  // 使用旧版本API（会显示警告）
  const app = await platform.bootstrapApplication(
    [
      { provide: 'LEGACY_SERVICE', useValue: 'legacy-value' }
    ],
    {
      name: 'legacy-app',
      enableDebug: true
    }
  );

  // 验证配置仍然可用
  class LegacyTestService {
    constructor(
      @inject(APPLICATION_CONFIG) private config: any,
      @inject(APPLICATION_BOOTSTRAP_CONTEXT) private context: any
    ) {}

    test() {
      console.log('旧版本配置转换成功:');
      console.log(`- 应用名称: ${this.config.name}`);
      console.log(`- 调试模式: ${this.config.enableDebug}`);
      console.log(`- 平台名称: ${this.context.platformName}`);
    }
  }

  const testService = app.bootstrap(LegacyTestService);
  testService.test();

  app.destroy();
  platform.destroy();
}

// =============================================
// 辅助服务类
// =============================================

class RouterService {
  navigate(path: string) {
    console.log(`导航到: ${path}`);
  }
}

class HttpService {
  get(url: string) {
    console.log(`HTTP GET: ${url}`);
  }
}

class DatabaseService {
  async connect() {
    console.log('连接数据库...');
  }
}

class AuthService {
  authenticate(token: string) {
    console.log(`认证token: ${token}`);
  }
}

class DynamicService {
  process() {
    console.log('处理动态服务请求');
  }
}

// =============================================
// 运行所有示例
// =============================================

export async function runAllExamples() {
  try {
    await webApplicationExample();
    await microserviceApplicationExample();
    await dynamicConfigExample();
    await legacyCompatibilityExample();
    
    console.log('\n✅ 所有应用配置示例运行完成！');
  } catch (error) {
    console.error('❌ 示例运行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
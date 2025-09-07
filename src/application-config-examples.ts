/**
 * 应用配置系统使用示例
 * 展示如何使用新的基于依赖注入的应用配置系统
 */

import { 
  createPlatformFactory,
  provideApplicationConfig,
  provideApplicationConfigFactory,
  ApplicationConfig,
  APPLICATION_CONFIG,
  APPLICATION_BOOTSTRAP_CONTEXT,
  inject
} from './index';

// =============================================
// 示例1: 基础应用配置
// =============================================

export async function basicApplicationExample() {
  console.log('=== 基础应用配置示例 ===');
  
  // 1. 定义通用应用配置
  const appConfig: ApplicationConfig = {
    name: 'my-universal-app',
    version: '1.0.0',
    environment: 'production',
    enableDebug: false
  };

  // 2. 创建平台
  const platformFactory = createPlatformFactory(null, {
    config: { name: 'universal-platform', version: '1.0.0' },
    providers: []
  });
  
  const platform = platformFactory();

  // 3. 使用新的配置系统引导应用
  const app = await platform.bootstrapApplication([
    // 提供应用配置
    ...provideApplicationConfig(appConfig),
    
    // 其他业务服务
    { provide: 'ROUTER_SERVICE', useClass: RouterService },
    { provide: 'HTTP_SERVICE', useClass: HttpService }
  ]);

  // 4. 在应用内部使用配置
  class MyAppComponent {
    constructor(
      @inject(APPLICATION_CONFIG) private config: ApplicationConfig,
      @inject(APPLICATION_BOOTSTRAP_CONTEXT) private context: any,
      @inject('ROUTER_SERVICE') private router: RouterService
    ) {}

    initialize() {
      console.log(`应用名称: ${this.config.name}`);
      console.log(`版本: ${this.config.version}`);
      console.log(`环境: ${this.config.environment}`);
      console.log(`启动时间: ${new Date(this.context.bootstrapTime)}`);
      console.log(`平台: ${this.context.platformName}`);
    }
  }

  // 注册组件并启动
  const component = app.bootstrap(MyAppComponent);
  component.initialize();

  app.destroy();
  platform.destroy();
}

// =============================================
// 示例2: 带扩展配置的应用
// =============================================

export async function extendedApplicationExample() {
  console.log('\n=== 扩展应用配置示例 ===');

  // 1. 定义扩展配置（使用自定义属性）
  const appConfig: ApplicationConfig & { port?: number; host?: string } = {
    name: 'extended-service',
    version: '2.1.0',
    environment: 'development',
    enableDebug: true,
    // 自定义扩展属性
    port: 3000,
    host: 'localhost'
  };

  // 2. 创建平台
  const platformFactory = createPlatformFactory(null, {
    config: { name: 'extended-platform', version: '1.0.0' },
    providers: []
  });
  
  const platform = platformFactory();

  // 3. 引导应用
  const app = await platform.bootstrapApplication([
    ...provideApplicationConfig(appConfig),
    { provide: 'DATABASE_SERVICE', useClass: DatabaseService },
    { provide: 'AUTH_SERVICE', useClass: AuthService }
  ]);

  // 4. 服务启动类
  class ExtendedBootstrap {
    constructor(
      @inject(APPLICATION_CONFIG) private config: ApplicationConfig & { port?: number; host?: string },
      @inject('DATABASE_SERVICE') private db: DatabaseService
    ) {}

    async start() {
      console.log(`启动应用: ${this.config.name} v${this.config.version}`);
      if (this.config.port && this.config.host) {
        console.log(`监听地址: ${this.config.host}:${this.config.port}`);
      }
      console.log(`调试模式: ${this.config.enableDebug ? '开启' : '关闭'}`);
      
      await this.db.connect();
      console.log('数据库连接成功');
    }
  }

  const bootstrap = app.bootstrap(ExtendedBootstrap);
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
    
    return {
      name: 'dynamic-service',
      environment: isProduction ? 'production' as const : 'development' as const,
      enableDebug: !isProduction,
      version: '1.0.0'
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
      console.log(`- 版本: ${this.config.version}`);
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
    await basicApplicationExample();
    await extendedApplicationExample();
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
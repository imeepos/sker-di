/**
 * 新平台架构使用示例
 * 展示单一平台、多应用、多Feature的设计
 */

import {
  createPlatformFactory,
  getPlatform,
  destroyPlatform,
  hasPlatform,
  ApplicationFeature,
  ApplicationState,
  provideApplicationConfig,
  WebApplicationConfig,
  MicroserviceApplicationConfig,
  inject
} from './index';

// =============================================
// 示例1: 单一平台多应用架构
// =============================================

export async function singlePlatformMultipleAppsExample() {
  console.log('=== 单一平台多应用示例 ===');

  // 1. 创建平台（全局唯一）
  const platformFactory = createPlatformFactory(null, {
    config: { 
      name: 'enterprise-platform', 
      version: '2.0.0',
      enableDebug: true 
    },
    providers: [
      // 平台级共享服务
      { provide: 'PLATFORM_LOGGER', useValue: { log: (msg: string) => console.log(`[Platform] ${msg}`) } },
      { provide: 'PLATFORM_CONFIG', useValue: { theme: 'dark', locale: 'zh-CN' } }
    ]
  });

  const platform = platformFactory();
  console.log(`平台创建成功: ${platform.config.name}`);

  // 2. 在同一平台上创建多个应用

  // Web前端应用
  const webApp = await platform.bootstrapApplication('web-frontend', [
    ...provideApplicationConfig({
      type: 'web',
      name: 'Admin Dashboard',
      version: '1.2.0',
      selector: '#admin-app',
      enableRouting: true,
      basePath: '/admin'
    } as WebApplicationConfig),
    { provide: 'WEB_ROUTER', useValue: { navigate: (path: string) => console.log(`Navigate: ${path}`) } }
  ]);

  // API后端应用  
  const apiApp = await platform.bootstrapApplication('api-backend', [
    ...provideApplicationConfig({
      type: 'microservice',
      name: 'User API Service',
      version: '1.5.0',
      port: 3001,
      host: 'localhost',
      apiPrefix: '/api/v1'
    } as MicroserviceApplicationConfig),
    { provide: 'DATABASE', useValue: { query: (sql: string) => console.log(`Query: ${sql}`) } }
  ]);

  // 3. 验证应用隔离性
  console.log('\n应用状态:');
  console.log(`Web应用: ${webApp.name} (${webApp.state})`);
  console.log(`API应用: ${apiApp.name} (${apiApp.state})`);

  // Web应用无法访问API应用的数据库服务
  try {
    webApp.injector.get('DATABASE');
  } catch (error) {
    console.log('✓ 应用隔离正常 - Web应用无法访问API应用的数据库服务');
  }

  // 4. 独立管理应用生命周期
  await platform.destroyApplication('web-frontend');
  console.log('Web应用已销毁，API应用继续运行');
  console.log(`剩余应用: ${platform.getApplicationIds().join(', ')}`);

  // 5. 清理
  destroyPlatform();
}

// =============================================
// 示例2: Feature插件系统
// =============================================

export async function featurePluginSystemExample() {
  console.log('\n=== Feature插件系统示例 ===');

  // 1. 定义可复用的Features
  const loggingFeature: ApplicationFeature = {
    name: 'logging',
    version: '1.0.0',
    providers: [
      { 
        provide: 'LOGGER', 
        useValue: {
          info: (msg: string) => console.log(`[INFO] ${msg}`),
          error: (msg: string) => console.error(`[ERROR] ${msg}`)
        }
      }
    ],
    initialize(app) {
      console.log(`Logger feature initialized for app: ${app.name}`);
    },
    destroy(app) {
      console.log(`Logger feature destroyed for app: ${app.name}`);
    }
  };

  const cacheFeature: ApplicationFeature = {
    name: 'cache',
    version: '2.1.0',
    dependencies: ['logging'], // 依赖日志功能
    providers: [
      {
        provide: 'CACHE',
        useValue: {
          set: (key: string, value: any) => console.log(`Cache SET: ${key}`),
          get: (key: string) => console.log(`Cache GET: ${key}`)
        }
      }
    ],
    initialize(app) {
      const logger = app.injector.get('LOGGER');
      logger.info('Cache feature initialized');
    },
    destroy(app) {
      const logger = app.injector.get('LOGGER');
      logger.info('Cache feature destroyed');
    }
  };

  const authFeature: ApplicationFeature = {
    name: 'auth',
    version: '1.3.0',
    dependencies: ['logging', 'cache'],
    providers: [
      {
        provide: 'AUTH_SERVICE',
        useValue: {
          login: (user: string) => console.log(`User ${user} logged in`),
          logout: () => console.log('User logged out')
        }
      }
    ],
    initialize(app) {
      const logger = app.injector.get('LOGGER');
      logger.info('Auth feature initialized');
    },
    destroy(app) {
      const logger = app.injector.get('LOGGER');
      logger.info('Auth feature destroyed');
    }
  };

  // 2. 创建平台
  const platformFactory = createPlatformFactory(null, {
    config: { name: 'feature-platform', version: '1.0.0' },
    providers: []
  });

  const platform = platformFactory();

  // 3. 创建应用并预装基础Features
  const app = await platform.bootstrapApplication('feature-app', [], [
    loggingFeature // 预装日志功能
  ]);

  console.log(`已加载Features: [${Array.from(app.features.keys()).join(', ')}]`);

  // 4. 动态加载Features（按依赖顺序）
  await app.loadFeature(cacheFeature);
  console.log(`已加载Features: [${Array.from(app.features.keys()).join(', ')}]`);

  await app.loadFeature(authFeature);
  console.log(`已加载Features: [${Array.from(app.features.keys()).join(', ')}]`);

  // 5. 使用Features提供的服务
  const authService = app.injector.get('AUTH_SERVICE');
  authService.login('admin');

  // 6. 卸载Features（按依赖顺序）
  await app.unloadFeature('auth');
  await app.unloadFeature('cache');
  console.log(`剩余Features: [${Array.from(app.features.keys()).join(', ')}]`);

  // 7. 清理
  destroyPlatform();
}

// =============================================
// 示例3: 企业级应用架构
// =============================================

export async function enterpriseArchitectureExample() {
  console.log('\n=== 企业级应用架构示例 ===');

  // 1. 定义企业级Features
  const auditFeature: ApplicationFeature = {
    name: 'audit',
    version: '1.0.0',
    providers: [
      { provide: 'AUDIT_SERVICE', useValue: { log: (action: string) => console.log(`Audit: ${action}`) } }
    ]
  };

  const securityFeature: ApplicationFeature = {
    name: 'security',
    version: '1.0.0',
    dependencies: ['audit'],
    providers: [
      { provide: 'SECURITY_SERVICE', useValue: { validate: (token: string) => true } }
    ]
  };

  const monitoringFeature: ApplicationFeature = {
    name: 'monitoring',
    version: '1.0.0',
    providers: [
      { provide: 'METRICS', useValue: { record: (metric: string, value: number) => console.log(`Metric: ${metric}=${value}`) } }
    ]
  };

  // 2. 创建企业平台
  const enterprisePlatformFactory = createPlatformFactory(null, {
    config: { 
      name: 'enterprise-platform',
      version: '3.0.0',
      enableDebug: false
    },
    providers: [
      { provide: 'ENTERPRISE_CONFIG', useValue: { companyName: 'ACME Corp', region: 'Asia' } }
    ]
  });

  const platform = enterprisePlatformFactory();

  // 3. 创建不同类型的企业应用
  
  // 用户管理系统
  const userManagementApp = await platform.bootstrapApplication('user-mgmt', [
    ...provideApplicationConfig({
      type: 'web',
      name: 'User Management System',
      version: '2.1.0',
      enableDebug: true
    } as WebApplicationConfig),
    { provide: 'USER_SERVICE', useValue: { createUser: (name: string) => console.log(`Created user: ${name}`) } }
  ], [auditFeature, securityFeature]);

  // 订单处理系统
  const orderProcessingApp = await platform.bootstrapApplication('order-proc', [
    ...provideApplicationConfig({
      type: 'microservice',
      name: 'Order Processing Service',
      port: 3002,
      apiPrefix: '/orders'
    } as MicroserviceApplicationConfig),
    { provide: 'ORDER_SERVICE', useValue: { processOrder: (id: string) => console.log(`Processing order: ${id}`) } }
  ], [auditFeature, monitoringFeature]);

  // 报表系统
  const reportingApp = await platform.bootstrapApplication('reporting', [
    ...provideApplicationConfig({
      type: 'web',
      name: 'Reporting Dashboard',
      selector: '#reports'
    } as WebApplicationConfig),
    { provide: 'REPORT_SERVICE', useValue: { generateReport: (type: string) => console.log(`Generating ${type} report`) } }
  ], [monitoringFeature]);

  // 4. 展示企业应用生态系统
  console.log('\n企业应用生态系统:');
  console.log(`平台: ${platform.config.name} v${platform.config.version}`);
  console.log(`应用数量: ${platform.getApplications().length}`);
  
  for (const app of platform.getApplications()) {
    console.log(`  - ${app.name} (${app.id})`);
    console.log(`    Features: [${Array.from(app.features.keys()).join(', ')}]`);
  }

  // 5. 模拟业务操作
  console.log('\n模拟业务操作:');
  
  // 用户管理系统操作
  const userService = userManagementApp.injector.get('USER_SERVICE');
  const auditService = userManagementApp.injector.get('AUDIT_SERVICE');
  userService.createUser('张三');
  auditService.log('用户创建操作');

  // 订单处理系统操作
  const orderService = orderProcessingApp.injector.get('ORDER_SERVICE');
  const metrics = orderProcessingApp.injector.get('METRICS');
  orderService.processOrder('ORD-001');
  metrics.record('orders_processed', 1);

  // 6. 动态扩展应用功能
  console.log('\n动态加载安全功能到报表系统:');
  await reportingApp.loadFeature(securityFeature);
  console.log(`报表系统新增Features: [${Array.from(reportingApp.features.keys()).join(', ')}]`);

  // 7. 清理整个平台
  console.log('\n清理企业平台...');
  destroyPlatform();
  console.log('企业平台已清理');
}

// =============================================
// 示例4: 平台单例验证
// =============================================

export async function platformSingletonExample() {
  console.log('\n=== 平台单例验证示例 ===');

  // 1. 创建第一个平台
  const factory1 = createPlatformFactory(null, {
    config: { name: 'platform-1', version: '1.0.0' },
    providers: []
  });

  const platform1 = factory1();
  console.log(`第一个平台创建: ${platform1.config.name}`);
  console.log(`平台是否存在: ${hasPlatform()}`);

  // 2. 尝试创建第二个平台（应该返回同一实例）
  const factory2 = createPlatformFactory(null, {
    config: { name: 'platform-2', version: '2.0.0' },
    providers: []
  });

  const platform2 = factory2(); // 会显示警告并返回相同实例
  console.log(`第二个平台: ${platform2.config.name}`);
  console.log(`是否为同一实例: ${platform1 === platform2}`);

  // 3. 销毁平台
  const destroyed = destroyPlatform();
  console.log(`平台已销毁: ${destroyed}`);
  console.log(`平台是否存在: ${hasPlatform()}`);

  // 4. 现在可以创建新平台
  const platform3 = factory2();
  console.log(`新平台创建: ${platform3.config.name}`);
  console.log(`是否为新实例: ${platform1 !== platform3}`);

  // 5. 清理
  destroyPlatform();
}

// =============================================
// 运行所有示例
// =============================================

export async function runAllNewArchitectureExamples() {
  try {
    await singlePlatformMultipleAppsExample();
    await featurePluginSystemExample();
    await enterpriseArchitectureExample();
    await platformSingletonExample();
    
    console.log('\n✅ 所有新架构示例运行完成！');
    console.log('\n🎯 新架构特点总结:');
    console.log('1. ✅ 单一平台：全局只允许一个平台实例');
    console.log('2. ✅ 多应用：一个平台可以运行多个隔离的应用');
    console.log('3. ✅ 多Feature：应用可以动态加载/卸载功能插件');
    console.log('4. ✅ 依赖管理：Feature之间支持依赖关系');
    console.log('5. ✅ 生命周期：独立的应用和Feature生命周期管理');
    console.log('6. ✅ 类型安全：完整的TypeScript类型支持');
  } catch (error) {
    console.error('❌ 新架构示例运行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllNewArchitectureExamples();
}

// =============================================
// 架构对比示例
// =============================================

export function architectureComparisonExample() {
  console.log('\n=== 架构对比示例 ===');
  
  console.log('\n📊 旧架构 vs 新架构对比:');
  
  console.log('\n旧架构问题:');
  console.log('❌ PlatformRegistry允许多平台同时存在');
  console.log('❌ defaultPlatform概念模糊');
  console.log('❌ 应用管理分散在平台中');
  console.log('❌ 缺乏Feature/插件系统');
  console.log('❌ 配置硬编码在options中');
  
  console.log('\n新架构优势:');
  console.log('✅ 单一平台实例，防止冲突');
  console.log('✅ 专业的ApplicationManager管理应用');
  console.log('✅ Feature插件系统，支持动态加载');
  console.log('✅ 依赖注入配置系统');
  console.log('✅ 完整的生命周期管理');
  console.log('✅ 更好的类型安全');
  
  console.log('\n🏗️ 新架构层次:');
  console.log('GlobalPlatform (单例)');
  console.log('├── Platform (唯一实例)');
  console.log('│   ├── ApplicationManager');
  console.log('│   │   ├── Application 1');
  console.log('│   │   │   ├── Feature A');
  console.log('│   │   │   └── Feature B');
  console.log('│   │   └── Application 2');
  console.log('│   │       ├── Feature A');
  console.log('│   │       └── Feature C');
  console.log('│   └── PlatformExtensions');
  console.log('└── EnvironmentInjector (平台级)');
}
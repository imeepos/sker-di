/**
 * 平台架构扩展性示例
 * 
 * 这个文件展示了如何使用新的平台架构来创建可扩展的应用程序
 */

import {
  createPlatformFactory,
  Module,
  ModuleUtils,
  Injectable,
  InjectionToken,
  Provider,
  BuiltInExtensions,
  registerExtension,
  Logger,
  HttpClient,
  createExtensionManager
} from './index';

// ============================================================================
// 示例 1: 创建企业级Web平台
// ============================================================================

/**
 * 核心平台配置
 */
export const CorePlatform = createPlatformFactory(null, {
  config: {
    name: 'enterprise-core',
    version: '1.0.0',
    description: '企业级核心平台'
  },
  providers: [
    { provide: 'ENVIRONMENT', useValue: 'production' },
    { provide: 'APP_VERSION', useValue: '2.1.0' },
    { provide: 'DEBUG_MODE', useValue: false }
  ]
});

/**
 * Web平台配置（继承核心平台）
 */
export const WebPlatform = createPlatformFactory(CorePlatform, {
  config: {
    name: 'enterprise-web',
    version: '2.0.0',
    description: '企业级Web平台'
  },
  providers: [
    { provide: 'PLATFORM_TYPE', useValue: 'web' },
    { provide: 'BROWSER_SUPPORT', useValue: ['chrome', 'firefox', 'safari', 'edge'] }
  ],
  extensions: [
    BuiltInExtensions.Logger,
    BuiltInExtensions.Http,
    BuiltInExtensions.Storage,
    BuiltInExtensions.Router
  ]
});

// ============================================================================
// 示例 2: 创建微服务平台
// ============================================================================

// 定义微服务相关服务
const SERVICE_REGISTRY = new InjectionToken<ServiceRegistry>('SERVICE_REGISTRY');
const MESSAGE_QUEUE = new InjectionToken<MessageQueue>('MESSAGE_QUEUE');

@Injectable({ providedIn: 'platform' })
export class ServiceRegistry {
  private services = new Map<string, any>();

  register(name: string, service: any): void {
    this.services.set(name, service);
    console.log(`Service registered: ${name}`);
  }

  get(name: string): any {
    return this.services.get(name);
  }

  list(): string[] {
    return Array.from(this.services.keys());
  }
}

@Injectable({ providedIn: 'platform' })
export class MessageQueue {
  private queues = new Map<string, any[]>();

  publish(topic: string, message: any): void {
    if (!this.queues.has(topic)) {
      this.queues.set(topic, []);
    }
    this.queues.get(topic)!.push(message);
    console.log(`Message published to ${topic}:`, message);
  }

  subscribe(topic: string, callback: (message: any) => void): void {
    // 简化的订阅实现
    console.log(`Subscribed to topic: ${topic}`);
  }
}

// 创建微服务扩展
export const MicroserviceExtension: import('./platform-ref').PlatformExtension = {
  name: 'microservice',
  providers: [
    { provide: ServiceRegistry, useClass: ServiceRegistry },
    { provide: MessageQueue, useClass: MessageQueue },
    { provide: SERVICE_REGISTRY, useClass: ServiceRegistry },
    { provide: MESSAGE_QUEUE, useClass: MessageQueue }
  ],
  initialize: async (platform: any) => {
    const registry = platform.injector.get(ServiceRegistry);
    const logger = platform.injector.get(Logger);

    logger.info('Microservice extension initialized');
    registry.register('platform', platform);
  }
};

// 注册微服务扩展
registerExtension(MicroserviceExtension);

/**
 * 微服务平台配置
 */
export const MicroservicePlatform = createPlatformFactory(CorePlatform, {
  config: {
    name: 'microservice',
    version: '1.5.0',
    description: '微服务架构平台'
  },
  providers: [
    { provide: 'PLATFORM_TYPE', useValue: 'microservice' },
    { provide: 'SERVICE_MESH', useValue: 'istio' }
  ],
  extensions: [
    BuiltInExtensions.Logger,
    BuiltInExtensions.Http,
    MicroserviceExtension
  ]
});

// ============================================================================
// 示例 3: 模块化架构
// ============================================================================

// 用户管理模块
@Injectable()
export class UserService {
  constructor(private logger: Logger) { }

  getUsers() {
    this.logger.info('Fetching users...');
    return ['alice', 'bob', 'charlie'];
  }

  createUser(name: string) {
    this.logger.info(`Creating user: ${name}`);
    return { id: Math.random(), name };
  }
}

@Module({
  name: 'UserModule',
  providers: [{ provide: UserService, useClass: UserService }],
  exports: [UserService]
})
export class UserModule {
  static forRoot() {
    return ModuleUtils.forRoot(UserModule, [
      { provide: 'USER_CONFIG', useValue: { maxUsers: 1000 } }
    ]);
  }
}

// 订单管理模块
@Injectable()
export class OrderService {
  constructor(
    private userService: UserService,
    private http: HttpClient,
    private logger: Logger
  ) { }

  async createOrder(userId: number, items: any[]) {
    this.logger.info(`Creating order for user ${userId}`);

    // 验证用户
    const users = this.userService.getUsers();
    if (!users.length) {
      throw new Error('No users found');
    }

    // 调用API
    const result = await this.http.post('/api/orders', { userId, items });

    return { orderId: Math.random(), userId, items, status: 'created' };
  }
}

@Module({
  name: 'OrderModule',
  imports: [UserModule],
  providers: [{ provide: OrderService, useClass: OrderService }],
  exports: [OrderService]
})
export class OrderModule { }

// 应用根模块
@Module({
  name: 'AppModule',
  imports: [
    UserModule.forRoot(),
    OrderModule
  ],
  providers: [
    { provide: 'APP_NAME', useValue: 'E-commerce Platform' },
    { provide: 'APP_VERSION', useValue: '3.0.0' }
  ]
})
export class AppModule { }

// ============================================================================
// 示例 4: 完整的应用启动流程
// ============================================================================

/**
 * 企业级Web应用启动示例
 */
export async function bootstrapWebApplication() {
  console.log('🚀 启动企业级Web应用...\n');

  // 1. 创建平台
  const platform = WebPlatform();
  console.log(`✅ 平台已创建: ${platform.config.name} v${platform.config.version}`);

  // 2. 获取平台服务
  const logger = platform.injector.get(Logger);
  const http = platform.injector.get(HttpClient);

  logger.info('Platform services initialized');

  // 3. 引导应用
  const app = await platform.bootstrapApplication([
    { provide: 'APP_NAME', useValue: 'Enterprise Web App' },
    { provide: UserService, useClass: UserService },
    { provide: OrderService, useClass: OrderService }
  ], { name: 'main-app' });

  console.log('✅ 应用已引导');

  // 4. 获取应用服务并测试
  const userService = app.injector.get(UserService);
  const orderService = app.injector.get(OrderService);

  const users = userService.getUsers();
  console.log('👥 用户列表:', users);

  const order = await orderService.createOrder(1, [
    { name: 'Laptop', price: 999 },
    { name: 'Mouse', price: 29 }
  ]);
  console.log('📦 订单创建:', order);

  return { platform, app, userService, orderService };
}

/**
 * 微服务应用启动示例
 */
export async function bootstrapMicroserviceApplication() {
  console.log('🔧 启动微服务应用...\n');

  // 1. 创建微服务平台
  const platform = MicroservicePlatform();
  console.log(`✅ 微服务平台已创建: ${platform.config.name}`);

  // 2. 获取微服务特有的服务
  const logger = platform.injector.get(Logger);
  const registry = platform.injector.get(ServiceRegistry);
  const messageQueue = platform.injector.get(MessageQueue);

  // 3. 引导微服务
  const userService = await platform.bootstrapApplication([
    { provide: UserService, useClass: UserService },
    { provide: 'SERVICE_NAME', useValue: 'user-service' }
  ], { name: 'user-service' });

  const orderService = await platform.bootstrapApplication([
    { provide: OrderService, useClass: OrderService },
    { provide: 'SERVICE_NAME', useValue: 'order-service' }
  ], { name: 'order-service' });

  // 4. 注册服务到服务注册表
  registry.register('user-service', userService);
  registry.register('order-service', orderService);

  // 5. 测试服务间通信
  messageQueue.publish('user.created', { userId: 123, name: 'John Doe' });
  messageQueue.publish('order.created', { orderId: 456, userId: 123 });

  console.log('🎯 已注册的服务:', registry.list());

  return { platform, userService, orderService };
}

/**
 * 动态扩展示例
 */
export async function demonstrateDynamicExtensions() {
  console.log('🔌 演示动态扩展...\n');

  // 1. 创建基础平台
  const platform = CorePlatform();
  const extensionManager = createExtensionManager();

  // 2. 动态安装扩展
  console.log('📦 安装日志扩展...');
  await extensionManager.install(platform, ['logger']);

  console.log('📦 安装HTTP扩展（自动解析依赖）...');
  await extensionManager.install(platform, ['http']);

  console.log('📦 安装存储扩展...');
  await extensionManager.install(platform, ['storage']);

  console.log('✅ 已安装的扩展:', extensionManager.getInstalled());

  // 3. 使用扩展服务
  const logger = platform.injector.get(Logger);
  const http = platform.injector.get(HttpClient);

  logger.info('Dynamic extensions working!');
  await http.get('/api/test');

  // 4. 动态卸载扩展
  console.log('🗑️ 卸载HTTP扩展...');
  await extensionManager.uninstall(platform, ['http']);

  console.log('✅ 剩余扩展:', extensionManager.getInstalled());

  return { platform, extensionManager };
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('🎯 sker-di 平台架构扩展性示例');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 示例 1: Web应用
    const webExample = await bootstrapWebApplication();
    console.log('\n' + '-'.repeat(40) + '\n');

    // 示例 2: 微服务应用
    const microserviceExample = await bootstrapMicroserviceApplication();
    console.log('\n' + '-'.repeat(40) + '\n');

    // 示例 3: 动态扩展
    const dynamicExample = await demonstrateDynamicExtensions();
    console.log('\n' + '-'.repeat(40) + '\n');

    console.log('🎉 所有示例执行成功！');

    return {
      web: webExample,
      microservice: microserviceExample,
      dynamic: dynamicExample
    };

  } catch (error) {
    console.error('❌ 示例执行失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  runAllExamples()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
# SKER-DI 知识库 QA 文档

## 🎯 基础概念

### 什么是 SKER-DI？

SKER-DI 是一个基于 TypeScript 的轻量级依赖注入框架，提供了完整的依赖注入解决方案，支持多层级注入器架构、自动服务解析、调试工具等企业级特性！

```typescript
import { createInjector, Injectable, Inject } from '@sker/di';

@Injectable({ providedIn: 'root' })
class UserService {
  getUser() { return { name: 'John', id: 1 }; }
}

const injector = createInjector([]);
const userService = injector.get(UserService); // 自动解析
console.log(userService.getUser()); // { name: 'John', id: 1 }
```

### 支持哪些注入器作用域？

SKER-DI 支持五种注入器作用域：`root`、`platform`、`application`、`feature`、`auto`，形成完整的层次结构！

```typescript
import { createRootInjector, createPlatformInjector, createApplicationInjector, Injectable } from '@sker/di';

@Injectable({ providedIn: 'root' })
class RootService { getValue() { return 'root-level'; } }

@Injectable({ providedIn: 'platform' })  
class PlatformService { getValue() { return 'platform-level'; } }

@Injectable({ providedIn: 'application' })
class AppService { getValue() { return 'app-level'; } }

// 创建层次结构
const rootInjector = createRootInjector();
const platformInjector = createPlatformInjector();
const appInjector = createApplicationInjector();

// 服务会在对应作用域自动注册
const rootService = appInjector.get(RootService); // 从根注入器获取
const appService = appInjector.get(AppService);   // 从应用注入器获取
```

## 🏗️ 依赖注入核心

### 如何使用 @Injectable 装饰器？

@Injectable 装饰器用于标记类为可注入的服务，支持多种配置选项！

```typescript
import { Injectable, createInjector } from '@sker/di';

// 基础用法 - 自动解析
@Injectable({ providedIn: 'root' })
class BasicService {
  getData() { return 'basic-data'; }
}

// 工厂函数用法
@Injectable({
  providedIn: 'root',
  useFactory: () => new AdvancedService('config'),
  deps: []
})
class AdvancedService {
  constructor(private config: string) {}
  
  getConfig() { return this.config; }
}

// 不自动注册 - 需要手动配置
@Injectable({ providedIn: null })
class ManualService {
  process() { return 'manual'; }
}

const injector = createInjector([
  { provide: ManualService, useClass: ManualService }
]);
```

### 如何使用 @Inject 装饰器？

@Inject 装饰器用于标记构造函数参数的注入令牌，支持各种注入选项！

```typescript
import { Injectable, Inject, Optional, InjectionToken } from '@sker/di';

const API_URL = new InjectionToken<string>('API_URL');
const DEBUG_MODE = new InjectionToken<boolean>('DEBUG_MODE');

@Injectable({ providedIn: 'root' })
class HttpService {
  constructor(
    @Inject(API_URL) private apiUrl: string,
    @Inject(DEBUG_MODE) @Optional() private debug?: boolean
  ) {}
  
  request(path: string) {
    const url = `${this.apiUrl}${path}`;
    if (this.debug) console.log(`Request: ${url}`);
    return `Response from ${url}`;
  }
}

const injector = createInjector([
  { provide: API_URL, useValue: 'https://api.example.com' },
  { provide: DEBUG_MODE, useValue: true }
]);

const httpService = injector.get(HttpService);
console.log(httpService.request('/users')); // Request: https://api.example.com/users
```

### 支持哪些提供者类型？

SKER-DI 支持五种提供者类型：ValueProvider、ClassProvider、FactoryProvider、ExistingProvider、ConstructorProvider！

```typescript
import { createInjector, InjectionToken } from '@sker/di';

const CONFIG_TOKEN = new InjectionToken<any>('CONFIG');
const LOGGER_TOKEN = new InjectionToken<any>('LOGGER');

class DatabaseService {
  constructor(private config: any) {}
  connect() { return `Connected to ${this.config.host}`; }
}

class FileLogger {
  log(msg: string) { console.log(`[FILE] ${msg}`); }
}

const injector = createInjector([
  // ValueProvider - 直接提供值
  { provide: CONFIG_TOKEN, useValue: { host: 'localhost', port: 5432 } },
  
  // ClassProvider - 使用类构造函数
  { provide: DatabaseService, useClass: DatabaseService },
  
  // FactoryProvider - 使用工厂函数
  { 
    provide: 'DATABASE_CONNECTION', 
    useFactory: (config: any) => new DatabaseService(config),
    deps: [CONFIG_TOKEN]
  },
  
  // ExistingProvider - 别名映射
  { provide: LOGGER_TOKEN, useExisting: FileLogger },
  
  // ConstructorProvider - 类本身作为令牌
  { provide: FileLogger, useClass: FileLogger }
]);
```

## 🔧 高级特性

### 如何处理循环依赖？

SKER-DI 提供 forwardRef 来处理循环依赖问题！

```typescript
import { Injectable, Inject, forwardRef, createInjector } from '@sker/di';

@Injectable({ providedIn: null })
class ServiceA {
  constructor(@Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB) {}
  
  methodA() {
    return `A calls ${this.serviceB.methodB()}`;
  }
}

@Injectable({ providedIn: null })
class ServiceB {
  constructor(@Inject(forwardRef(() => ServiceA)) private serviceA: ServiceA) {}
  
  methodB() {
    return 'B method';
  }
}

const injector = createInjector([
  { provide: ServiceA, useClass: ServiceA },
  { provide: ServiceB, useClass: ServiceB }
]);

const serviceA = injector.get(ServiceA);
console.log(serviceA.methodA()); // A calls B method
```

### 如何使用多值注入？

通过 multi: true 选项可以注册多个同令牌的提供者！

```typescript
import { createInjector, InjectionToken } from '@sker/di';

const PLUGINS = new InjectionToken<any[]>('PLUGINS');

class PluginA {
  name = 'PluginA';
  execute() { return 'A executed'; }
}

class PluginB {  
  name = 'PluginB';
  execute() { return 'B executed'; }
}

const injector = createInjector([
  { provide: PLUGINS, useClass: PluginA, multi: true },
  { provide: PLUGINS, useClass: PluginB, multi: true },
  { provide: PLUGINS, useValue: { name: 'Config', data: {} }, multi: true }
]);

const plugins = injector.get(PLUGINS);
console.log(plugins.length); // 3
plugins.forEach(plugin => {
  console.log(plugin.name); // PluginA, PluginB, Config
});
```

### 如何使用注入上下文？

注入上下文允许在没有注入器实例的情况下进行依赖解析！

```typescript
import { runInInjectionContext, inject, Injectable, createInjector } from '@sker/di';

@Injectable({ providedIn: 'root' })
class ConfigService {
  getConfig() { return { theme: 'dark', lang: 'zh' }; }
}

function useConfig() {
  // 在注入上下文中使用 inject 函数
  const configService = inject(ConfigService);
  return configService.getConfig();
}

const injector = createInjector([]);

// 在注入上下文中运行
const config = runInInjectionContext(injector, () => {
  return useConfig();
});

console.log(config); // { theme: 'dark', lang: 'zh' }
```

## 🛠️ 平台架构系统

### 如何使用平台工厂？

平台工厂提供了创建和管理多个命名平台的能力！

```typescript
import { createPlatformFactory, getPlatform, PlatformRef, Module } from '@sker/di';

@Module({
  providers: [
    { provide: 'PLATFORM_NAME', useValue: 'WebPlatform' }
  ]
})
class WebPlatformModule {}

// 创建平台工厂
const createWebPlatform = createPlatformFactory({
  name: 'web',
  providers: [
    { provide: 'PLATFORM_TYPE', useValue: 'web' }
  ],
  modules: [WebPlatformModule]
});

// 创建平台实例
const platform = createWebPlatform();
const platformName = platform.injector.get('PLATFORM_NAME');
console.log(platformName); // WebPlatform

// 获取已存在的平台
const existingPlatform = getPlatform('web');
console.log(existingPlatform === platform); // true
```

### 如何使用模块系统？

模块系统提供了组织和复用依赖配置的机制！

```typescript
import { Module, Injectable, createApplicationInjector, moduleResolver } from '@sker/di';

@Injectable({ providedIn: 'application' })
class UserService {
  getUsers() { return ['Alice', 'Bob']; }
}

@Injectable({ providedIn: 'application' })
class AuthService {
  isAuthenticated() { return true; }
}

@Module({
  providers: [
    { provide: 'API_BASE_URL', useValue: 'https://api.example.com' }
  ],
  exports: ['API_BASE_URL']
})
class CoreModule {}

@Module({
  imports: [CoreModule],
  providers: [
    UserService,
    AuthService,
    { provide: 'USER_CONFIG', useValue: { pageSize: 20 } }
  ],
  exports: [UserService, AuthService]
})
class UserModule {}

// 解析模块并创建注入器
const resolvedModule = moduleResolver.resolve(UserModule);
const providers = moduleResolver.collectProviders([resolvedModule]);

const appInjector = createApplicationInjector(providers);
const userService = appInjector.get(UserService);
const apiUrl = appInjector.get('API_BASE_URL'); // 从 CoreModule 导出
```

## 🐛 调试和开发工具

### 如何启用调试模式？

SKER-DI 提供了完整的调试工具，支持事件追踪、性能监控等！

```typescript
import { enableDevMode, createInjector, Injectable, getDebugger } from '@sker/di';

// 启用调试模式
enableDevMode({
  logToConsole: true,
  enablePerformanceTracking: true,
  maxEventHistory: 1000,
  enableCircularDependencyDetection: true
});

@Injectable({ providedIn: 'root' })
class DebugService {
  process() { return 'debugging'; }
}

const injector = createInjector([
  { provide: 'CONFIG', useValue: { debug: true } }
]);

// 使用服务（会记录调试信息）
const service = injector.get(DebugService);
const config = injector.get('CONFIG');

// 获取调试信息
const debugger = getDebugger();
const debugInfo = debugger.getDebugInfo();

console.log('注入器数量:', debugInfo.totalInjectors);
console.log('事件数量:', debugInfo.recentEvents.length);
console.log('性能指标:', debugInfo.performanceMetrics);
```

### 如何使用调试检查器？

调试检查器提供了丰富的运行时分析功能！

```typescript
import { createInjector, Injectable, getInspector } from '@sker/di';

@Injectable({ providedIn: 'root' })
class UserService {
  getUsers() { return ['user1', 'user2']; }
}

@Injectable({ providedIn: 'root' })  
class AuthService {
  constructor(private userService: UserService) {}
  
  authenticate() { return true; }
}

const injector = createInjector([
  { provide: 'API_KEY', useValue: 'secret123' }
]);

// 使用服务
const authService = injector.get(AuthService);

// 获取检查器
const inspector = getInspector();

// 打印注入器层次结构
inspector.printHierarchy();

// 打印统计信息
inspector.printStats();

// 搜索令牌
const tokens = inspector.searchTokens('User');
console.log('找到的令牌:', tokens);

// 健康检查
const health = inspector.healthCheck();
console.log('健康状态:', health.isHealthy ? '良好' : '异常');

// 生成完整报告
const report = inspector.generateReport();
console.log('调试报告长度:', report.length);
```

## 🔍 参数装饰器

### 如何使用注入修饰符？

SKER-DI 提供了 Optional、Self、SkipSelf、Host 等修饰符来控制注入行为！

```typescript
import { Injectable, Inject, Optional, Self, SkipSelf, Host, createInjector, InjectionToken } from '@sker/di';

const CONFIG_TOKEN = new InjectionToken<any>('CONFIG');
const THEME_TOKEN = new InjectionToken<string>('THEME');

@Injectable({ providedIn: 'root' })
class ParentService {
  name = 'parent';
}

@Injectable({ providedIn: null })
class ChildService {
  constructor(
    // Optional - 如果没有找到，注入 undefined 而不是抛出错误
    @Inject(THEME_TOKEN) @Optional() private theme?: string,
    
    // Self - 只在当前注入器中查找，不向上查找
    @Inject(CONFIG_TOKEN) @Self() private config: any,
    
    // SkipSelf - 跳过当前注入器，从父注入器开始查找
    @Inject(ParentService) @SkipSelf() private parentService: ParentService,
    
    // Host - 在宿主注入器中查找
    @Inject('HOST_DATA') @Host() private hostData: any
  ) {}
  
  getInfo() {
    return {
      theme: this.theme || 'default',
      config: this.config,
      parent: this.parentService.name,
      hostData: this.hostData
    };
  }
}

const parentInjector = createInjector([
  { provide: ParentService, useClass: ParentService },
  { provide: 'HOST_DATA', useValue: { host: true } }
]);

const childInjector = createInjector([
  { provide: CONFIG_TOKEN, useValue: { child: true } },
  { provide: ChildService, useClass: ChildService }
], parentInjector);

const childService = childInjector.get(ChildService);
console.log(childService.getInfo());
```

## 🔄 生命周期管理

### 如何实现资源清理？

通过实现 OnDestroy 接口可以在注入器销毁时清理资源！

```typescript
import { Injectable, OnDestroy, createInjector } from '@sker/di';

@Injectable({ providedIn: null })
class ResourceService implements OnDestroy {
  private timer: NodeJS.Timeout | null = null;
  private connections: Set<any> = new Set();
  
  constructor() {
    this.timer = setInterval(() => {
      console.log('Resource service heartbeat');
    }, 1000);
  }
  
  addConnection(conn: any) {
    this.connections.add(conn);
  }
  
  onDestroy() {
    console.log('清理 ResourceService 资源');
    
    // 清理定时器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // 清理连接
    this.connections.forEach(conn => {
      if (conn.close) conn.close();
    });
    this.connections.clear();
  }
}

const injector = createInjector([
  { provide: ResourceService, useClass: ResourceService }
]);

const service = injector.get(ResourceService);
service.addConnection({ close: () => console.log('连接已关闭') });

// 销毁注入器时会自动调用所有服务的 onDestroy
injector.destroy();
```

## 🚀 性能优化

### 如何监控性能？

启用性能跟踪来监控注入器的性能表现！

```typescript
import { enableDevMode, createInjector, Injectable, getDebugger } from '@sker/di';

// 启用性能跟踪
enableDevMode({
  enablePerformanceTracking: true,
  logToConsole: false
});

@Injectable({ providedIn: 'root' })
class ServiceA {
  process() { return 'A'; }
}

@Injectable({ providedIn: 'root' })
class ServiceB {
  constructor(private serviceA: ServiceA) {}
  process() { return `B-${this.serviceA.process()}`; }
}

const injector = createInjector([]);

// 进行一些操作
for (let i = 0; i < 1000; i++) {
  injector.get(ServiceA);
  injector.get(ServiceB);
}

// 检查性能指标
const debugger = getDebugger();
const metrics = debugger.getPerformanceMetrics();

console.log('性能指标:');
console.log('- 解析次数:', metrics.resolutionCount);
console.log('- 平均解析时间:', metrics.averageResolutionTime.toFixed(2), 'ms');
console.log('- 缓存命中率:', (metrics.cacheHitRate * 100).toFixed(1), '%');
console.log('- 总解析时间:', metrics.totalResolutionTime.toFixed(2), 'ms');
```

## 💡 最佳实践

### 如何组织大型应用的依赖注入？

推荐使用分层注入器架构来组织复杂应用！

```typescript
import { 
  createRootInjector, 
  createPlatformInjector, 
  createApplicationInjector,
  createFeatureInjector,
  Injectable 
} from '@sker/di';

// 1. 基础层服务 (Root)
@Injectable({ providedIn: 'root' })
class LoggerService {
  log(message: string) { console.log(`[LOG] ${message}`); }
}

// 2. 平台层服务 (Platform)  
@Injectable({ providedIn: 'platform' })
class PlatformConfigService {
  getVersion() { return '1.0.0'; }
}

// 3. 应用层服务 (Application)
@Injectable({ providedIn: 'application' })
class AppConfigService {
  getAppName() { return 'MyApp'; }
}

// 4. 功能模块服务 (Feature)
@Injectable({ providedIn: 'feature' })
class UserFeatureService {
  constructor(private logger: LoggerService) {}
  
  getUserData() {
    this.logger.log('获取用户数据');
    return { id: 1, name: 'User' };
  }
}

// 创建分层架构
async function setupApplication() {
  // 创建基础层
  const rootInjector = createRootInjector([
    { provide: 'ROOT_CONFIG', useValue: { debug: true } }
  ]);
  
  // 创建平台层
  const platformInjector = createPlatformInjector([
    { provide: 'PLATFORM_CONFIG', useValue: { env: 'production' } }
  ]);
  
  // 创建应用层
  const appInjector = createApplicationInjector([
    { provide: 'APP_CONFIG', useValue: { theme: 'dark' } }
  ]);
  
  // 创建功能模块层
  const userFeatureInjector = createFeatureInjector([
    { provide: 'USER_CONFIG', useValue: { pageSize: 10 } }
  ], appInjector);
  
  // 使用服务
  const userService = userFeatureInjector.get(UserFeatureService);
  const userData = userService.getUserData();
  
  console.log('用户数据:', userData);
}

setupApplication();
```

### 如何进行依赖注入的单元测试？

SKER-DI 提供了完善的测试支持，包括模拟注入器和服务替换！

```typescript
import { createInjector, Injectable, resetRootInjector } from '@sker/di';

@Injectable({ providedIn: 'root' })
class DatabaseService {
  async getData() {
    // 模拟数据库查询
    return ['data1', 'data2'];
  }
}

@Injectable({ providedIn: 'root' })
class UserService {
  constructor(private db: DatabaseService) {}
  
  async getUsers() {
    const data = await this.db.getData();
    return data.map(item => ({ name: item }));
  }
}

// 测试用例
describe('UserService', () => {
  let userService: UserService;
  let mockDbService: jasmine.SpyObj<DatabaseService>;
  
  beforeEach(() => {
    // 重置根注入器（测试隔离）
    resetRootInjector();
    
    // 创建模拟服务
    mockDbService = jasmine.createSpyObj('DatabaseService', ['getData']);
    mockDbService.getData.and.returnValue(Promise.resolve(['mockData']));
    
    // 创建测试注入器
    const testInjector = createInjector([
      { provide: DatabaseService, useValue: mockDbService },
      { provide: UserService, useClass: UserService }
    ]);
    
    userService = testInjector.get(UserService);
  });
  
  it('应该返回用户数据', async () => {
    const users = await userService.getUsers();
    
    expect(mockDbService.getData).toHaveBeenCalled();
    expect(users).toEqual([{ name: 'mockData' }]);
  });
});
```

## ⚡ 错误处理和调试

### 如何处理常见的注入错误？

SKER-DI 提供了详细的错误信息来帮助调试依赖注入问题！

```typescript
import { createInjector, Injectable, Inject, Optional } from '@sker/di';

@Injectable({ providedIn: null })
class MissingService {
  getData() { return 'data'; }
}

@Injectable({ providedIn: null })
class TestService {
  constructor(
    // 错误：没有注册 MissingService
    // private missingService: MissingService, // 会抛出 No provider for MissingService
    
    // 正确：使用 Optional 装饰器
    @Optional() private optionalService?: MissingService
  ) {}
  
  process() {
    if (this.optionalService) {
      return this.optionalService.getData();
    }
    return 'fallback data';
  }
}

const injector = createInjector([
  { provide: TestService, useClass: TestService }
  // 注意：没有提供 MissingService
]);

try {
  const testService = injector.get(TestService);
  console.log(testService.process()); // fallback data
} catch (error: any) {
  console.error('注入错误:', error.message);
}
```

### 如何调试循环依赖问题？

启用循环依赖检测来自动发现和报告循环依赖！

```typescript
import { enableDevMode, createInjector, Injectable, Inject, forwardRef } from '@sker/di';

// 启用循环依赖检测
enableDevMode({
  enableCircularDependencyDetection: true,
  logToConsole: true
});

// 错误的循环依赖
@Injectable({ providedIn: null })
class CircularA {
  constructor(private serviceB: CircularB) {} // 会检测到循环依赖
}

@Injectable({ providedIn: null })
class CircularB {
  constructor(private serviceA: CircularA) {} // 会检测到循环依赖
}

// 正确的解决方案
@Injectable({ providedIn: null })
class FixedA {
  constructor(@Inject(forwardRef(() => FixedB)) private serviceB: FixedB) {}
}

@Injectable({ providedIn: null })
class FixedB {
  constructor(@Inject(forwardRef(() => FixedA)) private serviceA: FixedA) {}
}

try {
  const badInjector = createInjector([
    { provide: CircularA, useClass: CircularA },
    { provide: CircularB, useClass: CircularB }
  ]);
  
  badInjector.get(CircularA); // 会检测到循环依赖并报告
} catch (error: any) {
  console.error('循环依赖错误:', error.message);
}

// 使用修复版本
const goodInjector = createInjector([
  { provide: FixedA, useClass: FixedA },
  { provide: FixedB, useClass: FixedB }
]);

const fixedA = goodInjector.get(FixedA); // 正常工作
console.log('循环依赖已解决');
```

---

🎉 **恭喜！** 您已经掌握了 SKER-DI 的核心功能和最佳实践。这个强大的依赖注入框架将帮助您构建更加模块化、可维护的 TypeScript 应用程序！
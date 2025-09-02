# @sker/di

一个现代化的 TypeScript 依赖注入（DI）系统，借鉴 Angular DI 的核心设计理念，为通用场景提供类型安全的依赖注入解决方案。

## 特性

### ✨ 核心特性
- 🔒 **类型安全** - 完整的 TypeScript 类型支持，编译期错误检查
- 🏗️ **层次化注入器** - 支持父子关系的注入器结构
- 🎯 **灵活的令牌系统** - 支持类构造函数、InjectionToken、字符串和符号令牌
- ⚙️ **多种提供者** - ValueProvider、ClassProvider、FactoryProvider 等
- 🔧 **注入选项控制** - optional、skipSelf、self、host 等选项
- 🎨 **装饰器支持** - @Injectable、@Inject 装饰器

### 🚀 高级特性
- 🔄 **循环依赖检测** - 自动检测和报告循环依赖
- 💾 **实例缓存** - 单例模式的实例缓存机制
- ⏱️ **延迟初始化** - LazyClassProvider、LazyFactoryProvider
- 🔍 **调试支持** - 开发模式下的完整调试信息
- 📊 **性能监控** - 注入器性能指标和健康检查
- 🔗 **forwardRef** - 解决循环引用问题

## 安装

```bash
npm install @sker/di
# 或
yarn add @sker/di
# 或
pnpm add @sker/di
```

## 快速开始

### 基本使用

```typescript
import { Injectable, EnvironmentInjector, Inject } from '@sker/di';

// 定义可注入的服务
@Injectable()
class UserService {
  getUser() {
    return { name: 'John', age: 30 };
  }
}

@Injectable()
class ApiService {
  constructor(private userService: UserService) {}
  
  async fetchUser() {
    return this.userService.getUser();
  }
}

// 创建注入器
const injector = new EnvironmentInjector([
  UserService,
  ApiService
]);

// 获取服务实例
const apiService = injector.get(ApiService);
console.log(apiService.fetchUser());
```

### 使用 InjectionToken

```typescript
import { InjectionToken, Injectable } from '@sker/di';

// 定义令牌
const API_URL = new InjectionToken<string>('API_URL');
const CONFIG = new InjectionToken<{ timeout: number }>('CONFIG');

@Injectable()
class HttpService {
  constructor(
    @Inject(API_URL) private apiUrl: string,
    @Inject(CONFIG) private config: { timeout: number }
  ) {}
}

const injector = new EnvironmentInjector([
  { provide: API_URL, useValue: 'https://api.example.com' },
  { provide: CONFIG, useValue: { timeout: 5000 } },
  HttpService
]);
```

### 工厂提供者

```typescript
import { Injectable, InjectionToken } from '@sker/di';

const DATABASE_CONFIG = new InjectionToken<any>('DATABASE_CONFIG');

@Injectable()
class DatabaseService {
  constructor(private config: any) {}
}

const injector = new EnvironmentInjector([
  { 
    provide: DATABASE_CONFIG, 
    useValue: { host: 'localhost', port: 5432 } 
  },
  {
    provide: DatabaseService,
    useFactory: (config) => new DatabaseService(config),
    deps: [DATABASE_CONFIG]
  }
]);
```

## API 文档

### 核心类

#### EnvironmentInjector
主要的注入器实现，支持层次化结构和提供者注册。

#### InjectionToken<T>
类型安全的注入令牌，用于非类类型的依赖注入。

#### Provider
提供者接口，支持多种提供方式：
- `ValueProvider` - 直接提供值
- `ClassProvider` - 提供类实例  
- `FactoryProvider` - 通过工厂函数创建
- `ExistingProvider` - 别名提供者

### 装饰器

#### @Injectable(options?)
标记类为可注入服务。

```typescript
@Injectable({ providedIn: 'root' })
class GlobalService {}
```

#### @Inject(token)
指定参数的注入令牌。

```typescript
constructor(@Inject(TOKEN) value: string) {}
```

### 注入选项

```typescript
injector.get(Token, { optional: true });    // 可选注入
injector.get(Token, { skipSelf: true });    // 跳过当前注入器
injector.get(Token, { self: true });        // 仅当前注入器
```

## 开发和调试

### 启用调试模式

```typescript
import { enableDevMode, getDebugger } from '@sker/di';

// 启用开发模式
enableDevMode({
  level: 'verbose',
  trackMetrics: true,
  logInjections: true
});

// 获取调试器
const debugger = getDebugger();
debugger.printHierarchy(injector);
```

### 性能监控

```typescript
import { getInspector } from '@sker/di';

const inspector = getInspector();

// 健康检查
const health = inspector.healthCheck(injector);

// 生成报告
const report = inspector.generateReport(injector);
console.log(report);
```

## 测试

```bash
# 运行测试
npm test

# 监控模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

## 构建

```bash
npm run build
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

ISC License

## 作者

imeepos
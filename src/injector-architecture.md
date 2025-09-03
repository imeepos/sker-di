# 注入器架构设计

## 🏗️ 严格的单例层次结构

```
Root Injector (scope: 'root') [全局单例]
└── Platform Injector (scope: 'platform') [全局单例]
    ├── Application Injector 1 (scope: 'application') [多实例]
    │   ├── Feature Injector 1A (scope: 'feature') [多实例]
    │   └── Feature Injector 1B (scope: 'feature') [多实例]
    └── Application Injector 2 (scope: 'application') [多实例]
        └── Feature Injector 2A (scope: 'feature') [多实例]
```

### 🔒 单例约束
- **Root Injector**: 全局唯一，系统基础
- **Platform Injector**: 全局唯一，跨应用共享
- **Application Injector**: 多实例，每个应用独立
- **Feature Injector**: 多实例，每个功能模块独立

## 🎯 作用域职责

### Platform Injector (`providedIn: 'platform'`)
- **职责**: 跨应用共享的基础设施服务
- **生命周期**: 整个平台运行期间
- **单例范围**: 所有应用共享同一实例
- **典型服务**: 日志、配置、缓存、监控

```typescript
@Injectable({ providedIn: 'platform' })
class PlatformLoggerService {
  // 所有应用共享的日志服务
}
```

### Application Injector (`providedIn: 'application'`)
- **职责**: 单个应用内的业务服务
- **生命周期**: 应用运行期间
- **单例范围**: 单个应用内共享
- **典型服务**: 用户认证、应用配置、业务逻辑

```typescript
@Injectable({ providedIn: 'application' })
class UserAuthService {
  // 单个应用的用户认证服务
}
```

### Root Injector (`providedIn: 'root'`)
- **职责**: 通用工具和基础服务
- **生命周期**: 根注入器运行期间
- **单例范围**: 根注入器内共享
- **典型服务**: HTTP客户端、工具类、通用服务

```typescript
@Injectable({ providedIn: 'root' })
class HttpClient {
  // 通用的HTTP客户端
}
```

### Feature Injector (`providedIn: 'feature'`)
- **职责**: 功能模块特定的服务
- **生命周期**: 功能模块运行期间
- **单例范围**: 单个功能模块内共享
- **典型服务**: 购物车、订单管理、用户设置

```typescript
@Injectable({ providedIn: 'feature' })
class ShoppingCartService {
  // 购物车功能模块的服务
}
```

## 🔍 解析规则

### 核心原则
每个注入器**只自动解析自己作用域**的服务，其他服务通过**层次结构继承**获取。

```typescript
// 每个注入器只解析自己作用域的服务
private shouldAutoResolve(providedIn: InjectorScope | null | undefined): boolean {
  return this.scope === providedIn;
}
```

### 解析流程
1. **自身解析**: 检查当前注入器是否能解析该作用域
2. **向上查找**: 如果不能解析，向父注入器查找
3. **递归继承**: 父注入器重复相同流程
4. **失败处理**: 如果整个链都无法解析，抛出错误

## 📋 使用示例

### 创建完整层次结构（严格顺序 + 自动父级）

```typescript
import {
  createRootInjector,
  createPlatformInjector,
  createApplicationInjector,
  createFeatureInjector
} from '@sker/di';

// ✅ 正确的创建顺序（简化的API）

// 1. 首先创建根注入器（全局单例）
const rootInjector = createRootInjector([
  { provide: 'ROOT_CONFIG', useValue: { debug: true } }
]);

// 2. 创建平台注入器（全局单例，自动使用根注入器作为父级）
const platformInjector = createPlatformInjector([
  { provide: 'PLATFORM_CONFIG', useValue: { version: '1.0.0' } }
]);

// 3. 创建应用注入器（多实例，自动使用全局平台注入器作为父级）
const webApp = createApplicationInjector([
  { provide: 'APP_TYPE', useValue: 'web' }
]);

const mobileApp = createApplicationInjector([
  { provide: 'APP_TYPE', useValue: 'mobile' }
]);

// 4. 创建功能注入器（多实例，必须指定应用注入器作为父级）
const userFeature = createFeatureInjector([
  { provide: 'FEATURE_NAME', useValue: 'user-management' }
], webApp);

const orderFeature = createFeatureInjector([
  { provide: 'FEATURE_NAME', useValue: 'order-management' }
], mobileApp);
```

### ❌ 错误的使用方式

```typescript
// ❌ 错误：没有先创建根注入器
const platformInjector = createPlatformInjector();
// Error: Root injector not found!

// ❌ 错误：重复创建根注入器
createRootInjector();
createRootInjector();
// Error: Root injector already exists!

// ❌ 错误：重复创建平台注入器
createRootInjector();
createPlatformInjector();
createPlatformInjector();
// Error: Platform injector already exists!

// ❌ 错误：没有平台注入器就创建应用注入器
createRootInjector();
// 没有创建平台注入器
const appInjector = createApplicationInjector();
// Error: Platform injector not found!
```

### 服务获取示例

```typescript
// 从功能注入器获取所有层级的服务
const platformService = featureInjector.get(PlatformLoggerService);  // 从曾祖父级
const appService = featureInjector.get(UserAuthService);             // 从祖父级
const rootService = featureInjector.get(HttpClient);                 // 从父级
const featureService = featureInjector.get(ShoppingCartService);     // 从自身

// 验证单例性
const logger1 = featureInjector.get(PlatformLoggerService);
const logger2 = appInjector.get(PlatformLoggerService);
console.log(logger1 === logger2); // true - 平台服务在所有子注入器中共享
```

## ✅ 设计优势

### 1. **职责清晰**
- 每个注入器只负责自己作用域的服务
- 避免了作用域混乱和语义不清

### 2. **层次继承**
- 通过自然的父子关系实现服务继承
- 符合直觉的查找顺序

### 3. **灵活组合**
- 可以根据需要组合不同的注入器层次
- 支持复杂的应用架构

### 4. **性能优化**
- 服务在合适的层级实例化
- 避免不必要的重复创建

### 5. **易于测试**
- 每个层级可以独立测试
- 清晰的依赖关系

## 🔒 严格的层次结构控制

### 强制的创建顺序
系统强制执行正确的注入器创建顺序，防止架构混乱：

```typescript
// ✅ 必须的创建顺序
1. createRootInjector()     // 全局单例，必须首先创建
2. createPlatformInjector() // 自动使用全局根注入器作为父级
3. createApplicationInjector([], platformInjector) // 必须指定平台注入器
4. createFeatureInjector([], appInjector)         // 必须指定应用注入器
```

### 自动父级绑定
- **根注入器**: 全局单例，以 NullInjector 为父级
- **平台注入器**: 自动使用全局根注入器作为父级
- **应用注入器**: 必须明确指定平台注入器作为父级
- **功能注入器**: 必须明确指定应用注入器作为父级

### 类型安全保证
TypeScript 类型系统确保正确的父子关系：

```typescript
// ✅ 类型安全的调用
const platformInjector: EnvironmentInjector = createPlatformInjector();
const appInjector = createApplicationInjector([], platformInjector);

// ❌ TypeScript 会阻止错误的类型
const rootInjector = createRootInjector();
// const appInjector = createApplicationInjector([], rootInjector); // 类型错误
```

## 🚨 注意事项

### 1. **严格的创建顺序**
必须按照 Root → Platform → Application → Feature 的顺序创建：

```typescript
// ❌ 错误：跳过根注入器
createPlatformInjector(); // Error: Root injector not found!

// ✅ 正确：先创建根注入器
createRootInjector();
createPlatformInjector(); // 正常工作
```

### 2. **全局根注入器单例**
根注入器是全局单例，不能重复创建：

```typescript
createRootInjector(); // ✅ 第一次创建
createRootInjector(); // ❌ Error: Root injector already exists!

// 测试时需要重置
resetRootInjector(); // 仅用于测试
createRootInjector(); // ✅ 重置后可以重新创建
```

### 3. **作用域匹配**
确保服务的 `providedIn` 与期望的注入器作用域匹配：

```typescript
@Injectable({ providedIn: 'platform' })
class PlatformService {}

// ✅ 在平台注入器中自动解析
const platformInjector = createPlatformInjector();
const service = platformInjector.get(PlatformService);

// ✅ 在子注入器中从父级继承
const appInjector = createApplicationInjector([], platformInjector);
const service2 = appInjector.get(PlatformService); // 从父级获取
```

### 4. **避免循环依赖**
避免跨层级的循环依赖：

```typescript
// ❌ 避免这种情况
@Injectable({ providedIn: 'platform' })
class PlatformService {
  constructor(private appService: ApplicationService) {} // 不好的设计
}
```

这种严格的架构设计确保了：
- **清晰的职责分离** - 每个层级有明确的职责
- **可预测的行为** - 强制的创建顺序避免混乱
- **类型安全** - TypeScript 编译期检查
- **运行时保护** - 运行时错误检查和提示

# 注入器架构设计：一切皆服务，一切皆可注入

🚀 **核心理念**：完全消除静态单例模式，所有系统组件都通过依赖注入进行管理。

## 🏗️ 服务化的层次结构架构

```
Root Injector (scope: 'root') [全局单例] 
├── 🚀 InjectorRegistry (管理注入器生命周期)
├── 🚀 PlatformManager (管理平台实例)  
├── 🚀 DIDebugger (调试服务)
└── 🚀 DIInspector (检查服务)
    └── Platform Injector (scope: 'platform') [全局单例]
        ├── 🚀 ApplicationManager (管理应用生命周期)
        ├── Application Injector 1 (scope: 'application') [多实例]
        │   ├── Feature Injector 1A (scope: 'feature') [多实例]
        │   └── Feature Injector 1B (scope: 'feature') [多实例]
        └── Application Injector 2 (scope: 'application') [多实例]
            └── Feature Injector 2A (scope: 'feature') [多实例]
```

### 🚀 服务化管理组件
- **InjectorRegistry**: 注入器注册表服务，取代静态单例管理
- **PlatformManager**: 平台管理器服务，取代全局静态变量
- **ApplicationManager**: 应用管理器服务，管理多应用实例
- **DIDebugger**: 调试器服务，提供运行时调试功能  
- **DIInspector**: 检查器服务，提供性能监控和健康检查

### 🔒 层次约束（现在由服务管理）
- **Root Injector**: 提供基础DI服务，系统核心
- **Platform Injector**: 跨应用共享，由 InjectorRegistry 管理
- **Application Injector**: 每个应用独立，由 ApplicationManager 管理
- **Feature Injector**: 每个功能模块独立，由应用自身管理

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

### 🚀 服务化架构使用示例（推荐方式）

```typescript
import {
  createInjector,
  Injectable,
  INJECTOR_REGISTRY,
  PLATFORM_MANAGER,
  APPLICATION_MANAGER
} from '@sker/di';

// ✅ 服务化架构：通过DI服务管理所有组件

// 1. 创建根注入器（提供基础DI服务）
const rootInjector = createInjector([
  { provide: 'ROOT_CONFIG', useValue: { debug: true } }
]);

// 2. 🚀 获取注入器注册表服务 - 一切皆服务！
const injectorRegistry = rootInjector.get(INJECTOR_REGISTRY);

// 3. 🚀 通过服务管理注入器生命周期 - 消除静态管理！
const platformInjector = injectorRegistry.createPlatformInjector([
  { provide: 'PLATFORM_CONFIG', useValue: { version: '1.0.0' } }
]);

// 4. 🚀 获取平台管理器服务 - 一切皆可注入！
const platformManager = platformInjector.get(PLATFORM_MANAGER);

// 5. 🚀 获取应用管理器服务 - 完全服务化！
const appManager = platformInjector.get(APPLICATION_MANAGER);

// 6. 🚀 通过服务创建应用 - 不再是静态函数调用！
const webApp = await appManager.createApplication('web-app', [
  { provide: 'APP_TYPE', useValue: 'web' }
]);

const mobileApp = await appManager.createApplication('mobile-app', [
  { provide: 'APP_TYPE', useValue: 'mobile' }
]);

// 7. 🚀 通过应用加载功能 - 功能也是服务！
await webApp.loadFeature({
  name: 'user-management',
  providers: [
    { provide: 'FEATURE_NAME', useValue: 'user-management' }
  ]
});

await mobileApp.loadFeature({
  name: 'order-management', 
  providers: [
    { provide: 'FEATURE_NAME', useValue: 'order-management' }
  ]
});
```

### ❌ 传统方式（已完全移除）

```typescript
// ❌ 这些API已经被完全移除！不能再使用！
// import {
//   createRootInjector,          // ❌ 不存在
//   createPlatformInjector,      // ❌ 不存在
//   createApplicationInjector,   // ❌ 不存在
//   createFeatureInjector        // ❌ 不存在
// } from '@sker/di';

// ❌ 以下代码无法运行，因为函数已被移除
// const rootInjector = createRootInjector([...]);     // ❌ 函数不存在
// const platformInjector = createPlatformInjector([...]); // ❌ 函数不存在
// const webApp = createApplicationInjector([...]);    // ❌ 函数不存在
// const userFeature = createFeatureInjector([...], webApp); // ❌ 函数不存在

// ✅ 必须使用服务化方式！参见上面的推荐示例
```

### ❌ 错误的使用方式

```typescript
// ❌ 错误：试图通过静态方式管理（已移除的反模式）
// 这些全局函数已被移除，请使用服务化方式
// const rootInjector = getRootInjector(); // ❌ 不存在
// const platformInjector = getPlatformInjector(); // ❌ 不存在

// ❌ 错误：试图使用已移除的API
// const platformInjector = createPlatformInjector(); // ❌ 函数不存在
// Error: createPlatformInjector is not a function

// ❌ 错误：不使用服务管理器直接创建重复注入器
const injectorRegistry1 = new InjectorRegistry(); // ❌ 应该通过DI获取
const injectorRegistry2 = new InjectorRegistry(); // ❌ 违反了服务单例原则

// ✅ 正确：通过DI获取服务
const rootInjector = createInjector([]);
const injectorRegistry = rootInjector.get(INJECTOR_REGISTRY); // ✅ 单例服务
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

## ✅ 服务化架构优势

### 🚀 1. **一切皆服务原则**
- 所有系统组件都实现为可注入服务
- 消除静态单例模式和全局变量
- 通过依赖注入实现松耦合

### 🔗 2. **一切皆可注入原则**
- 任何组件都可以通过DI获取依赖
- 完整的依赖注入体系覆盖所有层级
- 支持任意深度的服务嵌套注入

### 3. **职责清晰**
- 每个服务有明确的职责边界
- 通过服务接口定义契约
- 避免了作用域混乱和语义不清

### 4. **层次继承**
- 通过自然的父子关系实现服务继承
- 符合直觉的查找顺序
- 服务管理器控制生命周期

### 5. **灵活组合**
- 可以根据需要组合不同的服务层次
- 支持复杂的企业级应用架构
- 动态服务发现和注册

### 6. **性能优化**
- 服务在合适的层级实例化并缓存
- 避免不必要的重复创建
- 延迟加载和智能销毁机制

### 7. **易于测试**
- 每个服务可以独立测试
- 清晰的依赖关系便于Mock
- 完整的测试覆盖率支持

### 8. **类型安全**
- 完整的TypeScript类型推断
- 编译期依赖关系检查
- 运行时类型验证

## 🔒 严格的层次结构控制

### 服务化架构的管理顺序
通过DI服务管理注入器生命周期，确保正确的层次结构：

```typescript
// ✅ 服务化管理顺序
1. createInjector([])                               // 根注入器（提供DI服务）
2. rootInjector.get(INJECTOR_REGISTRY)              // 获取注入器注册表服务
3. injectorRegistry.createPlatformInjector([])      // 通过服务创建平台注入器
4. injectorRegistry.createApplicationInjector([])   // 通过服务创建应用注入器
```

### 服务化的父级管理
- **根注入器**: 以 NullInjector 为父级，提供基础DI服务
- **平台注入器**: 由 InjectorRegistry 服务管理，自动使用根注入器作为父级
- **应用注入器**: 由 InjectorRegistry 服务管理，自动使用平台注入器作为父级
- **功能注入器**: 由 ApplicationManager 服务管理，通过应用的 loadFeature 方法创建

### 类型安全保证
TypeScript 类型系统和服务化架构确保正确的依赖关系：

```typescript
// ✅ 类型安全的服务化调用
const rootInjector = createInjector([]);
const injectorRegistry: IInjectorRegistry = rootInjector.get(INJECTOR_REGISTRY);
const platformInjector: EnvironmentInjector = injectorRegistry.createPlatformInjector();
const appInjector: EnvironmentInjector = injectorRegistry.createApplicationInjector();

// ✅ TypeScript 类型推断和服务接口保证正确性
const appManager: ApplicationManager = rootInjector.get(APPLICATION_MANAGER);
```

## 🚨 注意事项

### 1. **服务化管理顺序**
通过服务管理注入器创建，确保正确的依赖关系：

```typescript
// ❌ 错误：试图使用已移除的函数
// createPlatformInjector(); // ❌ Error: createPlatformInjector is not a function

// ✅ 正确：使用服务化方式
const rootInjector = createInjector([]);              // 1. 创建根注入器
const injectorRegistry = rootInjector.get(INJECTOR_REGISTRY); // 2. 获取服务
const platformInjector = injectorRegistry.createPlatformInjector(); // 3. 通过服务创建
```

### 2. **服务化架构的隔离性**
每个注入器实例都是独立的，通过服务管理生命周期：

```typescript
// ✅ 每次调用 createInjector 都创建新的独立实例
const injector1 = createInjector([]);  // 独立的根注入器
const injector2 = createInjector([]);  // 另一个独立的根注入器

// ✅ 每个注入器都有自己的服务实例
const registry1 = injector1.get(INJECTOR_REGISTRY);
const registry2 = injector2.get(INJECTOR_REGISTRY); // 不同的实例

// ✅ 测试中自然隔离，无需重置
const testInjector = createInjector([...]); // 测试专用注入器
```

### 3. **作用域匹配**
确保服务的 `providedIn` 与期望的注入器作用域匹配：

```typescript
@Injectable({ providedIn: 'platform' })
class PlatformService {}

// ✅ 在平台注入器中自动解析
const rootInjector = createInjector([]);
const injectorRegistry = rootInjector.get(INJECTOR_REGISTRY);
const platformInjector = injectorRegistry.createPlatformInjector();
const service = platformInjector.get(PlatformService);

// ✅ 在子注入器中从父级继承
const appInjector = injectorRegistry.createApplicationInjector();
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

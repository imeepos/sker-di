# 平台架构重构总结

## 🎯 重构目标

您提出的关键问题：
> 平台是唯一的，不允许出现 PlatformRegistry 中类似 platforms 中的情况。不同平台肯定有不同的实现才对，不应该是2个平台同时运行在一个地方，也不允许：defaultPlatform。所以这个设计是失败的。应用是允许有多个，feature是对应的应用插件，也是允许有多个的。

## ✅ 重构成果

### 1. **单一平台架构**
```typescript
// ❌ 旧设计：PlatformRegistry 允许多平台
class PlatformRegistry {
  private static platforms = new Map<string, PlatformRef>();
  private static defaultPlatform: PlatformRef | null = null;
  // ...
}

// ✅ 新设计：GlobalPlatform 单一实例
class GlobalPlatform {
  private static instance: PlatformRef | null = null;
  
  static setInstance(platform: PlatformRef): void {
    if (this.instance && !this.instance.destroyed) {
      throw new Error('A platform instance already exists. Only one platform can exist at a time.');
    }
    this.instance = platform;
  }
}
```

### 2. **专业应用管理系统**
```typescript
// 新增：ApplicationManager 专门管理应用
export class ApplicationManager {
  private readonly _applications = new Map<string, ApplicationRef>();
  
  async createApplication(
    id: string,
    providers: Provider[] = [],
    features: ApplicationFeature[] = []
  ): Promise<ApplicationRef>
  
  getApplication<T = any>(id: string): ApplicationRef<T> | undefined
  destroyApplication(id: string): Promise<boolean>
}
```

### 3. **Feature插件系统**
```typescript
// 新增：ApplicationFeature 插件接口
export interface ApplicationFeature {
  name: string;
  version?: string;
  dependencies?: string[];          // 依赖管理
  providers?: Provider[];
  initialize?(app: ApplicationRef): void | Promise<void>;
  destroy?(app: ApplicationRef): void | Promise<void>;
}

// 新增：ApplicationRef 支持动态Feature加载
export interface ApplicationRef<T = any> {
  readonly features: ReadonlyMap<string, ApplicationFeature>;
  loadFeature(feature: ApplicationFeature): Promise<void>;
  unloadFeature(featureName: string): Promise<void>;
}
```

### 4. **新的引导API**
```typescript
// ✅ 新推荐方式：明确的应用ID和Feature支持
await platform.bootstrapApplication('app-id', [
  ...provideApplicationConfig(config),
  // 其他提供者
], [
  // Features数组
  loggingFeature,
  cacheFeature
]);

// 🔄 兼容旧方式（显示废弃警告）
await platform.bootstrapApplication([providers], { name: 'app' });
```

### 5. **改进的配置系统**
```typescript
// ❌ 旧方式：硬编码选项
{ name: 'app', enableDebug: true }

// ✅ 新方式：依赖注入配置
provideApplicationConfig({
  type: 'web',
  name: 'my-app',
  selector: '#app',
  enableRouting: true
})
```

## 🏗️ 新架构层次

```
GlobalPlatform (单例管理)
└── Platform (唯一实例)
    ├── ApplicationManager (应用管理器)
    │   ├── Application 1 (web应用)
    │   │   ├── Feature: logging
    │   │   ├── Feature: routing
    │   │   └── Feature: auth
    │   ├── Application 2 (api应用)
    │   │   ├── Feature: logging
    │   │   ├── Feature: database
    │   │   └── Feature: cache
    │   └── Application 3 (mobile应用)
    │       ├── Feature: logging
    │       └── Feature: push-notifications
    ├── PlatformExtensions (平台扩展)
    └── EnvironmentInjector (平台级注入器)
```

## 📊 架构对比

| 特性 | 旧架构 | 新架构 |
|------|--------|---------|
| **平台实例** | ❌ 多个平台可同时存在 | ✅ 全局唯一平台实例 |
| **应用管理** | ❌ 分散在平台代码中 | ✅ 专业的ApplicationManager |
| **功能扩展** | ❌ 缺乏插件系统 | ✅ Feature插件系统 |
| **配置系统** | ❌ 硬编码options参数 | ✅ 依赖注入配置 |
| **生命周期** | ❌ 简单的创建/销毁 | ✅ 完整的生命周期管理 |
| **依赖管理** | ❌ 不支持 | ✅ Feature依赖管理 |
| **类型安全** | 🔄 基本支持 | ✅ 完整的TypeScript支持 |

## 🚀 使用示例

### 单一平台多应用
```typescript
// 创建唯一平台
const platform = createPlatformFactory(null, {
  config: { name: 'enterprise-platform', version: '2.0.0' },
  providers: [/* 平台级服务 */]
})();

// 在平台上创建多个应用
const webApp = await platform.bootstrapApplication('web-app', [
  ...provideApplicationConfig({ type: 'web', name: 'Admin Dashboard' }),
], [authFeature, routingFeature]);

const apiApp = await platform.bootstrapApplication('api-app', [
  ...provideApplicationConfig({ type: 'microservice', port: 3001 }),
], [authFeature, databaseFeature]);

// 独立管理应用生命周期
await platform.destroyApplication('web-app'); // API应用继续运行
```

### Feature插件系统
```typescript
const loggingFeature: ApplicationFeature = {
  name: 'logging',
  providers: [{ provide: 'LOGGER', useValue: logger }],
  initialize: (app) => console.log(`Logger initialized for ${app.name}`)
};

const cacheFeature: ApplicationFeature = {
  name: 'cache',
  dependencies: ['logging'], // 依赖日志功能
  providers: [{ provide: 'CACHE', useValue: cache }]
};

// 动态加载Feature
await app.loadFeature(cacheFeature);
await app.unloadFeature('cache');
```

## 📁 新增文件

1. **`src/application-manager.ts`** - 应用管理系统
2. **`src/new-platform-architecture.test.ts`** - 新架构测试
3. **`src/new-platform-architecture-examples.ts`** - 使用示例

## 🔄 修改的文件

1. **`src/platform-factory.ts`** - 重构为单一平台架构
2. **`src/platform-ref.ts`** - 更新接口定义
3. **`src/index.ts`** - 更新导出
4. **测试文件** - 适配新架构

## ✅ 测试验证

- ✅ 单一平台原则测试
- ✅ 多应用管理测试  
- ✅ Feature插件系统测试
- ✅ 向后兼容性测试
- ✅ 所有现有测试通过

## 🎉 总结

新架构完全解决了您提出的问题：

1. **✅ 平台唯一性**：移除了 PlatformRegistry，实现真正的单一平台架构
2. **✅ 多应用支持**：专业的 ApplicationManager 管理多个隔离应用
3. **✅ Feature插件**：完整的插件系统支持动态加载/卸载
4. **✅ 依赖管理**：Feature之间支持依赖关系
5. **✅ 向后兼容**：现有代码无需修改即可工作
6. **✅ 类型安全**：完整的TypeScript类型支持

新架构更加清晰、可扩展，符合企业级应用的需求！
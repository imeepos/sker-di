你是一个专业的TypeScript/JavaScript开发专家。请基于Angular DI系统的核心设计理念，实现一个现代化的依赖注入框架。

## 核心架构要求

### 1. 分层注入器架构
- 实现抽象 `Injector` 基类，提供统一的注入接口
- 创建 `EnvironmentInjector` 作为环境级注入器
- 实现 `NullInjector` 作为注入链的终点，提供清晰的错误信息
- 支持注入器层次结构，实现 `parent` 链式查找机制

### 2. 高级令牌系统
- 实现泛型 `InjectionToken<T>` 类，支持类型安全的令牌定义
- 支持可选的工厂函数和 `providedIn` 配置
- 实现 `ProviderToken<T>` 联合类型，统一处理各种令牌类型
- 支持 `HostAttributeToken` 等特殊令牌类型

### 3. 完整的提供者系统
```typescript
interface Provider {
  provide: any;
  multi?: boolean;
}

interface ValueProvider extends Provider {
  useValue: any;
}

interface ClassProvider extends Provider {
  useClass: Type<any>;
  deps?: any[];
}

interface FactoryProvider extends Provider {
  useFactory: Function;
  deps?: any[];
}

interface ExistingProvider extends Provider {
  useExisting: any;
}
```

### 4. 注入选项和标志系统
- 实现 `InjectOptions` 接口：`{ optional?: boolean; skipSelf?: boolean; self?: boolean; host?: boolean }`
- 内部使用位标志 `InternalInjectFlags` 优化性能
- 支持装饰器标志 `DecoratorFlags` 用于元数据附加

### 5. 装饰器系统
- 实现 `@Injectable()` 装饰器，支持 `providedIn` 配置
- 实现参数装饰器：`@Inject()`, `@Optional()`, `@Self()`, `@SkipSelf()`, `@Host()`
- 使用元数据系统存储装饰器信息

### 6. 实例管理和缓存
- 实现 `Record` 系统缓存单例实例
- 支持循环依赖检测，使用特殊标记 `CIRCULAR`, `NOT_YET`
- 实现生命周期管理，支持 `ngOnDestroy` 钩子

### 7. 上下文管理
- 实现 `runInInjectionContext()` 函数
- 提供 `assertInInjectionContext()` 验证函数
- 支持当前注入器的上下文切换

### 8. 高级特性
- 实现 `forwardRef()` 解决循环引用
- 支持环境初始化器 `ENVIRONMENT_INITIALIZER`
- 实现提供者收集和验证机制
- 支持 JIT 和 AOT 编译模式

### 9. 错误处理和调试
- 提供详细的错误信息，包含令牌路径追踪
- 实现注入器分析和调试支持
- 支持开发模式下的额外验证

### 10. 性能优化
- 实现树摇优化支持
- 使用懒初始化策略
- 优化工厂函数缓存
- 支持编译时优化

## 实现指导原则

1. **类型安全优先**：充分利用TypeScript的类型系统
2. **模块化设计**：每个功能独立可测试
3. **性能考虑**：避免不必要的对象创建和查找
4. **错误友好**：提供清晰的错误信息和调试支持
5. **扩展性**：支持插件和自定义扩展
6. **兼容性**：考虑向后兼容和迁移路径

## 核心API设计

```typescript
// 核心注入函数
function inject<T>(token: ProviderToken<T>, options?: InjectOptions): T | null;

// 注入器创建
function createInjector(providers: Provider[], parent?: Injector): Injector;

// 环境提供者
function makeEnvironmentProviders(providers: Provider[]): EnvironmentProviders;

// 上下文执行
function runInInjectionContext<T>(injector: Injector, fn: () => T): T;
```

## 实现建议

1. 从简单的令牌系统开始
2. 逐步添加提供者类型支持
3. 实现基础的注入器功能
4. 添加装饰器和元数据支持
5. 完善错误处理和调试功能
6. 优化性能和内存使用
7. 添加高级特性和扩展点

请基于这些要求实现一个完整的依赖注入系统，确保代码质量、类型安全和性能优化。

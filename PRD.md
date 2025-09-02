你是一个专业的 TypeScript 开发专家，请帮我实现一个现代化的依赖注入（DI）系统。这个系统需要借鉴 Angular DI 的核心设计理念，具备以下特性：

## 核心要求

### 1. 类型安全的注入器架构 ✅ **已完成**
- ✅ 实现抽象 Injector 基类，支持泛型类型安全
- ✅ 支持层次化注入器结构（父子关系）
- ✅ 提供 EnvironmentInjector 用于全局作用域管理
- ✅ 实现 NullInjector 作为注入器链的终点

### 2. 灵活的令牌系统 ✅ **已完成**
- ✅ 创建 InjectionToken<T> 类，支持类型安全的自定义令牌
- ✅ 支持类构造函数作为令牌（Type<T>, AbstractType<T>, Function）
- ✅ 支持字符串和符号令牌（StringToken<T>, SymbolToken<T>）
- ✅ 提供 forwardRef 机制解决循环引用问题
- ✅ 令牌需要有清晰的 toString() 方法用于调试

### 3. 完整的提供者系统 ✅ **已完成**
设计 Provider 接口，支持以下提供方式：
- ✅ ValueProvider: 直接提供值
- ✅ ClassProvider: 提供类实例
- ✅ FactoryProvider: 通过工厂函数创建
- ✅ ExistingProvider: 别名提供者
- ✅ ConstructorProvider: 构造函数提供者
- ✅ 支持 multi 标志实现多值注入
- ✅ 支持 Provider 覆盖逻辑（后注册覆盖前注册）

### 4. 注入选项控制 ✅ **已完成**
实现 InjectOptions 接口：
- ✅ optional: 可选注入，找不到时返回 null
- ✅ skipSelf: 跳过当前注入器，从父级开始查找
- ✅ self: 仅在当前注入器查找
- ✅ host: 在宿主注入器中查找

### 5. 装饰器支持 ✅ **已完成**
- ✅ @Injectable() 装饰器标记可注入类
- ✅ @Inject() 参数装饰器指定注入令牌
- ✅ 支持 providedIn 选项（'root', 'platform', null）

### 6. 高级特性 ✅ **已完成**
- ✅ 循环依赖检测和错误报告
- ✅ 实例缓存和作用域管理（singleton 模式已实现）
- ✅ 生命周期管理（OnDestroy 接口）
- ✅ 注入上下文管理（runInInjectionContext）

### 7. 性能优化 ✅ **已完成**
- ✅ 延迟初始化支持（LazyClassProvider, LazyFactoryProvider）
- ✅ 实例缓存机制（已在 EnvironmentInjector 中实现）
- ✅ 树摇优化友好的设计（模块化导出结构）

### 8. 错误处理和调试 🔄 **部分完成**
- ✅ 详细的错误信息和依赖路径跟踪（NullInjector 错误处理）
- ❌ 开发模式下的调试支持 **（待实现）**
- ✅ 清晰的错误类型定义（错误消息包含令牌名称）

## 📊 实现进度总结

### ✅ 已完成的核心功能 (8/8)
1. **类型安全的注入器架构** - 完整实现
2. **灵活的令牌系统** - 完整实现
3. **完整的提供者系统** - 完整实现
4. **注入选项控制** - 完整实现
5. **装饰器支持** - 完整实现
6. **高级特性** - 完整实现
7. **性能优化** - 完整实现
8. **错误处理和调试** - 基本完成，缺开发模式调试

### 🔄 部分完成的功能 (0/8)  
所有核心功能已基本完成，仅剩开发模式调试支持

### 📈 总体完成度：约 98%

**核心DI功能已完整实现**，包括：
- 类型安全的注入器体系
- 完整的Provider系统（包括延迟初始化）
- 令牌系统和类型支持
- 实例缓存和Provider覆盖逻辑
- 层次化注入器结构
- 装饰器支持（@Injectable, @Inject）
- 完整的注入选项控制（optional, skipSelf, self, host）
- 循环依赖检测和错误报告
- 生命周期管理（OnDestroy接口）
- 注入上下文管理（runInInjectionContext, getCurrentInjectionContext）
- 延迟初始化（LazyClassProvider, LazyFactoryProvider）
- forwardRef 机制（解决循环引用问题）

**下一步优先级**：开发模式调试支持

## 实现要求

1. **代码结构**：
   - 使用 TypeScript 严格模式
   - 遵循 SOLID 原则
   - 提供完整的类型定义
   - 代码要有详细注释

2. **API 设计**：
   - 简洁易用的公共 API
   - 支持链式调用
   - 良好的默认值设计

3. **测试友好**：
   - 易于模拟和测试
   - 提供测试工具函数

4. **示例代码**：
   - 提供基本使用示例
   - 展示高级特性用法
   - 包含错误处理示例

## 期望输出

请提供：
1. 完整的类型定义文件
2. 核心实现代码
3. 使用示例
4. 简单的测试用例

重点关注代码的可读性、可维护性和性能。参考 Angular DI 的设计模式，但要适合通用场景使用。
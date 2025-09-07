import { Injector, InjectionTokenType, Type } from './injector';
import { NullInjector } from './null-injector';
import { Provider, ValueProvider, ClassProvider, FactoryProvider, ExistingProvider, ConstructorProvider } from './provider';
import { getInjectableMetadata, InjectorScope } from './injectable';
import { getInjectMetadata, getInjectOptionsMetadata } from './inject';
import { InjectOptions } from './inject-options';
import {
  InternalInjectFlags,
  convertInjectOptionsToFlags,
  hasFlag
} from './internal-inject-flags';
import { isOnDestroy, OnDestroy } from './lifecycle';
import { resolveForwardRefCached, resolveForwardRefsInDeps, isForwardRef } from './forward-ref';
import {
  getDebugger,
  DebugEventType,
  InjectorDebugInfo,
  ProviderDebugInfo,
  InstanceDebugInfo
} from './debug';
import { EnvironmentInjectorUtils } from './environment-injector-utils';

// 类型别名：不包含直接Type<T>的Provider联合类型
type NormalizedProvider = ValueProvider<any> | ClassProvider<any> | FactoryProvider<any> | ExistingProvider<any> | ConstructorProvider<any>;

/**
 * 环境注入器，提供全局作用域的依赖管理
 * 支持多种提供者类型、实例缓存和多值注入
 */
export class EnvironmentInjector extends Injector {
  private readonly instances = new Map<any, any>();
  private readonly providers = new Map<any, Provider[]>();
  private readonly autoResolvedClasses = new Set<any>();
  private readonly resolvingTokens = new Set<any>();
  private readonly dependencyPath: any[] = [];
  private isDestroyed = false;
  private readonly injectorId: string;
  private readonly debugger = getDebugger();

  /**
   * 注入器作用域，决定如何处理 providedIn 服务
   */
  public readonly scope: InjectorScope;

  constructor(providers: Provider[], parent?: Injector, scope: InjectorScope = 'root') {
    super(parent || new NullInjector());
    this.injectorId = EnvironmentInjectorUtils.generateInjectorId();
    this.scope = scope;
    this.setupProviders([...providers, { provide: Injector, useValue: this }]);
    this.registerDebugInfo();
  }

  /**
   * 创建支持自动提供者解析的环境注入器
   *
   * 这个静态方法会自动解析标记为 @Injectable({ providedIn: 'auto' }) 等的服务，
   * 无需手动在 providers 数组中注册这些服务。
   *
   * @param manualProviders 手动注册的提供者数组
   * @param parent 可选的父注入器
   * @param scope 注入器作用域，默认为 'auto'
   * @returns 新的环境注入器实例
   */
  static createWithAutoProviders(manualProviders: Provider[], parent?: Injector, scope: InjectorScope = 'auto'): EnvironmentInjector {
    return new EnvironmentInjector(manualProviders, parent, scope);
  }

  // 移除静态单例模式，改为通过 InjectorRegistry 服务管理

  // 移除静态根注入器创建方法，请使用 InjectorRegistry 服务

  // 移除静态根注入器获取方法，请使用 InjectorRegistry 服务

  // 移除所有静态注入器管理方法，请使用 InjectorRegistry 服务

  /**
   * 获取指定令牌的依赖实例
   * @param token 注入令牌
   * @returns 依赖实例
   */
  get<T>(token: InjectionTokenType<T>): T {
    // 解析ForwardRef
    const resolvedToken = resolveForwardRefCached(token);
    const tokenName = this.getTokenName(resolvedToken);

    // 调试日志：记录依赖请求
    this.debugger.logEvent({
      type: DebugEventType.DependencyRequested,
      injectorId: this.injectorId,
      token: resolvedToken,
      tokenName: tokenName,
      dependencyPath: [...this.dependencyPath]
    });

    // 开始计时
    this.debugger.startResolution(this.injectorId, resolvedToken);

    // 检查注入器是否已销毁
    if (this.isDestroyed) {
      throw new Error('注入器已销毁');
    }


    // 检查缓存
    if (this.instances.has(resolvedToken)) {
      const instance = this.instances.get(resolvedToken);

      // 调试日志：缓存命中
      this.debugger.logEvent({
        type: DebugEventType.InstanceCached,
        injectorId: this.injectorId,
        token: resolvedToken,
        tokenName: tokenName,
        instance: instance
      });

      this.debugger.endResolution(this.injectorId, resolvedToken);
      return instance;
    }

    // 检查循环依赖
    if (this.resolvingTokens.has(resolvedToken)) {
      const pathStr = this.dependencyPath.map(t => this.getTokenName(t)).join(' -> ');
      const errorMessage = `检测到循环依赖: ${pathStr} -> ${tokenName}`;

      // 调试日志：循环依赖检测
      this.debugger.logEvent({
        type: DebugEventType.CircularDependencyDetected,
        injectorId: this.injectorId,
        token: resolvedToken,
        tokenName: tokenName,
        dependencyPath: [...this.dependencyPath, tokenName],
        error: new Error(errorMessage)
      });

      this.debugger.endResolution(this.injectorId, resolvedToken);
      throw new Error(errorMessage);
    }

    // 开始解析此令牌
    this.resolvingTokens.add(resolvedToken);
    this.dependencyPath.push(resolvedToken);

    try {
      let result: T;

      // 查找提供者
      const tokenProviders = this.providers.get(resolvedToken);
      if (tokenProviders) {
        result = this.createInstance(resolvedToken, tokenProviders);
        // 非多值提供者才缓存实例
        if (!EnvironmentInjectorUtils.isMultiProvider(tokenProviders)) {
          this.instances.set(resolvedToken, result);
          // 更新调试信息
          this.updateDebugInfo();
        }
      } else {
        // 尝试自动解析 providedIn 服务
        const autoProvider = this.tryAutoResolveProvider(resolvedToken);
        if (autoProvider) {
          // 调试日志：自动解析提供者
          this.debugger.logEvent({
            type: DebugEventType.AutoProviderResolved,
            injectorId: this.injectorId,
            token: resolvedToken,
            tokenName: tokenName,
            provider: autoProvider
          });

          this.providers.set(resolvedToken, [autoProvider]);
          result = this.createInstance(resolvedToken, [autoProvider]);
          this.instances.set(resolvedToken, result);
          // 更新调试信息
          this.updateDebugInfo();
        } else {
          // 委托给父注入器
          result = this.parent!.get(resolvedToken);
        }
      }

      // 调试日志：依赖解析成功
      this.debugger.logEvent({
        type: DebugEventType.DependencyResolved,
        injectorId: this.injectorId,
        token: resolvedToken,
        tokenName: tokenName,
        instance: result,
        dependencyPath: [...this.dependencyPath]
      });

      this.debugger.endResolution(this.injectorId, resolvedToken);
      return result;
    } finally {
      // 清理解析状态
      this.resolvingTokens.delete(resolvedToken);
      this.dependencyPath.pop();
    }
  }

  /**
   * 设置提供者映射
   */
  private setupProviders(providers: Provider[]): void {
    providers.forEach(provider => {
      let normalizedProvider: NormalizedProvider;
      let token: any;
      
      // 自动转换 Type<T> 为 ConstructorProvider<T>
      if (EnvironmentInjectorUtils.isDirectType(provider)) {
        normalizedProvider = EnvironmentInjectorUtils.convertTypeToConstructorProvider(provider);
        token = provider;
      } else {
        // 现在可以安全地假设这不是 Type<T>
        normalizedProvider = provider as NormalizedProvider;
        token = normalizedProvider.provide;
      }

      // 调试日志：注册提供者
      this.debugger.logEvent({
        type: DebugEventType.ProviderRegistered,
        injectorId: this.injectorId,
        token: token,
        tokenName: this.getTokenName(token),
        provider: normalizedProvider,
        metadata: {
          isMulti: normalizedProvider.multi || false,
          isLazy: false,
          wasAutoConverted: EnvironmentInjectorUtils.isDirectType(provider)
        }
      });

      // 处理普通提供者
      const existing = this.providers.get(token) || [];
      this.providers.set(token, [...existing, normalizedProvider]);
    });

    // 更新调试信息
    this.updateDebugInfo();
  }

  /**
   * 根据提供者创建实例
   */
  private createInstance<T>(token: InjectionTokenType<T>, providers: Provider[]): T {
    if (EnvironmentInjectorUtils.isMultiProvider(providers)) {
      return providers.map(p => this.createSingleInstance(p)) as any;
    }

    // 对于非多值注入，使用最后注册的提供者（后面的覆盖前面的）
    return this.createSingleInstance(providers[providers.length - 1]);
  }

  /**
   * 根据单个提供者创建实例
   */
  private createSingleInstance<T>(provider: Provider): T {
    // 处理直接的 Type<T>（双重保险，虽然在setupProviders中已经转换了）
    if (EnvironmentInjectorUtils.isDirectType(provider)) {
      return this.createInstanceWithDI(provider as Type<T>);
    }

    // 现在可以安全地假设 provider 不是 Type<T>
    const normalizedProvider = provider as NormalizedProvider;

    if ('useValue' in normalizedProvider) {
      return normalizedProvider.useValue;
    }

    if ('useClass' in normalizedProvider) {
      const resolvedClass = resolveForwardRefCached(normalizedProvider.useClass);
      return this.createInstanceWithDI(resolvedClass);
    }

    if ('useFactory' in normalizedProvider) {
      const resolvedDeps = resolveForwardRefsInDeps(normalizedProvider.deps);
      const deps = (resolvedDeps || []).map(dep => this.get(dep));
      return normalizedProvider.useFactory(...deps);
    }

    if ('useExisting' in normalizedProvider) {
      const resolvedExisting = resolveForwardRefCached(normalizedProvider.useExisting);
      return this.get(resolvedExisting);
    }

    // ConstructorProvider
    return this.createInstanceWithDI(normalizedProvider.provide as any);
  }

  /**
   * 使用依赖注入创建类实例
   */
  private createInstanceWithDI<T>(ClassConstructor: new (...args: any[]) => T): T {
    // 获取注入元数据
    const injectMetadata = getInjectMetadata(ClassConstructor);
    const injectOptions = getInjectOptionsMetadata(ClassConstructor);

    if (!injectMetadata || injectMetadata.length === 0) {
      // 没有依赖，直接创建
      const instance = new ClassConstructor();

      // 调试日志：实例创建
      this.debugger.logEvent({
        type: DebugEventType.InstanceCreated,
        injectorId: this.injectorId,
        token: ClassConstructor,
        tokenName: ClassConstructor.name,
        instance: instance,
        metadata: {
          hasDependencies: false,
          hasOnDestroy: isOnDestroy(instance)
        }
      });

      return instance;
    }

    // 解析所有依赖
    const dependencies = injectMetadata.map((token, index) => {
      if (token === undefined) {
        throw new Error(`Cannot resolve dependency at index ${index} for ${ClassConstructor.name}. Make sure to use @Inject() decorator.`);
      }

      const options = injectOptions?.[index] || {};
      const resolvedToken = resolveForwardRefCached(token);
      return this.resolveDependency(resolvedToken, options);
    });

    const instance = new ClassConstructor(...dependencies);

    // 调试日志：实例创建
    this.debugger.logEvent({
      type: DebugEventType.InstanceCreated,
      injectorId: this.injectorId,
      token: ClassConstructor,
      tokenName: ClassConstructor.name,
      instance: instance,
      metadata: {
        hasDependencies: true,
        dependencyCount: dependencies.length,
        hasOnDestroy: isOnDestroy(instance)
      }
    });

    return instance;
  }

  /**
   * 根据注入选项解析依赖
   * 支持 optional, skipSelf, self, host 选项
   * 🚀 使用位标志优化性能
   */
  private resolveDependency<T>(token: InjectionTokenType<T>, options: InjectOptions): T;

  /**
   * 根据内部标志位解析依赖 (性能优化版本)
   * 🚀 直接使用位标志，避免对象属性检查和转换开销
   */
  private resolveDependency<T>(token: InjectionTokenType<T>, flags: InternalInjectFlags): T;

  /**
   * 实际的依赖解析实现
   */
  private resolveDependency<T>(token: InjectionTokenType<T>, optionsOrFlags: InjectOptions | InternalInjectFlags): T {
    // 🚀 性能优化：统一处理为位标志
    let flags: InternalInjectFlags;

    if (typeof optionsOrFlags === 'number') {
      // 已经是位标志，直接使用
      flags = optionsOrFlags;
    } else {
      // 是选项对象，需要验证和转换
      EnvironmentInjectorUtils.validateInjectOptions(optionsOrFlags);
      flags = convertInjectOptionsToFlags(optionsOrFlags);
    }

    try {
      // 🚀 使用位运算代替对象属性检查，提高性能
      if (hasFlag(flags, InternalInjectFlags.SkipSelf)) {
        // skipSelf: 跳过当前注入器，从父注入器开始查找
        return this.parent!.get(token);
      }

      if (hasFlag(flags, InternalInjectFlags.Self)) {
        // self: 只在当前注入器查找，不查找父注入器
        return this.getSelf(token);
      }

      if (hasFlag(flags, InternalInjectFlags.Host)) {
        // host: 在宿主注入器（根注入器）中查找
        return this.getFromHost(token);
      }

      // 默认行为：正常的层次化查找
      return this.get(token);
    } catch (error) {
      // 🚀 使用位运算检查可选标志
      if (hasFlag(flags, InternalInjectFlags.Optional)) {
        return null as any;
      }
      throw error;
    }
  }

  /**
   * 带循环依赖检测的依赖解析
   */
  private resolveDepsWithCycleDetection(currentToken: any, deps: any[]): any[] {
    // 检查循环依赖
    if (this.resolvingTokens.has(currentToken)) {
      throw EnvironmentInjectorUtils.generateCircularDependencyError(
        currentToken,
        this.dependencyPath,
        (token) => this.getTokenName(token)
      );
    }

    // 开始解析此令牌
    this.resolvingTokens.add(currentToken);
    this.dependencyPath.push(currentToken);

    try {
      const resolvedDeps = resolveForwardRefsInDeps(deps);
      return (resolvedDeps || []).map(dep => this.get(dep));
    } finally {
      // 清理解析状态
      this.resolvingTokens.delete(currentToken);
      this.dependencyPath.pop();
    }
  }



  /**
   * 只在当前注入器中查找，不查找父注入器
   */
  private getSelf<T>(token: InjectionTokenType<T>): T {
    // 检查注入器是否已销毁
    if (this.isDestroyed) {
      throw new Error('注入器已销毁');
    }

    // 检查缓存
    if (this.instances.has(token)) {
      return this.instances.get(token);
    }

    // 检查循环依赖
    if (this.resolvingTokens.has(token)) {
      const tokenName = this.getTokenName(token);
      const pathStr = this.dependencyPath.map(t => this.getTokenName(t)).join(' -> ');
      throw new Error(`检测到循环依赖: ${pathStr} -> ${tokenName}`);
    }

    // 开始解析此令牌
    this.resolvingTokens.add(token);
    this.dependencyPath.push(token);

    try {
      // 只查找当前注入器的提供者，不查找父注入器
      const tokenProviders = this.providers.get(token);
      if (tokenProviders) {
        const result = this.createInstance(token, tokenProviders);
        // 非多值提供者才缓存实例
        if (!EnvironmentInjectorUtils.isMultiProvider(tokenProviders)) {
          this.instances.set(token, result);
        }
        return result;
      }

      // 尝试自动解析 providedIn 服务
      const autoProvider = this.tryAutoResolveProvider(token);
      if (autoProvider) {
        this.providers.set(token, [autoProvider]);
        const result = this.createInstance(token, [autoProvider]);
        this.instances.set(token, result);
        return result;
      }

      // self 选项不允许查找父注入器，直接抛出错误
      const tokenName = this.getTokenName(token);
      throw new Error(`No provider for ${tokenName}!`);
    } finally {
      // 清理解析状态
      this.resolvingTokens.delete(token);
      this.dependencyPath.pop();
    }
  }

  /**
   * 在宿主注入器（根注入器）中查找依赖
   * host 选项查找最顶层的父注入器，如果没有父注入器，则查找不到
   */
  private getFromHost<T>(token: InjectionTokenType<T>): T {
    // 找到根注入器（宿主注入器）
    let hostInjector: Injector = this;
    while (hostInjector.parent && !(hostInjector.parent instanceof NullInjector)) {
      hostInjector = hostInjector.parent;
    }

    // 如果宿主注入器就是当前注入器（即没有父注入器），
    // 那么 host 应该查找不到，直接抛出错误
    if (hostInjector === this) {
      const tokenName = this.getTokenName(token);
      throw new Error(`No provider for ${tokenName}!`);
    }

    // 如果宿主注入器是其他 EnvironmentInjector，使用其 get 方法
    if (hostInjector instanceof EnvironmentInjector) {
      return hostInjector.get(token);
    }

    // 如果宿主注入器不是 EnvironmentInjector，委托给其 get 方法
    return hostInjector.get(token);
  }

  /**
   * 销毁注入器，清理所有实例并调用 OnDestroy 生命周期钩子
   */
  destroy(): void {
    if (this.isDestroyed) {
      return; // 防止重复销毁
    }

    this.isDestroyed = true;

    // 调试日志：注入器销毁
    this.debugger.logEvent({
      type: DebugEventType.InjectorDestroyed,
      injectorId: this.injectorId,
      metadata: {
        instanceCount: this.instances.size,
        providerCount: this.providers.size
      }
    });

    // 销毁所有普通实例
    for (const instance of this.instances.values()) {
      this.destroyInstance(instance);
    }

    // 清理所有数据结构
    this.instances.clear();
    this.resolvingTokens.clear();
    this.dependencyPath.length = 0;

    // 更新调试信息
    this.updateDebugInfo();
  }

  /**
   * 销毁单个实例
   */
  private destroyInstance(instance: any): void {
    try {
      // 检查是否实现了 OnDestroy 接口
      if (isOnDestroy(instance)) {
        instance.ngOnDestroy();
      }
    } catch (error) {
      // 吞没销毁过程中的错误，不影响其他实例的销毁
      // 在生产环境中可以考虑记录日志
    }
  }

  /**
   * 获取令牌的可读名称，用于错误消息
   */
  private getTokenName(token: any): string {
    return EnvironmentInjectorUtils.getTokenName(token);
  }

  /**
   * 尝试自动解析 providedIn 服务
   */
  private tryAutoResolveProvider(token: any): Provider | null {
    // 只处理函数/类类型的令牌
    if (typeof token !== 'function') {
      return null;
    }

    // 避免重复解析同一个类
    if (this.autoResolvedClasses.has(token)) {
      return null;
    }

    // 获取 Injectable 元数据
    const metadata = getInjectableMetadata(token);
    if (!metadata || metadata.providedIn === null) {
      return null;
    }

    // 检查作用域匹配
    if (!this.shouldAutoResolve(metadata.providedIn)) {
      return null;
    }

    // 标记为已解析，避免循环
    this.autoResolvedClasses.add(token);

    // 创建提供者
    if (metadata.useFactory) {
      return {
        provide: token,
        useFactory: metadata.useFactory,
        deps: metadata.deps || []
      };
    } else {
      return {
        provide: token,
        useClass: token
      };
    }
  }

  /**
   * 判断是否应该在当前注入器中自动解析指定作用域的服务
   */
  private shouldAutoResolve(providedIn: InjectorScope | null | undefined): boolean {
    if (providedIn === null) {
      return false;
    }

    // 解析规则：
    // 1. 'auto' 作用域的服务可以在任何注入器中解析
    // 2. 其他作用域只能在对应的注入器中解析
    return providedIn === 'auto' || this.scope === providedIn;
  }

  /**
   * 注册调试信息
   */
  private registerDebugInfo(): void {
    const parentId = this.parent instanceof EnvironmentInjector
      ? (this.parent as any).injectorId
      : undefined;

    const debugInfo: InjectorDebugInfo = {
      id: this.injectorId,
      type: 'EnvironmentInjector',
      parentId: parentId,
      providersCount: this.providers.size,
      instancesCount: this.instances.size,
      isDestroyed: this.isDestroyed,
      providers: this.getProvidersDebugInfo(),
      instances: this.getInstancesDebugInfo()
    };

    this.debugger.registerInjector(debugInfo);
  }

  /**
   * 更新调试信息
   */
  private updateDebugInfo(): void {
    this.debugger.updateInjector(this.injectorId, {
      providersCount: this.providers.size,
      instancesCount: this.instances.size,
      isDestroyed: this.isDestroyed,
      providers: this.getProvidersDebugInfo(),
      instances: this.getInstancesDebugInfo()
    });
  }

  /**
   * 获取提供者调试信息
   */
  private getProvidersDebugInfo(): ProviderDebugInfo[] {
    return EnvironmentInjectorUtils.generateProvidersDebugInfo(
      this.providers,
      (token) => this.getTokenName(token),
      (token) => this.getTokenType(token)
    );
  }

  /**
   * 获取实例调试信息
   */
  private getInstancesDebugInfo(): InstanceDebugInfo[] {
    const instanceInfos = EnvironmentInjectorUtils.generateInstancesDebugInfo(
      this.instances,
      (token) => this.getTokenName(token)
    );


    return instanceInfos;
  }

  /**
   * 获取令牌类型
   */
  private getTokenType(token: any): string {
    return EnvironmentInjectorUtils.getTokenType(token);
  }



  /**
   * 获取注入器ID（供调试使用）
   */
  getInjectorId(): string {
    return this.injectorId;
  }

  /**
   * 获取调试信息快照
   */
  getDebugSnapshot(): InjectorDebugInfo {
    return {
      id: this.injectorId,
      type: 'EnvironmentInjector',
      parentId: this.parent instanceof EnvironmentInjector
        ? (this.parent as any).injectorId
        : undefined,
      providersCount: this.providers.size,
      instancesCount: this.instances.size,
      isDestroyed: this.isDestroyed,
      providers: this.getProvidersDebugInfo(),
      instances: this.getInstancesDebugInfo()
    };
  }

  /**
   * 获取提供者类型（用于测试）
   */
  getProviderType(provider: Provider): string {
    return EnvironmentInjectorUtils.getProviderType(provider);
  }
}
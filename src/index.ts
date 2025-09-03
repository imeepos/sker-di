import "reflect-metadata";
export { InjectionToken, InjectionTokenOptions } from './injection-token';
export { HostAttributeToken, isHostAttributeToken, createHostAttributeToken } from './host-attribute-token';
export {
  Injector,
  InjectionTokenType,
  Type,
  AbstractType,
  StringToken,
  SymbolToken
} from './injector';
export { NullInjector } from './null-injector';
export { EnvironmentInjector } from './environment-injector';
import { EnvironmentInjector } from './environment-injector';
import { Provider } from './provider';
import { Injector } from './injector';
import { NullInjector } from "./null-injector";
export {
  Provider,
  BaseProvider,
  ValueProvider,
  ClassProvider,
  FactoryProvider,
  ExistingProvider,
  ConstructorProvider,
  LazyClassProvider,
  LazyFactoryProvider
} from './provider';
export {
  Injectable,
  InjectableOptions,
  InjectableMetadata,
  InjectorScope,
  getInjectableMetadata,
  isInjectable
} from './injectable';
export {
  Inject,
  InjectMetadata,
  getInjectMetadata,
  getInjectOptionsMetadata,
  getUnifiedInjectMetadata,
  hasInjectMetadata
} from './inject';
export { Optional, Self, SkipSelf, Host } from './parameter-decorators';
export { InjectOptions } from './inject-options';
export {
  InternalInjectFlags,
  combineInjectFlags,
  hasFlag,
  convertInjectOptionsToFlags,
  convertFlagsToInjectOptions,
  validateInjectOptionsConflicts,
  flagsToString
} from './internal-inject-flags';
export { OnDestroy, isOnDestroy } from './lifecycle';
export { runInInjectionContext, getCurrentInjectionContext, assertInInjectionContext } from './injection-context';
export { forwardRef, ForwardRef, isForwardRef, resolveForwardRef } from './forward-ref';

// 调试和开发工具
export {
  DIDebugger,
  getDebugger,
  enableDevMode,
  disableDebug,
  DebugLevel,
  DebugEventType,
  DebugEvent,
  InjectorDebugInfo,
  ProviderDebugInfo,
  InstanceDebugInfo,
  DebugConfig,
  DebugMetrics
} from './debug';

export {
  DIInspector,
  getInspector,
  printHierarchy,
  printStats,
  searchTokens,
  healthCheck,
  generateReport
} from './debug-inspector';

// 循环依赖检测功能已内置在 EnvironmentInjector 中

// ============================================================================
// 🚀 便捷工厂函数
// ============================================================================

/**
 * 创建支持自动提供者解析的环境注入器
 *
 * 这是 EnvironmentInjector.createWithAutoProviders() 的便捷函数，
 * 提供更简洁的API来创建注入器实例。
 *
 * @param providers 手动注册的提供者数组
 * @param parent 可选的父注入器
 * @returns 新的环境注入器实例，支持 @Injectable({ providedIn: 'root' }) 的自动解析
 *
 * @example
 * ```typescript
 * import { createInjector, Injectable } from '@sker/di';
 *
 * @Injectable({ providedIn: 'root' })
 * class UserService {
 *   getUsers() { return ['user1', 'user2']; }
 * }
 *
 * // 创建注入器，自动解析 providedIn: 'root' 的服务
 * const injector = createInjector([
 *   { provide: 'API_URL', useValue: 'https://api.example.com' }
 * ]);
 *
 * // UserService 会被自动解析，无需手动注册
 * const userService = injector.get(UserService);
 * ```
 */
export const NULL_INJECTOR = new NullInjector();

/**
 * 创建注入器（默认为 auto 作用域）
 *
 * @param providers 提供者数组
 * @param parent 父注入器
 * @param scope 注入器作用域，默认为 'auto'
 */
export function createInjector(providers: Provider[], parent: Injector = NULL_INJECTOR, scope: 'root' | 'platform' | 'application' | 'feature' | 'auto' = 'auto') {
  return EnvironmentInjector.createWithAutoProviders(providers, parent, scope);
}

/**
 * 创建根注入器（全局单例）
 *
 * 根注入器是基础层注入器，全局唯一，标记为 @Injectable({ providedIn: 'root' }) 的服务会在此注入器中注册。
 *
 * @param providers 根级提供者数组
 * @returns 全局唯一的根注入器实例
 * @throws Error 如果根注入器已经存在
 *
 * @example
 * ```typescript
 * import { createRootInjector, Injectable } from '@sker/di';
 *
 * @Injectable({ providedIn: 'root' })
 * class RootService {
 *   getValue() { return 'root'; }
 * }
 *
 * // 第一次调用 - 成功创建
 * const rootInjector = createRootInjector([
 *   { provide: 'ROOT_CONFIG', useValue: { debug: true } }
 * ]);
 *
 * // 第二次调用 - 抛出错误
 * // const anotherRoot = createRootInjector(); // Error: Root injector already exists!
 * ```
 */
export function createRootInjector(providers: Provider[] = []) {
  return EnvironmentInjector.createRootInjector(providers);
}

/**
 * 获取全局根注入器实例
 *
 * @returns 根注入器实例，如果不存在则返回 null
 */
export function getRootInjector() {
  return EnvironmentInjector.getRootInjector();
}

/**
 * 重置根注入器（主要用于测试）
 *
 * ⚠️ 警告：此函数会销毁现有的根注入器，仅应在测试环境中使用
 *
 * @example
 * ```typescript
 * import { resetRootInjector } from '@sker/di';
 *
 * // 在测试的 afterEach 中重置
 * afterEach(() => {
 *   resetRootInjector();
 * });
 * ```
 */
export function resetRootInjector() {
  return EnvironmentInjector.resetRootInjector();
}

/**
 * 创建平台注入器（全局单例）
 *
 * 平台注入器用于存储跨应用共享的服务，全局唯一，自动使用全局根注入器作为父级。
 * 标记为 @Injectable({ providedIn: 'platform' }) 的服务会在此注入器中注册。
 *
 * 注意：必须先调用 createRootInjector() 创建全局根注入器。
 *
 * @param providers 平台级提供者数组
 * @returns 全局唯一的平台注入器实例
 * @throws Error 如果平台注入器已经存在或全局根注入器不存在
 *
 * @example
 * ```typescript
 * import { createRootInjector, createPlatformInjector, Injectable } from '@sker/di';
 *
 * @Injectable({ providedIn: 'platform' })
 * class PlatformLoggerService {
 *   log(message: string) { console.log(message); }
 * }
 *
 * // ✅ 正确的顺序：先创建根注入器
 * const rootInjector = createRootInjector();
 *
 * // 然后创建平台注入器（全局单例）
 * const platformInjector = createPlatformInjector([
 *   { provide: 'PLATFORM_CONFIG', useValue: { version: '1.0.0' } }
 * ]);
 *
 * // ❌ 错误：重复创建平台注入器
 * // const anotherPlatform = createPlatformInjector(); // Error: Platform injector already exists!
 *
 * // ❌ 错误：没有先创建根注入器
 * // const platformInjector = createPlatformInjector(); // Error: Root injector not found!
 *
 * const logger = platformInjector.get(PlatformLoggerService);
 * ```
 */
export function createPlatformInjector(providers: Provider[] = []) {
  return EnvironmentInjector.createPlatformInjector(providers);
}

/**
 * 获取全局平台注入器实例
 *
 * @returns 平台注入器实例，如果不存在则返回 null
 */
export function getPlatformInjector() {
  return EnvironmentInjector.getPlatformInjector();
}

/**
 * 重置平台注入器（主要用于测试）
 *
 * ⚠️ 警告：此函数会销毁现有的平台注入器，仅应在测试环境中使用
 */
export function resetPlatformInjector() {
  return EnvironmentInjector.resetPlatformInjector();
}

/**
 * 创建应用注入器
 *
 * 应用注入器以全局平台注入器为父级，用于存储应用级的服务。
 * 标记为 @Injectable({ providedIn: 'application' }) 的服务会在此注入器中注册。
 *
 * 注意：必须先调用 createPlatformInjector() 创建全局平台注入器。
 *
 * @param providers 应用级提供者数组
 * @returns 新的应用注入器实例
 * @throws Error 如果全局平台注入器不存在
 *
 * @example
 * ```typescript
 * import { createRootInjector, createPlatformInjector, createApplicationInjector, Injectable } from '@sker/di';
 *
 * @Injectable({ providedIn: 'application' })
 * class UserService {
 *   getUser() { return { id: 1, name: 'John' }; }
 * }
 *
 * // ✅ 正确的顺序
 * const rootInjector = createRootInjector();
 * const platformInjector = createPlatformInjector();
 * const appInjector = createApplicationInjector([
 *   { provide: 'APP_CONFIG', useValue: { name: 'MyApp' } }
 * ]); // 自动使用全局平台注入器作为父级
 *
 * // ❌ 错误：没有先创建平台注入器
 * // const appInjector = createApplicationInjector(); // Error: Platform injector not found!
 *
 * const userService = appInjector.get(UserService);
 * ```
 */
export function createApplicationInjector(providers: Provider[] = []) {
  return EnvironmentInjector.createApplicationInjector(providers);
}

/**
 * 创建功能模块注入器
 *
 * 功能注入器通常以应用注入器为父级，用于存储功能模块级的服务。
 * 标记为 @Injectable({ providedIn: 'feature' }) 的服务会在此注入器中注册。
 *
 * @param providers 功能模块级提供者数组
 * @param parentInjector 父注入器（通常是应用注入器）
 * @returns 新的功能注入器实例
 *
 * @example
 * ```typescript
 * import { Injectable, createApplicationInjector, createFeatureInjector } from '@sker/di';
 *
 * @Injectable({ providedIn: 'feature' })
 * class FeatureService {
 *   getFeatureData() { return 'feature-data'; }
 * }
 *
 * const appInjector = createApplicationInjector([], platformInjector);
 * const featureInjector = createFeatureInjector([
 *   { provide: 'FEATURE_CONFIG', useValue: { enabled: true } }
 * ], appInjector);
 *
 * const service = featureInjector.get(FeatureService);
 * ```
 */
export function createFeatureInjector(providers: Provider[], parentInjector: EnvironmentInjector) {
  return EnvironmentInjector.createFeatureInjector(providers, parentInjector);
}
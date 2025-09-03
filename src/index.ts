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
export function createInjector(providers: Provider[], parent: Injector = NULL_INJECTOR) {
  return EnvironmentInjector.createWithAutoProviders(providers, parent);
}
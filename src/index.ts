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
export { OnDestroy, isOnDestroy, OnInit, isOnInit, OnInstall, isOnInstall, OnUnInstall, isOnUnInstall, OnUpgrade, isOnUpgrade } from './lifecycle';
export { runInInjectionContext, getCurrentInjectionContext, assertInInjectionContext } from './injection-context';
export { forwardRef, ForwardRef, isForwardRef, resolveForwardRef } from './forward-ref';

// 调试和开发工具
export {
  DIDebugger,
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
  IDIInspector,
} from './debug-inspector';

// 循环依赖检测功能已内置在 EnvironmentInjector 中

// ============================================================================
// 🚀 DI 核心服务管理（一切皆服务，一切皆可注入）
// ============================================================================

/**
 * 空注入器常量
 */
export const NULL_INJECTOR = new NullInjector();

/**
 * 创建注入器（默认为 root 作用域）
 *
 * @param providers 提供者数组
 * @param parent 父注入器
 * @param scope 注入器作用域，默认为 'root'
 */
export function createInjector(providers: Provider[], parent: Injector = NULL_INJECTOR, scope: 'root' | 'platform' | 'application' | 'feature' | 'auto' = 'root') {
  return EnvironmentInjector.createWithAutoProviders(providers, parent, scope);
}

// ============================================================================
// 🚀 插件化架构系统 (一切皆服务，一切皆可注入)
// ============================================================================


// 应用管理系统
export {
  ApplicationRef
} from './application-manager';

// 平台工厂和管理
export {
  createPlatformFactory,
  PlatformRef,
  PlatformFactory
} from './platform-factory';

// 模块系统
export {
  Module,
  ModuleMetadata,
  ModuleWithProviders,
  ModuleOptions,
  ResolvedModule,
  ModuleResolver,
  getModuleMetadata,
  isModule,
  MODULE_METADATA_KEY,
} from './module-system';

// 存储系统
export {
  Storage,
  Application,
  PlatformStorage
} from './storage';

// 内存存储实现
export {
  MemoryStorage,
  MemoryPlatformStorage
} from './memory-storage';

// 根注入器
export {
  rootInjector
} from './root';

// 令牌定义
export {
  PLATFORM_INITITATION,
  APPLICATION_INITITATION
} from './tokens';

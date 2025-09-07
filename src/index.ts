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
  IDIInspector,
  DI_INSPECTOR,
  getInspector,
  printHierarchy,
  printStats,
  searchTokens,
  healthCheck,
  generateReport
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

// 移除全局静态管理函数，请使用以下DI服务：
// - InjectorRegistry: 管理注入器生命周期
// - PlatformManager: 管理平台实例
//
// 示例用法：
// const injectorRegistry = injector.get(INJECTOR_REGISTRY);
// const rootInjector = injectorRegistry.createRootInjector(providers);
// const platformInjector = injectorRegistry.createPlatformInjector(providers);
// const appInjector = injectorRegistry.createApplicationInjector(providers);
//
// const platformManager = injector.get(PLATFORM_MANAGER);
// const currentPlatform = platformManager.getCurrentPlatform();

// 移除的全局函数（违反DI原则）：
// - createRootInjector
// - getRootInjector  
// - resetRootInjector
// - createPlatformInjector
// - getPlatformInjector
// - resetPlatformInjector
// - createApplicationInjector
// - createFeatureInjector

// ============================================================================
// 🚀 平台架构系统 (扩展性增强)
// ============================================================================


// 应用管理系统
export {
  ApplicationRef,
  ApplicationState,
  ApplicationFeature,
  ApplicationManager,
} from './application-manager';

// Feature引用系统
export {
  FeatureRef,
  FeatureState,
  DefaultFeatureRef,
  createFeatureRef
} from './feature-ref';

// 平台工厂和管理
export {
  createPlatformFactory
  // 移除全局函数：getPlatform, destroyPlatform, hasPlatform
  // 请使用 PlatformManager 服务进行DI管理
} from './platform-factory';

// 应用配置系统（保持平台无关性）
export {
  ApplicationConfig,
  BaseApplicationConfig,
  ApplicationBootstrapContext,
  ApplicationConfigFactory,
  APPLICATION_CONFIG,
  APPLICATION_BOOTSTRAP_CONTEXT,
  provideApplicationConfig,
  provideApplicationConfigFactory
} from './application-config';

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

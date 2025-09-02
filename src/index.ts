import "reflect-metadata";
export { InjectionToken, InjectionTokenOptions } from './injection-token';
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
  getInjectMetadata, 
  getInjectOptionsMetadata,
  hasInjectMetadata 
} from './inject';
export { InjectOptions } from './inject-options';
export { OnDestroy, isOnDestroy } from './lifecycle';
export { runInInjectionContext, getCurrentInjectionContext } from './injection-context';
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
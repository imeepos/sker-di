import { Provider } from './provider';
import { InjectionToken } from './injection-token';
import { Injectable, InjectableOptions } from './injectable';
import { PlatformExtension } from './platform-ref';

/**
 * 模块元数据接口
 */
export interface ModuleMetadata {
  /** 模块提供的服务 */
  providers?: Provider[];
  
  /** 导入的其他模块 */
  imports?: (ModuleClass | ModuleWithProviders)[];
  
  /** 导出的服务（可供其他模块使用） */
  exports?: any[];
  
  /** 模块引导组件 */
  bootstrap?: any[];
  
  /** 模块声明的组件/指令/管道 */
  declarations?: any[];
}

/**
 * 带有提供者的模块配置
 */
export interface ModuleWithProviders<T = any> {
  ngModule: ModuleClass<T>;
  providers: Provider[];
}

/**
 * 模块类型
 */
export interface ModuleClass<T = any> {
  new (...args: any[]): T;
}

/**
 * 模块配置选项
 */
export interface ModuleOptions extends ModuleMetadata {
  /** 模块名称 */
  name?: string;
  
  /** 模块版本 */
  version?: string;
  
  /** 是否为根模块 */
  isRoot?: boolean;
}

/**
 * 模块元数据存储键
 */
export const MODULE_METADATA_KEY = Symbol('module');

/**
 * @Module 装饰器
 * 标记类为模块并存储配置元数据
 * 
 * @param metadata 模块元数据
 * @returns 类装饰器函数
 * 
 * @example
 * ```typescript
 * @Module({
 *   providers: [
 *     { provide: 'CONFIG', useValue: { api: 'http://localhost' } },
 *     UserService
 *   ],
 *   imports: [CommonModule],
 *   exports: [UserService]
 * })
 * export class UserModule {}
 * ```
 */
export function Module(metadata: ModuleOptions = {}): ClassDecorator {
  return function <T extends Function>(target: T): T {
    // 存储模块元数据
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, target);
    return target;
  };
}

/**
 * 获取模块元数据
 * 
 * @param moduleClass 模块类
 * @returns 模块元数据或 undefined
 */
export function getModuleMetadata(moduleClass: any): ModuleOptions | undefined {
  return Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass);
}

/**
 * 检查是否为模块类
 * 
 * @param target 目标类
 * @returns 是否为模块
 */
export function isModule(target: any): boolean {
  return Reflect.hasMetadata(MODULE_METADATA_KEY, target);
}

/**
 * 模块解析器
 * 负责解析模块依赖和合并提供者
 */
export class ModuleResolver {
  private readonly resolvedModules = new Map<any, ResolvedModule>();
  private readonly resolvingModules = new Set<any>();

  /**
   * 解析模块及其依赖
   * 
   * @param moduleOrConfig 模块类或配置
   * @returns 解析后的模块信息
   */
  resolve(moduleOrConfig: ModuleClass | ModuleWithProviders): ResolvedModule {
    const moduleClass = this.extractModuleClass(moduleOrConfig);
    
    // 检查是否已解析
    if (this.resolvedModules.has(moduleClass)) {
      return this.resolvedModules.get(moduleClass)!;
    }

    // 检查循环依赖
    if (this.resolvingModules.has(moduleClass)) {
      throw new Error(`Circular module dependency detected: ${moduleClass.name}`);
    }

    // 开始解析
    this.resolvingModules.add(moduleClass);

    try {
      const resolved = this.doResolve(moduleOrConfig);
      this.resolvedModules.set(moduleClass, resolved);
      return resolved;
    } finally {
      this.resolvingModules.delete(moduleClass);
    }
  }

  /**
   * 提取模块类
   */
  private extractModuleClass(moduleOrConfig: ModuleClass | ModuleWithProviders): ModuleClass {
    if ('ngModule' in moduleOrConfig) {
      return moduleOrConfig.ngModule;
    }
    return moduleOrConfig;
  }

  /**
   * 执行模块解析
   */
  private doResolve(moduleOrConfig: ModuleClass | ModuleWithProviders): ResolvedModule {
    const moduleClass = this.extractModuleClass(moduleOrConfig);
    const metadata = getModuleMetadata(moduleClass) || {};
    
    // 获取直接提供者
    const directProviders = metadata.providers || [];
    
    // 如果是 ModuleWithProviders，添加额外提供者
    if ('providers' in moduleOrConfig) {
      directProviders.push(...moduleOrConfig.providers);
    }

    // 解析导入的模块
    const importedModules: ResolvedModule[] = [];
    const importedProviders: Provider[] = [];

    if (metadata.imports) {
      for (const importItem of metadata.imports) {
        const resolvedImport = this.resolve(importItem);
        importedModules.push(resolvedImport);
        importedProviders.push(...resolvedImport.providers);
      }
    }

    // 合并所有提供者（导入的在前，直接的在后，后者可以覆盖前者）
    const allProviders = [...importedProviders, ...directProviders];

    // 处理导出
    const exports = new Set(metadata.exports || []);

    return {
      moduleClass,
      metadata,
      providers: allProviders,
      imports: importedModules,
      exports: Array.from(exports),
      isResolved: true
    };
  }

  /**
   * 清理解析缓存
   */
  clear(): void {
    this.resolvedModules.clear();
    this.resolvingModules.clear();
  }
}

/**
 * 解析后的模块信息
 */
export interface ResolvedModule {
  /** 模块类 */
  moduleClass: ModuleClass;
  
  /** 原始元数据 */
  metadata: ModuleOptions;
  
  /** 合并后的提供者 */
  providers: Provider[];
  
  /** 导入的模块 */
  imports: ResolvedModule[];
  
  /** 导出的服务 */
  exports: any[];
  
  /** 是否已解析 */
  isResolved: boolean;
}

/**
 * 全局模块解析器实例
 */
export const moduleResolver = new ModuleResolver();

/**
 * 核心模块令牌
 */
export const CORE_MODULE = new InjectionToken<any>('CORE_MODULE');
export const PLATFORM_MODULE = new InjectionToken<any>('PLATFORM_MODULE');
export const APPLICATION_MODULE = new InjectionToken<any>('APPLICATION_MODULE');

/**
 * 模块工具函数
 */
export class ModuleUtils {
  /**
   * 创建根模块
   * 
   * @param moduleClass 模块类
   * @param providers 额外提供者
   * @returns 带提供者的模块配置
   */
  static forRoot<T>(moduleClass: ModuleClass<T>, providers: Provider[] = []): ModuleWithProviders<T> {
    return {
      ngModule: moduleClass,
      providers: [
        ...providers,
        { provide: moduleClass, useClass: moduleClass }
      ]
    };
  }

  /**
   * 创建子模块
   * 
   * @param moduleClass 模块类
   * @param providers 额外提供者
   * @returns 带提供者的模块配置
   */
  static forChild<T>(moduleClass: ModuleClass<T>, providers: Provider[] = []): ModuleWithProviders<T> {
    return {
      ngModule: moduleClass,
      providers
    };
  }

  /**
   * 创建功能模块
   * 
   * @param moduleClass 模块类
   * @param config 功能配置
   * @returns 带提供者的模块配置
   */
  static forFeature<T>(moduleClass: ModuleClass<T>, config: any = {}): ModuleWithProviders<T> {
    return {
      ngModule: moduleClass,
      providers: [
        { provide: 'FEATURE_CONFIG', useValue: config }
      ]
    };
  }

  /**
   * 将模块转换为平台扩展
   * 
   * @param moduleOrConfig 模块配置
   * @param name 扩展名称
   * @returns 平台扩展
   */
  static toPlatformExtension(
    moduleOrConfig: ModuleClass | ModuleWithProviders, 
    name?: string
  ): PlatformExtension {
    const resolved = moduleResolver.resolve(moduleOrConfig);
    const moduleClass = resolved.moduleClass;
    
    return {
      name: name || moduleClass.name || 'unknown-module',
      providers: resolved.providers,
      initialize: async (platform) => {
        // 模块初始化逻辑（如果需要）
        console.log(`Initialized module extension: ${moduleClass.name}`);
      }
    };
  }
}

/**
 * 通用模块基类
 * 提供一些通用的模块功能
 */
export abstract class BaseModule {
  constructor() {
    // 模块实例化时的通用逻辑
  }

  /**
   * 模块配置方法（可重写）
   */
  configure?(): void | Promise<void>;

  /**
   * 模块初始化方法（可重写）
   */
  initialize?(): void | Promise<void>;

  /**
   * 模块销毁方法（可重写）
   */
  destroy?(): void | Promise<void>;
}
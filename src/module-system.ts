import { Provider, Type } from './provider';
import { InjectionToken } from './injection-token';
import { Injectable } from './injectable';

/**
 * 模块元数据接口
 */
export interface ModuleMetadata {
  /** 模块提供的服务 */
  providers?: Provider[];

  /** 导入的其他模块 */
  imports?: (Type<any> | ModuleWithProviders)[];

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
  ngModule: Type<T>;
  providers: Provider[];
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
@Injectable({ providedIn: 'root' })
export class ModuleResolver {
  private readonly resolvedModules = new Map<any, ResolvedModule<any>>();
  private readonly resolvingModules = new Set<any>();

  /**
   * 解析模块及其依赖
   * 
   * @param moduleOrConfig 模块类或配置
   * @returns 解析后的模块信息
   */
  resolve<T>(moduleOrConfig: Type<T> | ModuleWithProviders<T>): ResolvedModule<T> {
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
  private extractModuleClass<T>(moduleOrConfig: Type<T> | ModuleWithProviders): Type<T> {
    if ('ngModule' in moduleOrConfig) {
      return moduleOrConfig.ngModule;
    }
    return moduleOrConfig;
  }

  /**
   * 执行模块解析
   */
  private doResolve<T>(moduleOrConfig: Type<T> | ModuleWithProviders): ResolvedModule<T> {
    const moduleClass = this.extractModuleClass(moduleOrConfig);
    const metadata = getModuleMetadata(moduleClass) || {};

    // 获取直接提供者
    const directProviders = metadata.providers || [];

    // 如果是 ModuleWithProviders，添加额外提供者
    if ('providers' in moduleOrConfig) {
      directProviders.push(...moduleOrConfig.providers);
    }

    // 解析导入的模块
    const importedModules: ResolvedModule<any>[] = [];
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
export interface ResolvedModule<T> {
  /** 模块类 */
  moduleClass: Type<T>;

  /** 原始元数据 */
  metadata: ModuleOptions;

  /** 合并后的提供者 */
  providers: Provider[];

  /** 导入的模块 */
  imports: ResolvedModule<T>[];

  /** 导出的服务 */
  exports: any[];

  /** 是否已解析 */
  isResolved: boolean;
}

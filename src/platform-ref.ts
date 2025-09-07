import { EnvironmentInjector } from './environment-injector';
import { Provider } from './provider';
import { Injector, InjectionTokenType } from './injector';
import { OnDestroy } from './lifecycle';
import { ApplicationRef, ApplicationFeature } from './application-manager';

/**
 * 平台配置选项
 */
export interface PlatformConfig {
  /** 平台名称 */
  name: string;
  /** 平台版本 */
  version?: string;
  /** 是否启用调试模式 */
  enableDebug?: boolean;
  /** 自定义配置 */
  [key: string]: any;
}


// ApplicationRef 现在从 './application-manager' 导入

/**
 * 平台引用抽象类
 * 管理平台级别的服务和应用生命周期
 */
export abstract class PlatformRef implements OnDestroy {
  /** 平台注入器 */
  abstract readonly injector: EnvironmentInjector;
  
  /** 平台配置 */
  abstract readonly config: PlatformConfig;
  
  /** 平台是否已销毁 */
  abstract readonly destroyed: boolean;
  
  /** 获取应用列表（只读） */
  abstract readonly applications: ReadonlyMap<string, ApplicationRef<any>>;

  /**
   * 引导应用
   */
  abstract bootstrapApplication(
    providersOrAppId?: Provider[] | string, 
    providersOrOptions?: Provider[],
    features?: ApplicationFeature[]
  ): Promise<ApplicationRef>;

  /**
   * 创建应用注入器
   * @param providers 应用级提供者
   */
  abstract createApplicationInjector(providers?: Provider[]): EnvironmentInjector;

  /**
   * 获取已注册的应用
   * @param id 应用ID
   */
  abstract getApplication<T = any>(id: string): ApplicationRef<T> | undefined;

  /**
   * 获取所有应用
   */
  abstract getApplications(): ApplicationRef<any>[];

  /**
   * 获取所有应用ID
   */
  abstract getApplicationIds(): string[];

  /**
   * 销毁应用
   * @param id 应用ID
   */
  abstract destroyApplication(id: string): Promise<boolean>;

  /**
   * 重新加载应用
   * @param id 应用ID
   * @param providers 新的提供者（可选）
   * @param features 新的Features（可选）
   */
  abstract reloadApplication(id: string, providers?: Provider[], features?: ApplicationFeature[]): Promise<ApplicationRef>;

  /**
   * 销毁平台及所有应用
   */
  abstract destroy(): void;

  ngOnDestroy(): void {
    this.destroy();
  }
}

/**
 * 平台工厂函数类型
 * 用于创建平台实例的工厂函数
 */
export type PlatformFactory = (extraProviders?: Provider[]) => PlatformRef;

/**
 * 平台模块接口
 * 定义平台的配置和提供者
 */
export interface PlatformModule {
  /** 平台配置 */
  config: PlatformConfig;
  
  /** 平台提供者 */
  providers: Provider[];
  
  /** 平台扩展 */
  extensions?: PlatformExtension[];
}

/**
 * 平台扩展接口
 * 用于扩展平台功能
 */
export interface PlatformExtension {
  /** 扩展名称 */
  name: string;
  
  /** 扩展提供者 */
  providers?: Provider[];
  
  /** 扩展初始化钩子 */
  initialize?(platform: PlatformRef): void | Promise<void>;
  
  /** 扩展销毁钩子 */
  destroy?(platform: PlatformRef): void | Promise<void>;
}

// DefaultApplicationRef 已迁移到 application-manager.ts
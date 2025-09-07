import { EnvironmentInjector } from './environment-injector';
import { Provider } from './provider';
import { Injector } from './injector';
import { OnDestroy } from './lifecycle';

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

/**
 * 应用引用接口
 * 表示一个运行中的应用实例
 */
export interface ApplicationRef extends OnDestroy {
  /** 应用注入器 */
  readonly injector: EnvironmentInjector;
  
  /** 应用是否已销毁 */
  readonly isDestroyed: boolean;
  
  /** 引导应用 */
  bootstrap<T>(componentOrToken?: any): T;
  
  /** 销毁应用 */
  destroy(): void;
}

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
  
  /** 注册的应用列表 */
  protected readonly applications = new Map<string, ApplicationRef>();

  /**
   * 引导应用
   * @param providers 应用级提供者
   * @param options 引导选项
   */
  abstract bootstrapApplication(providers?: Provider[], options?: any): Promise<ApplicationRef>;

  /**
   * 创建应用注入器
   * @param providers 应用级提供者
   */
  abstract createApplicationInjector(providers?: Provider[]): EnvironmentInjector;

  /**
   * 获取已注册的应用
   * @param name 应用名称
   */
  getApplication(name: string): ApplicationRef | undefined {
    return this.applications.get(name);
  }

  /**
   * 获取所有应用
   */
  getApplications(): ApplicationRef[] {
    return Array.from(this.applications.values());
  }

  /**
   * 销毁平台及所有应用
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    // 销毁所有应用
    for (const app of this.applications.values()) {
      app.destroy();
    }
    this.applications.clear();

    // 销毁平台注入器
    this.injector.destroy();
  }

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

/**
 * 默认应用引用实现
 */
export class DefaultApplicationRef implements ApplicationRef {
  private _destroyed = false;

  constructor(
    public readonly injector: EnvironmentInjector,
    private readonly platform: PlatformRef
  ) {}

  get isDestroyed(): boolean {
    return this._destroyed;
  }

  bootstrap<T>(componentOrToken?: any): T {
    if (this._destroyed) {
      throw new Error('Cannot bootstrap destroyed application');
    }

    // 如果没有指定组件/令牌，返回注入器本身
    if (!componentOrToken) {
      return this.injector as any;
    }

    // 从注入器获取组件实例
    return this.injector.get(componentOrToken);
  }

  destroy(): void {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;
    this.injector.destroy();
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
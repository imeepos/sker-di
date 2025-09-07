import { EnvironmentInjector } from './environment-injector';
import { Provider } from './provider';
import { OnDestroy } from './lifecycle';
import { InjectionTokenType, Injector } from './injector';
import { APPLICATION_CONFIG, APPLICATION_BOOTSTRAP_CONTEXT, BaseApplicationConfig, ApplicationBootstrapContext, ApplicationConfig } from './application-config';
import { IDIDebugger, DI_DEBUGGER, DebugEventType } from './debug';
import { FeatureRef, createFeatureRef } from './feature-ref';
import { Injectable } from './injectable';
import { Inject } from './inject';

/**
 * 应用状态枚举
 */
export enum ApplicationState {
  BOOTSTRAPPING = 'bootstrapping',
  RUNNING = 'running',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed'
}

/**
 * Feature接口 - 应用的功能插件
 */
export interface ApplicationFeature {
  /** Feature名称 */
  name: string;
  /** Feature版本 */
  version?: string;
  /** Feature依赖的其他Features */
  dependencies?: string[];
  /** Feature提供者 */
  providers?: Provider[];
  /** Feature初始化钩子 */
  initialize?(app: ApplicationRef): void | Promise<void>;
  /** Feature销毁钩子 */
  destroy?(app: ApplicationRef): void | Promise<void>;
}

/**
 * 应用引用接口
 */
export abstract class ApplicationRef<T = any> {
  /** 应用ID（唯一标识） */
  abstract readonly id: string;
  /** 应用名称 */
  abstract readonly name: string;
  /** 应用状态 */
  abstract readonly state: ApplicationState;
  /** 应用注入器 */
  abstract readonly injector: Injector;
  /** 应用是否已销毁 */
  abstract readonly isDestroyed: boolean;
  /** 已加载的Features */
  abstract readonly features: ReadonlyMap<string, ApplicationFeature>;

  /** 已加载的FeatureRef实例 */
  abstract readonly featureRefs: ReadonlyMap<string, FeatureRef>;

  /** 引导应用组件 */
  abstract bootstrap<U = T>(componentOrToken?: InjectionTokenType<U>): U;

  /** 加载Feature */
  abstract loadFeature(feature: ApplicationFeature): Promise<void>;

  /** 卸载Feature */
  abstract unloadFeature(featureName: string): Promise<void>;

  /** 重新加载Feature */
  abstract reloadFeature(feature: ApplicationFeature): Promise<void>;

  /** 删除Feature */
  abstract deleteFeature(featureName: string): Promise<void>;

  /** 获取FeatureRef */
  abstract getFeatureRef(featureName: string): FeatureRef | undefined;

  /** 销毁应用 */
  abstract destroy(): void;
}

/**
 * 应用管理器 - 管理平台上的所有应用
 */
@Injectable({ providedIn: 'root' })
export class ApplicationManager implements OnDestroy {
  private readonly _applications = new Map<string, ApplicationRef>();
  private _destroyed = false;

  constructor(
    @Inject(DI_DEBUGGER) private readonly diDebugger: IDIDebugger
  ) {
    // 暂时使用全局方式获取平台注入器，后续需要改进
    this.platformInjector = EnvironmentInjector.getPlatformInjector()!;
  }

  private readonly platformInjector: EnvironmentInjector;

  /**
   * 创建新应用
   */
  async createApplication(
    id: string,
    providers: Provider[] = [],
    features: ApplicationFeature[] = []
  ): Promise<ApplicationRef> {
    if (this._destroyed) {
      throw new Error('ApplicationManager is destroyed');
    }

    if (this._applications.has(id)) {
      throw new Error(`Application with id '${id}' already exists`);
    }

    // 创建应用注入器
    const appInjector = this.createApplicationInjector([
      ...providers,
      {
        provide: ApplicationRef,
        useFactory: (injector: Injector, config: ApplicationConfig, diDebugger: IDIDebugger) => {
          return new DefaultApplicationRef(id, config.name, injector, this, diDebugger)
        },
        deps: [Injector, APPLICATION_CONFIG, DI_DEBUGGER]
      }
    ]);

    // 获取应用配置
    const config = appInjector.get(APPLICATION_CONFIG);

    // 创建应用实例
    const app = appInjector.get(ApplicationRef)

    // 注册应用
    this._applications.set(id, app);

    // 加载Features
    for (const feature of features) {
      await app.loadFeature(feature);
    }

    // 调试日志
    this.diDebugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.platformInjector.getInjectorId(),
      metadata: {
        action: 'createApplication',
        appId: id,
        appName: config.name,
        featuresCount: features.length
      }
    });

    return app;
  }

  /**
   * 获取应用
   */
  getApplication<T = any>(id: string): ApplicationRef<T> | undefined {
    return this._applications.get(id) as ApplicationRef<T> | undefined;
  }

  /**
   * 获取所有应用
   */
  getApplications(): ApplicationRef[] {
    return Array.from(this._applications.values());
  }

  /**
   * 获取所有应用ID
   */
  getApplicationIds(): string[] {
    return Array.from(this._applications.keys());
  }

  /**
   * 销毁应用
   */
  async destroyApplication(id: string): Promise<boolean> {
    const app = this._applications.get(id);
    if (!app) {
      return false;
    }

    app.destroy();
    this._applications.delete(id);

    this.diDebugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.platformInjector.getInjectorId(),
      metadata: {
        action: 'destroyApplication',
        appId: id
      }
    });

    return true;
  }

  /**
   * 销毁所有应用
   */
  destroyAll(): void {
    for (const app of this._applications.values()) {
      app.destroy();
    }
    this._applications.clear();
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;
    this.destroyAll();
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  /**
   * 内部方法：移除应用（由ApplicationRef调用）
   */
  _removeApplication(id: string): void {
    this._applications.delete(id);
  }

  private createApplicationInjector(providers: Provider[]): EnvironmentInjector {
    return EnvironmentInjector.createApplicationInjector([...providers]);
  }

  private getApplicationConfig(injector: EnvironmentInjector, fallbackName: string): BaseApplicationConfig {
    try {
      return injector.get(APPLICATION_CONFIG);
    } catch {
      return { name: fallbackName };
    }
  }
}

/**
 * 默认应用引用实现
 */
export class DefaultApplicationRef<T = any> extends ApplicationRef<T> {
  private _state: ApplicationState = ApplicationState.BOOTSTRAPPING;
  private _destroyed = false;
  private readonly _features = new Map<string, ApplicationFeature>();
  private readonly _featureRefs = new Map<string, FeatureRef>();

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly injector: Injector,
    private readonly manager: ApplicationManager,
    private readonly diDebugger: IDIDebugger
  ) {
    super();
    // 应用创建完成，状态变为运行中
    this._state = ApplicationState.RUNNING;
  }

  get state(): ApplicationState {
    return this._state;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }

  get features(): ReadonlyMap<string, ApplicationFeature> {
    return this._features;
  }

  get featureRefs(): ReadonlyMap<string, FeatureRef> {
    return this._featureRefs;
  }

  bootstrap<U = T>(componentOrToken?: InjectionTokenType<U>): U {
    if (this._destroyed) {
      throw new Error('Cannot bootstrap destroyed application');
    }

    if (this._state !== ApplicationState.RUNNING) {
      throw new Error(`Cannot bootstrap application in state: ${this._state}`);
    }

    // 如果没有指定组件/令牌，返回注入器本身
    if (!componentOrToken) {
      return this.injector as any;
    }

    // 从注入器获取组件实例
    return this.injector.get(componentOrToken);
  }

  async loadFeature(feature: ApplicationFeature): Promise<void> {
    if (this._destroyed) {
      throw new Error('Cannot load feature on destroyed application');
    }

    if (this._features.has(feature.name)) {
      throw new Error(`Feature '${feature.name}' is already loaded`);
    }

    // 检查依赖
    if (feature.dependencies) {
      for (const dep of feature.dependencies) {
        if (!this._features.has(dep)) {
          throw new Error(`Feature '${feature.name}' depends on '${dep}', but it is not loaded`);
        }
      }
    }

    // 创建FeatureRef实例（包含独立的featureInjector）
    const featureRef = createFeatureRef(feature, this.injector);

    // 初始化Feature
    if (feature.initialize) {
      await feature.initialize(this);
    }

    // 注册Feature和FeatureRef
    this._features.set(feature.name, feature);
    this._featureRefs.set(feature.name, featureRef);

    this.diDebugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.injector.getInjectorId(),
      metadata: {
        action: 'loadFeature',
        appId: this.id,
        featureName: feature.name,
        featureVersion: feature.version
      }
    });
  }

  async unloadFeature(featureName: string): Promise<void> {
    if (this._destroyed) {
      throw new Error('Cannot unload feature from destroyed application');
    }

    const feature = this._features.get(featureName);
    if (!feature) {
      return; // Feature不存在，忽略
    }

    // 检查是否有其他Feature依赖此Feature
    for (const [name, f] of this._features) {
      if (name !== featureName && f.dependencies?.includes(featureName)) {
        throw new Error(`Cannot unload feature '${featureName}' because '${name}' depends on it`);
      }
    }

    // 销毁FeatureRef（包含featureInjector）
    const featureRef = this._featureRefs.get(featureName);
    if (featureRef) {
      featureRef.destroy();
    }

    // 销毁Feature
    if (feature.destroy) {
      await feature.destroy(this);
    }

    // 移除Feature和FeatureRef
    this._features.delete(featureName);
    this._featureRefs.delete(featureName);

    this.diDebugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.injector.getInjectorId(),
      metadata: {
        action: 'unloadFeature',
        appId: this.id,
        featureName
      }
    });
  }

  async reloadFeature(feature: ApplicationFeature): Promise<void> {
    if (this._destroyed) {
      throw new Error('Cannot reload feature on destroyed application');
    }

    const existingFeature = this._features.get(feature.name);

    // 如果Feature已存在，先卸载它
    if (existingFeature) {
      // 不直接调用unloadFeature，因为它会检查依赖
      // 重新加载允许保持依赖关系

      // 销毁现有FeatureRef
      const existingFeatureRef = this._featureRefs.get(feature.name);
      if (existingFeatureRef) {
        existingFeatureRef.destroy();
      }

      // 销毁现有Feature
      if (existingFeature.destroy) {
        await existingFeature.destroy(this);
      }

      // 从注册表中移除（但不检查依赖）
      this._features.delete(feature.name);
      this._featureRefs.delete(feature.name);

      this.diDebugger.logEvent({
        type: DebugEventType.PlatformEvent,
        injectorId: this.injector.getInjectorId(),
        metadata: {
          action: 'reloadFeature_unload',
          appId: this.id,
          featureName: feature.name,
          oldVersion: existingFeature.version
        }
      });
    }

    // 加载新Feature（重用loadFeature逻辑，但跳过重复检查）
    // 检查依赖（确保依赖的Features仍然存在）
    if (feature.dependencies) {
      for (const dep of feature.dependencies) {
        if (!this._features.has(dep)) {
          // 如果是重新加载，依赖检查失败时要恢复原有状态
          if (existingFeature) {
            this._features.set(feature.name, existingFeature);
            if (existingFeature.initialize) {
              await existingFeature.initialize(this);
            }
          }
          throw new Error(`Feature '${feature.name}' depends on '${dep}', but it is not loaded`);
        }
      }
    }

    // 创建新的FeatureRef实例（包含独立的featureInjector）
    const newFeatureRef = createFeatureRef(feature, this.injector);

    // 初始化新Feature
    if (feature.initialize) {
      try {
        await feature.initialize(this);
      } catch (error) {
        // 如果初始化失败且是重新加载，清理新创建的FeatureRef
        newFeatureRef.destroy();
        throw error;
      }
    }

    // 注册新Feature和FeatureRef
    this._features.set(feature.name, feature);
    this._featureRefs.set(feature.name, newFeatureRef);

    this.diDebugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.injector.getInjectorId(),
      metadata: {
        action: 'reloadFeature',
        appId: this.id,
        featureName: feature.name,
        newVersion: feature.version,
        isUpdate: !!existingFeature
      }
    });
  }

  async deleteFeature(featureName: string): Promise<void> {
    if (this._destroyed) {
      throw new Error('Cannot delete feature from destroyed application');
    }

    const feature = this._features.get(featureName);
    if (!feature) {
      return; // Feature不存在，忽略
    }

    // 检查是否有其他Feature依赖此Feature
    for (const [name, f] of this._features) {
      if (name !== featureName && f.dependencies?.includes(featureName)) {
        throw new Error(`Cannot delete feature '${featureName}' because '${name}' depends on it`);
      }
    }

    // 销毁FeatureRef（包含featureInjector）
    const featureRef = this._featureRefs.get(featureName);
    if (featureRef) {
      featureRef.destroy();
    }

    // 销毁Feature
    if (feature.destroy) {
      await feature.destroy(this);
    }

    // 删除Feature和FeatureRef
    this._features.delete(featureName);
    this._featureRefs.delete(featureName);

    this.diDebugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.injector.getInjectorId(),
      metadata: {
        action: 'deleteFeature',
        appId: this.id,
        featureName
      }
    });
  }

  getFeatureRef(featureName: string): FeatureRef | undefined {
    return this._featureRefs.get(featureName);
  }

  destroy(): void {
    if (this._destroyed) {
      return;
    }

    this._state = ApplicationState.DESTROYING;

    // 销毁所有FeatureRef实例（包含featureInjector）
    const featureRefs = Array.from(this._featureRefs.values());
    for (const featureRef of featureRefs) {
      try {
        featureRef.destroy();
      } catch (error) {
        console.error(`Error destroying featureRef ${featureRef.name}:`, error);
      }
    }

    // 销毁所有Features
    const features = Array.from(this._features.values());
    for (const feature of features) {
      try {
        if (feature.destroy) {
          feature.destroy(this);
        }
      } catch (error) {
        console.error(`Error destroying feature ${feature.name}:`, error);
      }
    }
    this._features.clear();
    this._featureRefs.clear();

    // 销毁注入器
    this.injector.destroy();

    // 从管理器中移除
    this.manager._removeApplication(this.id);

    this._destroyed = true;
    this._state = ApplicationState.DESTROYED;

    this.diDebugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.injector.getInjectorId(),
      metadata: {
        action: 'destroyApplication',
        appId: this.id
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
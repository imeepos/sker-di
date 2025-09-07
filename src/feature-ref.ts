import { EnvironmentInjector } from './environment-injector';
import { Provider } from './provider';
import { OnDestroy } from './lifecycle';
import { InjectionTokenType } from './injector';
import { ApplicationFeature } from './application-manager';
import { getDebugger, DebugEventType } from './debug';

/**
 * Feature状态枚举
 */
export enum FeatureState {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed'
}

/**
 * Feature引用接口
 * 管理单个Feature的生命周期和服务实例
 */
export interface FeatureRef extends OnDestroy {
  /** Feature名称 */
  readonly name: string;
  
  /** Feature版本 */
  readonly version?: string;
  
  /** Feature状态 */
  readonly state: FeatureState;
  
  /** Feature注入器 */
  readonly injector: EnvironmentInjector;
  
  /** Feature是否已销毁 */
  readonly isDestroyed: boolean;
  
  /** Feature依赖列表 */
  readonly dependencies: ReadonlyArray<string>;
  
  /** Feature配置 */
  readonly feature: ApplicationFeature;
  
  /**
   * 获取服务实例
   * @param token 服务令牌
   */
  get<T>(token: InjectionTokenType<T>): T;
  
  /**
   * 销毁Feature
   */
  destroy(): void;
}

/**
 * 默认Feature引用实现
 */
export class DefaultFeatureRef implements FeatureRef {
  private _state: FeatureState = FeatureState.INITIALIZING;
  private _destroyed = false;
  private readonly debugger = getDebugger();

  constructor(
    public readonly feature: ApplicationFeature,
    public readonly injector: EnvironmentInjector
  ) {
    this._state = FeatureState.ACTIVE;
  }

  get name(): string {
    return this.feature.name;
  }

  get version(): string | undefined {
    return this.feature.version;
  }

  get state(): FeatureState {
    return this._state;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }

  get dependencies(): ReadonlyArray<string> {
    return this.feature.dependencies || [];
  }

  get<T>(token: InjectionTokenType<T>): T {
    if (this._destroyed) {
      throw new Error(`Cannot get service from destroyed feature '${this.name}'`);
    }

    try {
      const instance = this.injector.get(token);
      
      this.debugger.logEvent({
        type: DebugEventType.FeatureEvent,
        injectorId: this.injector.getInjectorId(),
        metadata: {
          action: 'getService',
          featureName: this.name,
          serviceName: typeof token === 'string' ? token : (token as any).name || 'Unknown'
        }
      });

      return instance;
    } catch (error) {
      this.debugger.logEvent({
        type: DebugEventType.FeatureEvent,
        injectorId: this.injector.getInjectorId(),
        metadata: {
          action: 'getServiceFailed',
          featureName: this.name,
          serviceName: typeof token === 'string' ? token : (token as any).name || 'Unknown',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  destroy(): void {
    if (this._destroyed) {
      return;
    }

    this._state = FeatureState.DESTROYING;

    // 调用Feature的销毁钩子（如果存在）
    try {
      if (this.feature.destroy) {
        // 这里需要ApplicationRef，但我们在Feature层级，暂时跳过
        // 实际使用中应该通过应用管理器调用
        console.warn(`Feature '${this.name}' destroy hook needs ApplicationRef context`);
      }
    } catch (error) {
      console.error(`Error calling destroy hook for feature '${this.name}':`, error);
    }

    // 销毁Feature注入器
    this.injector.destroy();

    this._destroyed = true;
    this._state = FeatureState.DESTROYED;

    this.debugger.logEvent({
      type: DebugEventType.FeatureEvent,
      injectorId: this.injector.getInjectorId(),
      metadata: {
        action: 'destroy',
        featureName: this.name
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}

/**
 * Feature工厂函数
 * 创建具有独立作用域的Feature实例
 */
export function createFeatureRef(
  feature: ApplicationFeature,
  applicationInjector: EnvironmentInjector
): FeatureRef {
  // 为Feature创建独立的注入器，以实现作用域隔离
  const featureProviders = feature.providers || [];
  const featureInjector = new EnvironmentInjector(
    featureProviders,
    applicationInjector,
    'feature'
  );

  return new DefaultFeatureRef(feature, featureInjector);
}
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';
import { EnvironmentInjector } from './environment-injector';
import { NullInjector } from './null-injector';
import { Provider } from './provider';

/**
 * 注入器注册表接口
 * 管理系统中所有注入器的生命周期
 */
export interface IInjectorRegistry {
  /**
   * 获取根注入器
   */
  getRootInjector(): EnvironmentInjector | null;

  /**
   * 创建根注入器
   */
  createRootInjector(providers?: Provider[]): EnvironmentInjector;

  /**
   * 重置根注入器
   */
  resetRootInjector(): void;

  /**
   * 获取平台注入器
   */
  getPlatformInjector(): EnvironmentInjector | null;

  /**
   * 创建平台注入器
   */
  createPlatformInjector(providers?: Provider[]): EnvironmentInjector;

  /**
   * 重置平台注入器
   */
  resetPlatformInjector(): void;

  /**
   * 创建应用注入器
   */
  createApplicationInjector(providers?: Provider[]): EnvironmentInjector;

  /**
   * 创建功能注入器
   */
  createFeatureInjector(providers: Provider[], parentInjector: EnvironmentInjector): EnvironmentInjector;

  /**
   * 销毁所有注入器
   */
  destroyAll(): void;
}

/**
 * 注入器注册表令牌
 */
export const INJECTOR_REGISTRY = new InjectionToken<IInjectorRegistry>('INJECTOR_REGISTRY');

/**
 * 注入器注册表实现
 * 取代静态单例模式，采用DI方式管理注入器
 */
@Injectable({ providedIn: 'root' })
export class InjectorRegistry implements IInjectorRegistry {
  private rootInjector: EnvironmentInjector | null = null;
  private platformInjector: EnvironmentInjector | null = null;

  getRootInjector(): EnvironmentInjector | null {
    if (this.rootInjector && (this.rootInjector as any).isDestroyed) {
      // 如果根注入器已销毁，自动清理引用
      this.rootInjector = null;
      this.platformInjector = null; // 同时清理平台注入器引用
    }
    return this.rootInjector;
  }

  createRootInjector(providers: Provider[] = []): EnvironmentInjector {
    if (this.rootInjector) {
      throw new Error('Root injector already exists. Call resetRootInjector() first to recreate it.');
    }

    this.rootInjector = new EnvironmentInjector(providers, new NullInjector(), 'root');
    return this.rootInjector;
  }

  resetRootInjector(): void {
    if (this.rootInjector) {
      this.rootInjector.destroy();
      this.rootInjector = null;
    }
    
    // 重置根注入器时也要重置平台注入器
    this.resetPlatformInjector();
  }

  getPlatformInjector(): EnvironmentInjector | null {
    if (this.platformInjector && (this.platformInjector as any).isDestroyed) {
      // 如果平台注入器已销毁，自动清理引用
      this.platformInjector = null;
    }
    return this.platformInjector;
  }

  createPlatformInjector(providers: Provider[] = []): EnvironmentInjector {
    if (this.platformInjector && !(this.platformInjector as any).isDestroyed) {
      throw new Error('Platform injector already exists. Call resetPlatformInjector() first to recreate it.');
    }

    // 确保根注入器存在
    const rootInjector = this.rootInjector;
    if (!rootInjector) {
      // 自动创建根注入器
      this.createRootInjector();
    }

    this.platformInjector = new EnvironmentInjector(
      [
        // 平台注入器自动提供自己
        { provide: INJECTOR_REGISTRY, useValue: this },
        ...providers
      ],
      this.rootInjector!,
      'platform'
    );

    return this.platformInjector;
  }

  resetPlatformInjector(): void {
    if (this.platformInjector) {
      this.platformInjector.destroy();
      this.platformInjector = null;
    }
  }

  createApplicationInjector(providers: Provider[] = []): EnvironmentInjector {
    const platformInjector = this.getPlatformInjector();
    if (!platformInjector) {
      throw new Error('Platform injector must be created before application injector');
    }

    return new EnvironmentInjector(providers, platformInjector, 'application');
  }

  createFeatureInjector(providers: Provider[], parentInjector: EnvironmentInjector): EnvironmentInjector {
    return new EnvironmentInjector(providers, parentInjector, 'feature');
  }

  destroyAll(): void {
    this.resetRootInjector();
    // resetRootInjector() 会自动重置平台注入器
  }
}
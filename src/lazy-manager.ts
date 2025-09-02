import { InjectionTokenType } from './injector';
import { LazyClassProvider, LazyFactoryProvider } from './provider';

/**
 * @fileoverview 延迟初始化管理器
 * 提供延迟加载功能，实例只在首次访问时创建，提高应用启动性能
 */

/**
 * 延迟初始化项，包含创建实例的函数和是否已初始化的状态
 */
interface LazyItem<T> {
  factory: () => T;
  initialized: boolean;
  instance?: T;
  isMulti?: boolean;
}

/**
 * 延迟初始化管理器
 * 负责管理延迟提供者的实例化状态和实例缓存
 */
export class LazyManager {
  private readonly lazyItems = new Map<any, LazyItem<any>[]>();

  /**
   * 注册延迟类提供者
   */
  registerLazyClass<T>(token: InjectionTokenType<T>, provider: LazyClassProvider<T>, createWithDI: (ctor: new (...args: any[]) => T) => T): void {
    const factory = () => createWithDI(provider.useLazyClass);
    const existing = this.lazyItems.get(token) || [];
    this.lazyItems.set(token, [...existing, {
      factory,
      initialized: false,
      isMulti: provider.multi
    }]);
  }

  /**
   * 注册延迟工厂提供者
   */
  registerLazyFactory<T>(token: InjectionTokenType<T>, provider: LazyFactoryProvider<T>, resolveDepsWithContext: (token: any, deps: any[]) => any[]): void {
    const factory = () => {
      const deps = resolveDepsWithContext(token, provider.deps || []);
      return provider.useLazyFactory(...deps);
    };
    const existing = this.lazyItems.get(token) || [];
    this.lazyItems.set(token, [...existing, {
      factory,
      initialized: false,
      isMulti: provider.multi
    }]);
  }

  /**
   * 获取延迟初始化的实例
   */
  getLazyInstance<T>(token: InjectionTokenType<T>): T {
    const lazyItems = this.lazyItems.get(token);
    if (!lazyItems || lazyItems.length === 0) {
      throw new Error('延迟提供者未注册');
    }

    // 检查是否为多值提供者
    const isMulti = lazyItems.some(item => item.isMulti);
    
    if (isMulti) {
      // 多值提供者：返回所有实例的数组
      const instances = lazyItems.map(lazyItem => {
        if (!lazyItem.initialized) {
          lazyItem.instance = lazyItem.factory();
          lazyItem.initialized = true;
        }
        return lazyItem.instance;
      });
      return instances as any;
    } else {
      // 单值提供者：使用最后注册的提供者（覆盖逻辑）
      const lazyItem = lazyItems[lazyItems.length - 1];
      if (!lazyItem.initialized) {
        lazyItem.instance = lazyItem.factory();
        lazyItem.initialized = true;
      }
      return lazyItem.instance;
    }
  }

  /**
   * 检查令牌是否为延迟提供者
   */
  isLazyProvider(token: any): boolean {
    return this.lazyItems.has(token);
  }

  /**
   * 检查延迟提供者是否已初始化
   */
  isInitialized(token: any): boolean {
    const lazyItems = this.lazyItems.get(token);
    return lazyItems?.some(item => item.initialized) || false;
  }

  /**
   * 获取所有已初始化的实例，用于生命周期管理
   */
  getInitializedInstances(): any[] {
    const instances: any[] = [];
    for (const lazyItems of this.lazyItems.values()) {
      for (const lazyItem of lazyItems) {
        if (lazyItem.initialized && lazyItem.instance) {
          if (Array.isArray(lazyItem.instance)) {
            instances.push(...lazyItem.instance);
          } else {
            instances.push(lazyItem.instance);
          }
        }
      }
    }
    return instances;
  }

  /**
   * 清理所有延迟项
   */
  clear(): void {
    this.lazyItems.clear();
  }
}
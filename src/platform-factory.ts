import { PlatformRef, PlatformFactory, PlatformModule, PlatformConfig, PlatformExtension } from './platform-ref';
import { ApplicationRef } from './application-manager';
import { EnvironmentInjector } from './environment-injector';
import { Provider } from './provider';
import { IDIDebugger, DI_DEBUGGER, DebugEventType, DIDebugger } from './debug';
import { APPLICATION_CONFIG, APPLICATION_BOOTSTRAP_CONTEXT, BaseApplicationConfig, ApplicationBootstrapContext } from './application-config';
import { ApplicationManager, ApplicationFeature } from './application-manager';
import { IPlatformManager, PLATFORM_MANAGER, PlatformManager } from './platform-manager';
import { IInjectorRegistry, INJECTOR_REGISTRY, InjectorRegistry } from './injector-registry';

// 全局注入器注册表实例，确保跨平台工厂调用的一致性
let globalInjectorRegistry: IInjectorRegistry | null = null;

/**
 * 具体的平台实现
 */
class Platform extends PlatformRef {
  private _destroyed = false;
  private readonly debugger: IDIDebugger;
  private readonly extensions: PlatformExtension[] = [];
  private readonly applicationManager: ApplicationManager;
  private readonly platformManager: IPlatformManager;
  private readonly injectorRegistry: IInjectorRegistry;

  constructor(
    public readonly injector: EnvironmentInjector,
    public readonly config: PlatformConfig,
    extensions: PlatformExtension[] = [],
    platformManager: IPlatformManager,
    injectorRegistry: IInjectorRegistry
  ) {
    super();
    this.extensions = extensions;
    this.platformManager = platformManager;
    this.injectorRegistry = injectorRegistry;
    // 从注入器获取调试器
    this.debugger = this.injector.get(DI_DEBUGGER);
    this.applicationManager = this.injector.get(ApplicationManager);
    
    // 将自己注册到平台管理器
    this.platformManager.setPlatform(this);
    
    this.initializeExtensions();
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  get applications(): ReadonlyMap<string, ApplicationRef<any>> {
    const apps = this.applicationManager.getApplications();
    const map = new Map<string, ApplicationRef<any>>();
    for (const app of apps) {
      map.set(app.id, app);
    }
    return map;
  }

  async bootstrapApplication(
    providersOrAppId?: Provider[] | string, 
    providersOrOptions?: Provider[],
    features?: ApplicationFeature[]
  ): Promise<ApplicationRef> {
    if (this._destroyed) {
      throw new Error('Cannot bootstrap application on destroyed platform');
    }

    let appId: string;
    let providers: Provider[] = [];
    let appFeatures: ApplicationFeature[] = features || [];

    // 处理参数重载
    if (typeof providersOrAppId === 'string') {
      // 新方式：bootstrapApplication(appId, providers, features)
      appId = providersOrAppId;
      if (Array.isArray(providersOrOptions)) {
        providers = providersOrOptions;
      }
      
      // 检查并添加默认APPLICATION_CONFIG（如果没有提供的话）
      const hasApplicationConfig = providers.some(provider => 
        ('provide' in provider) && (
          provider.provide === APPLICATION_CONFIG || 
          provider.provide === APPLICATION_BOOTSTRAP_CONTEXT
        )
      );
      
      if (!hasApplicationConfig) {
        providers.push(
          { provide: APPLICATION_CONFIG, useValue: { name: appId } },
          {
            provide: APPLICATION_BOOTSTRAP_CONTEXT,
            useValue: {
              bootstrapTime: Date.now(),
              platformName: this.config.name,
              environment: typeof process !== 'undefined' ? process.env : {}
            } as ApplicationBootstrapContext
          }
        );
      }
    } else {
      // 兼容旧方式：bootstrapApplication(providers)
      providers = providersOrAppId || [];
      
      // 生成应用ID
      let appName: string;
      const hasApplicationConfig = providers.some(provider => 
        ('provide' in provider) && (
          provider.provide === APPLICATION_CONFIG || 
          provider.provide === APPLICATION_BOOTSTRAP_CONTEXT
        )
      );

      if (hasApplicationConfig) {
        const tempInjector = this.createApplicationInjector(providers);
        try {
          const appConfig = tempInjector.get(APPLICATION_CONFIG);
          appName = appConfig?.name || `app-${Date.now()}`;
        } catch {
          appName = `app-${Date.now()}`;
        }
      } else {
        appName = `app-${Date.now()}`;
        providers.push(
          { provide: APPLICATION_CONFIG, useValue: { name: appName } },
          {
            provide: APPLICATION_BOOTSTRAP_CONTEXT,
            useValue: {
              bootstrapTime: Date.now(),
              platformName: this.config.name,
              environment: typeof process !== 'undefined' ? process.env : {}
            } as ApplicationBootstrapContext
          }
        );
      }
      
      appId = appName;
    }

    // 确保启动上下文包含正确的平台名称
    const contextProviderIndex = providers.findIndex(p => ('provide' in p) && p.provide === APPLICATION_BOOTSTRAP_CONTEXT);
    if (contextProviderIndex >= 0) {
      providers[contextProviderIndex] = {
        provide: APPLICATION_BOOTSTRAP_CONTEXT,
        useValue: {
          bootstrapTime: Date.now(),
          platformName: this.config.name,
          environment: typeof process !== 'undefined' ? process.env : {}
        } as ApplicationBootstrapContext
      };
    }

    // 使用ApplicationManager创建应用
    return await this.applicationManager.createApplication(appId, providers, appFeatures);
  }

  createApplicationInjector(providers: Provider[] = []): EnvironmentInjector {
    return this.injectorRegistry.createApplicationInjector(providers);
  }

  /**
   * 获取应用
   */
  getApplication<T = any>(id: string): ApplicationRef<T> | undefined {
    return this.applicationManager.getApplication<T>(id);
  }

  /**
   * 获取所有应用
   */
  getApplications(): ApplicationRef[] {
    return this.applicationManager.getApplications();
  }

  /**
   * 获取所有应用ID
   */
  getApplicationIds(): string[] {
    return this.applicationManager.getApplicationIds();
  }

  /**
   * 销毁应用
   */
  async destroyApplication(id: string): Promise<boolean> {
    return await this.applicationManager.destroyApplication(id);
  }

  /**
   * 重新加载应用
   */
  async reloadApplication(id: string, providers?: Provider[], features?: ApplicationFeature[]): Promise<ApplicationRef> {
    if (this._destroyed) {
      throw new Error('Cannot reload application on destroyed platform');
    }

    const existingApp = this.applicationManager.getApplication(id);
    if (!existingApp) {
      throw new Error(`Application with id '${id}' does not exist`);
    }

    // 保存现有应用的配置
    const oldAppConfig = {
      name: existingApp.name,
      state: existingApp.state,
      loadedFeatures: Array.from(existingApp.features.values())
    };

    // 销毁现有应用
    await this.applicationManager.destroyApplication(id);

    // 使用相同ID重新创建应用
    try {
      const newProviders = providers || [];
      const newFeatures = features || oldAppConfig.loadedFeatures;
      
      // 确保有APPLICATION_CONFIG配置
      const hasApplicationConfig = newProviders.some(provider => 
        ('provide' in provider) && (
          provider.provide === APPLICATION_CONFIG || 
          provider.provide === APPLICATION_BOOTSTRAP_CONTEXT
        )
      );
      
      if (!hasApplicationConfig) {
        newProviders.push(
          { provide: APPLICATION_CONFIG, useValue: { name: oldAppConfig.name } },
          {
            provide: APPLICATION_BOOTSTRAP_CONTEXT,
            useValue: {
              bootstrapTime: Date.now(),
              platformName: this.config.name,
              environment: typeof process !== 'undefined' ? process.env : {}
            } as ApplicationBootstrapContext
          }
        );
      }
      
      return await this.applicationManager.createApplication(id, newProviders, newFeatures);
    } catch (error) {
      // 如果重新创建失败，尝试恢复原应用（使用旧Features）
      try {
        const restoreProviders = [
          { provide: APPLICATION_CONFIG, useValue: { name: oldAppConfig.name } },
          {
            provide: APPLICATION_BOOTSTRAP_CONTEXT,
            useValue: {
              bootstrapTime: Date.now(),
              platformName: this.config.name,
              environment: typeof process !== 'undefined' ? process.env : {}
            } as ApplicationBootstrapContext
          }
        ];
        await this.applicationManager.createApplication(id, restoreProviders, oldAppConfig.loadedFeatures);
      } catch (restoreError) {
        console.error(`Failed to restore application '${id}' after reload failure:`, restoreError);
      }
      throw error;
    }
  }

  destroy(): void {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;

    // 销毁所有应用
    this.applicationManager.destroy();

    // 销毁扩展
    this.destroyExtensions();

    // 调试日志
    this.debugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.injector.getInjectorId(),
      metadata: {
        action: 'destroy',
        platformName: this.config.name
      }
    });

    // 销毁注入器
    this.injector.destroy();

    // 清除平台管理器中的当前平台
    this.platformManager.clearPlatform();
  }

  private async initializeExtensions(): Promise<void> {
    for (const extension of this.extensions) {
      try {
        if (extension.initialize) {
          await extension.initialize(this);
        }
      } catch (error) {
        console.error(`Failed to initialize extension ${extension.name}:`, error);
      }
    }
  }

  private async destroyExtensions(): Promise<void> {
    for (const extension of this.extensions) {
      try {
        if (extension.destroy) {
          await extension.destroy(this);
        }
      } catch (error) {
        console.error(`Failed to destroy extension ${extension.name}:`, error);
      }
    }
  }
}

// GlobalPlatform 单例已移除，使用 PlatformManager 服务进行 DI 管理

/**
 * 创建平台工厂函数
 * 
 * @param parentFactory 父平台工厂（可选）
 * @param module 平台模块配置
 * @returns 平台工厂函数
 * 
 * @example
 * ```typescript
 * // 创建基础平台
 * const corePlatform = createPlatformFactory(null, {
 *   config: { name: 'core', version: '1.0.0' },
 *   providers: [
 *     { provide: 'CORE_SERVICE', useClass: CoreService }
 *   ]
 * });
 * 
 * // 创建扩展平台
 * const webPlatform = createPlatformFactory(corePlatform, {
 *   config: { name: 'web', version: '1.0.0' },
 *   providers: [
 *     { provide: 'DOM_SERVICE', useClass: DomService }
 *   ],
 *   extensions: [
 *     {
 *       name: 'router',
 *       providers: [{ provide: 'ROUTER', useClass: Router }]
 *     }
 *   ]
 * });
 * 
 * // 使用平台
 * const platform = webPlatform();
 * const app = await platform.bootstrapApplication([
 *   { provide: 'APP_CONFIG', useValue: { debug: true } }
 * ]);
 * ```
 */
export function createPlatformFactory(
  parentFactory: PlatformFactory | null,
  module: PlatformModule
): PlatformFactory {
  return function platformFactory(extraProviders: Provider[] = []): PlatformRef {
    // 先确保全局注入器注册表存在
    let injectorRegistry: IInjectorRegistry;
    
    if (!globalInjectorRegistry) {
      const tempRoot = new EnvironmentInjector([
        { provide: INJECTOR_REGISTRY, useClass: InjectorRegistry },
        { provide: PLATFORM_MANAGER, useClass: PlatformManager }
      ], undefined, 'root');
      globalInjectorRegistry = tempRoot.get(INJECTOR_REGISTRY);
    }
    
    // 检查全局注入器注册表的根注入器是否已销毁
    const rootInjector = globalInjectorRegistry.getRootInjector();
    if (rootInjector && (rootInjector as any).isDestroyed) {
      // 如果根注入器已销毁，重新创建全局注入器注册表
      const tempRoot = new EnvironmentInjector([
        { provide: INJECTOR_REGISTRY, useClass: InjectorRegistry },
        { provide: PLATFORM_MANAGER, useClass: PlatformManager }
      ], undefined, 'root');
      globalInjectorRegistry = tempRoot.get(INJECTOR_REGISTRY);
    }
    
    injectorRegistry = globalInjectorRegistry;
    
    // 合并提供者，包含核心DI管理服务
    let allProviders: Provider[] = [
      // 核心DI管理服务
      { provide: DI_DEBUGGER, useClass: DIDebugger },
      { provide: ApplicationManager, useClass: ApplicationManager },
      { provide: PLATFORM_MANAGER, useClass: PlatformManager },
      { provide: INJECTOR_REGISTRY, useValue: injectorRegistry }, // 使用全局实例
      ...module.providers
    ];
    
    // 如果有父平台工厂，创建父平台并合并其提供者
    let parentInjector: EnvironmentInjector | undefined;
    if (parentFactory) {
      const parentPlatform = parentFactory();
      parentInjector = parentPlatform.injector;
    }

    // 合并扩展提供者
    if (module.extensions) {
      for (const extension of module.extensions) {
        if (extension.providers) {
          allProviders.push(...extension.providers);
        }
      }
    }

    // 添加额外提供者
    allProviders.push(...extraProviders);

    // 获取或创建注入器注册表实例
    let platformInjector: EnvironmentInjector;
    
    if (parentInjector) {
      // 如果有父注入器，直接创建子平台注入器
      platformInjector = new EnvironmentInjector(allProviders, parentInjector, 'platform');
      injectorRegistry = platformInjector.get(INJECTOR_REGISTRY);
    } else {
      // 使用预先初始化的全局注入器注册表
      
      // 检查是否已有平台注入器
      const existingPlatformInjector = injectorRegistry.getPlatformInjector();
      if (existingPlatformInjector && !(existingPlatformInjector as any).isDestroyed) {
        platformInjector = existingPlatformInjector;
      } else {
        // 创建根注入器和平台注入器
        if (!injectorRegistry.getRootInjector()) {
          injectorRegistry.createRootInjector();
        }
        platformInjector = injectorRegistry.createPlatformInjector(allProviders);
      }
    }

    // 获取平台管理器
    const platformManager = platformInjector.get(PLATFORM_MANAGER);
    
    // 检查是否已存在平台实例
    if (platformManager.hasPlatform()) {
      const existingPlatform = platformManager.getCurrentPlatform()!;
      console.warn('Platform already exists. Returning existing platform instance.');
      return existingPlatform;
    }

    // 创建平台实例
    const platform = new Platform(
      platformInjector,
      module.config,
      module.extensions || [],
      platformManager,
      injectorRegistry
    );

    return platform;
  };
}

// 移除全局函数，请使用 PlatformManager 服务
// 这些函数违反了 "一切皆服务，一切皆可注入" 原则
// 请通过依赖注入获取 PlatformManager 来管理平台

// 模块卸载时的清理由 PlatformManager 服务管理
// 不再使用全局函数进行平台清理

/**
 * 重置全局注入器注册表（用于测试）
 * @internal
 */
export function resetGlobalInjectorRegistry(): void {
  globalInjectorRegistry = null;
}
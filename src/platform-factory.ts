import { PlatformRef, PlatformFactory, PlatformModule, PlatformConfig, ApplicationRef, DefaultApplicationRef, PlatformExtension } from './platform-ref';
import { EnvironmentInjector } from './environment-injector';
import { Provider } from './provider';
import { getDebugger, DebugEventType } from './debug';

/**
 * 具体的平台实现
 */
class Platform extends PlatformRef {
  private _destroyed = false;
  private readonly debugger = getDebugger();
  private readonly extensions: PlatformExtension[] = [];

  constructor(
    public readonly injector: EnvironmentInjector,
    public readonly config: PlatformConfig,
    extensions: PlatformExtension[] = []
  ) {
    super();
    this.extensions = extensions;
    this.initializeExtensions();
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  async bootstrapApplication(providers: Provider[] = [], options: any = {}): Promise<ApplicationRef> {
    if (this._destroyed) {
      throw new Error('Cannot bootstrap application on destroyed platform');
    }

    // 创建应用注入器
    const appInjector = this.createApplicationInjector(providers);
    
    // 创建应用引用
    const appRef = new DefaultApplicationRef(appInjector, this);
    
    // 注册应用
    const appName = options.name || `app-${Date.now()}`;
    this.applications.set(appName, appRef);

    // 调试日志
    this.debugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.injector.getInjectorId(),
      metadata: {
        action: 'bootstrapApplication',
        appName,
        providersCount: providers.length
      }
    });

    return appRef;
  }

  createApplicationInjector(providers: Provider[] = []): EnvironmentInjector {
    return EnvironmentInjector.createApplicationInjector(providers);
  }

  destroy(): void {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;

    // 销毁扩展
    this.destroyExtensions();

    // 调用父类销毁逻辑
    super.destroy();

    // 调试日志
    this.debugger.logEvent({
      type: DebugEventType.PlatformEvent,
      injectorId: this.injector.getInjectorId(),
      metadata: {
        action: 'destroy',
        platformName: this.config.name
      }
    });
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

/**
 * 全局平台注册表
 */
class PlatformRegistry {
  private static platforms = new Map<string, PlatformRef>();
  private static defaultPlatform: PlatformRef | null = null;

  /**
   * 注册平台
   */
  static register(name: string, platform: PlatformRef): void {
    if (this.platforms.has(name)) {
      throw new Error(`Platform ${name} already registered`);
    }
    this.platforms.set(name, platform);
  }

  /**
   * 获取平台
   */
  static get(name: string): PlatformRef | undefined {
    return this.platforms.get(name);
  }

  /**
   * 获取默认平台
   */
  static getDefault(): PlatformRef | null {
    return this.defaultPlatform;
  }

  /**
   * 设置默认平台
   */
  static setDefault(platform: PlatformRef): void {
    this.defaultPlatform = platform;
  }

  /**
   * 销毁平台
   */
  static destroy(name: string): boolean {
    const platform = this.platforms.get(name);
    if (platform) {
      platform.destroy();
      this.platforms.delete(name);
      if (this.defaultPlatform === platform) {
        this.defaultPlatform = null;
      }
      return true;
    }
    return false;
  }

  /**
   * 销毁所有平台
   */
  static destroyAll(): void {
    for (const [name, platform] of this.platforms) {
      platform.destroy();
    }
    this.platforms.clear();
    this.defaultPlatform = null;
  }

  /**
   * 获取所有平台名称
   */
  static getNames(): string[] {
    return Array.from(this.platforms.keys());
  }
}

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
    // 检查是否已存在同名平台
    const existingPlatform = PlatformRegistry.get(module.config.name);
    if (existingPlatform && !existingPlatform.destroyed) {
      return existingPlatform;
    }

    // 合并提供者
    let allProviders: Provider[] = [...module.providers];
    
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

    // 创建平台注入器
    let platformInjector: EnvironmentInjector;
    
    if (parentInjector) {
      // 如果有父注入器，直接创建子平台注入器
      platformInjector = new EnvironmentInjector(allProviders, parentInjector, 'platform');
    } else {
      // 如果没有父注入器，首先确保根注入器存在
      let rootInjector = EnvironmentInjector.getRootInjector();
      if (!rootInjector) {
        // 自动创建根注入器
        rootInjector = EnvironmentInjector.createRootInjector();
      }
      
      // 然后创建平台注入器
      platformInjector = EnvironmentInjector.createPlatformInjector(allProviders);
    }

    // 创建平台实例
    const platform = new Platform(
      platformInjector,
      module.config,
      module.extensions || []
    );

    // 注册平台
    PlatformRegistry.register(module.config.name, platform);

    // 如果这是第一个平台，设置为默认平台
    if (!PlatformRegistry.getDefault()) {
      PlatformRegistry.setDefault(platform);
    }

    return platform;
  };
}

/**
 * 获取平台
 * @param name 平台名称，如果不提供则返回默认平台
 */
export function getPlatform(name?: string): PlatformRef | null {
  if (name) {
    return PlatformRegistry.get(name) || null;
  }
  return PlatformRegistry.getDefault();
}

/**
 * 销毁平台
 * @param name 平台名称，如果不提供则销毁默认平台
 */
export function destroyPlatform(name?: string): boolean {
  if (name) {
    return PlatformRegistry.destroy(name);
  }
  
  const defaultPlatform = PlatformRegistry.getDefault();
  if (defaultPlatform) {
    // 找到默认平台的名称并销毁
    for (const [platformName, platform] of (PlatformRegistry as any).platforms) {
      if (platform === defaultPlatform) {
        return PlatformRegistry.destroy(platformName);
      }
    }
  }
  return false;
}

/**
 * 获取所有已注册的平台名称
 */
export function getPlatformNames(): string[] {
  return PlatformRegistry.getNames();
}

/**
 * 销毁所有平台
 */
export function destroyAllPlatforms(): void {
  PlatformRegistry.destroyAll();
}

// 在模块卸载时清理所有平台
if (typeof process !== 'undefined' && process.on) {
  process.on('exit', () => {
    PlatformRegistry.destroyAll();
  });
}
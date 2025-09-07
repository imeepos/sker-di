import { PlatformExtension, PlatformRef } from './platform-ref';
import { Provider } from './provider';
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';

/**
 * 扩展配置接口
 */
export interface ExtensionConfig {
  /** 扩展名称 */
  name: string;
  /** 扩展版本 */
  version?: string;
  /** 扩展描述 */
  description?: string;
  /** 依赖的其他扩展 */
  dependencies?: string[];
  /** 扩展配置 */
  config?: Record<string, any>;
}

/**
 * 扩展注册表
 */
class ExtensionRegistry {
  private static extensions = new Map<string, PlatformExtension>();
  private static configs = new Map<string, ExtensionConfig>();

  /**
   * 注册扩展
   */
  static register(extension: PlatformExtension, config?: ExtensionConfig): void {
    if (this.extensions.has(extension.name)) {
      throw new Error(`Extension ${extension.name} already registered`);
    }

    this.extensions.set(extension.name, extension);
    if (config) {
      this.configs.set(extension.name, config);
    }
  }

  /**
   * 获取扩展
   */
  static get(name: string): PlatformExtension | undefined {
    return this.extensions.get(name);
  }

  /**
   * 获取扩展配置
   */
  static getConfig(name: string): ExtensionConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * 获取所有扩展
   */
  static getAll(): PlatformExtension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * 检查扩展是否存在
   */
  static has(name: string): boolean {
    return this.extensions.has(name);
  }

  /**
   * 解析扩展依赖
   */
  static resolveDependencies(extensionNames: string[]): PlatformExtension[] {
    const resolved: PlatformExtension[] = [];
    const resolving = new Set<string>();
    const visited = new Set<string>();

    const resolve = (name: string) => {
      if (visited.has(name)) {
        return;
      }
      if (resolving.has(name)) {
        throw new Error(`Circular extension dependency: ${name}`);
      }

      const config = this.getConfig(name);
      if (config?.dependencies) {
        resolving.add(name);
        for (const dep of config.dependencies) {
          resolve(dep);
        }
        resolving.delete(name);
      }

      const extension = this.get(name);
      if (extension) {
        resolved.push(extension);
      }
      visited.add(name);
    };

    for (const name of extensionNames) {
      resolve(name);
    }

    return resolved;
  }
}

// ============================================================================
// 内置扩展定义
// ============================================================================

/**
 * 日志扩展令牌
 */
export const LOGGER_CONFIG = new InjectionToken<LoggerConfig>('LOGGER_CONFIG');

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableColors?: boolean;
  enableTimestamp?: boolean;
}

@Injectable({ providedIn: 'platform' })
export class Logger {
  constructor() {}

  debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}

/**
 * 日志扩展
 */
export const LoggerExtension: PlatformExtension = {
  name: 'logger',
  providers: [
    { provide: Logger, useClass: Logger },
    { provide: LOGGER_CONFIG, useValue: { level: 'info', enableColors: true } }
  ],
  initialize: async (platform: PlatformRef) => {
    const logger = platform.injector.get(Logger);
    const config = platform.injector.get(LOGGER_CONFIG);
    logger.info(`Logger extension initialized with level: ${config.level}`);
  }
};

/**
 * HTTP客户端配置
 */
export const HTTP_CONFIG = new InjectionToken<HttpConfig>('HTTP_CONFIG');

export interface HttpConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

@Injectable({ providedIn: 'platform' })
export class HttpClient {
  constructor() {}

  async get(url: string, options?: any): Promise<any> {
    // 简化的HTTP客户端实现
    console.log(`HTTP GET: ${url}`, options);
    return { data: 'mock response' };
  }

  async post(url: string, data?: any, options?: any): Promise<any> {
    console.log(`HTTP POST: ${url}`, data, options);
    return { data: 'mock response' };
  }
}

/**
 * HTTP扩展
 */
export const HttpExtension: PlatformExtension = {
  name: 'http',
  providers: [
    { provide: HttpClient, useClass: HttpClient },
    { provide: HTTP_CONFIG, useValue: { timeout: 5000 } }
  ],
  initialize: async (platform: PlatformRef) => {
    const http = platform.injector.get(HttpClient);
    const config = platform.injector.get(HTTP_CONFIG);
    console.log('HTTP extension initialized with config:', config);
  }
};

/**
 * 存储服务配置
 */
export const STORAGE_CONFIG = new InjectionToken<StorageConfig>('STORAGE_CONFIG');

export interface StorageConfig {
  type: 'memory' | 'localStorage' | 'sessionStorage';
  prefix?: string;
}

@Injectable({ providedIn: 'platform' })
export class StorageService {
  constructor() {}

  get(key: string): string | null {
    // 简化的存储实现
    return `mock-value-${key}`;
  }

  set(key: string, value: string): void {
    console.log(`Storage SET: ${key} = ${value}`);
  }

  remove(key: string): void {
    console.log(`Storage REMOVE: ${key}`);
  }
}

/**
 * 存储扩展
 */
export const StorageExtension: PlatformExtension = {
  name: 'storage',
  providers: [
    { provide: StorageService, useClass: StorageService },
    { provide: STORAGE_CONFIG, useValue: { type: 'memory', prefix: 'app-' } }
  ],
  initialize: async (platform: PlatformRef) => {
    const storage = platform.injector.get(StorageService);
    const config = platform.injector.get(STORAGE_CONFIG);
    console.log(`Storage extension initialized with type: ${config.type}`);
  }
};

/**
 * 路由器配置
 */
export const ROUTER_CONFIG = new InjectionToken<RouterConfig>('ROUTER_CONFIG');

export interface RouterConfig {
  enableTracing?: boolean;
  useHash?: boolean;
}

@Injectable({ providedIn: 'platform' })
export class Router {
  constructor() {}

  navigate(path: string): void {
    console.log(`Router navigate to: ${path}`);
  }

  getCurrentPath(): string {
    return '/current-path';
  }
}

/**
 * 路由扩展
 */
export const RouterExtension: PlatformExtension = {
  name: 'router',
  providers: [
    { provide: Router, useClass: Router },
    { provide: ROUTER_CONFIG, useValue: { enableTracing: false } }
  ],
  initialize: async (platform: PlatformRef) => {
    const router = platform.injector.get(Router);
    const config = platform.injector.get(ROUTER_CONFIG);
    console.log('Router extension initialized with config:', config);
  }
};

// ============================================================================
// 扩展管理器
// ============================================================================

/**
 * 扩展管理器
 * 负责管理平台扩展的生命周期
 */
export class ExtensionManager {
  private initializedExtensions = new Set<string>();
  private extensionInstances = new Map<string, any>();

  /**
   * 安装扩展
   */
  async install(platform: PlatformRef, extensionNames: string[]): Promise<void> {
    // 解析依赖并排序
    const extensions = ExtensionRegistry.resolveDependencies(extensionNames);

    for (const extension of extensions) {
      if (this.initializedExtensions.has(extension.name)) {
        continue; // 跳过已初始化的扩展
      }

      try {
        // 注册提供者（如果有）
        if (extension.providers) {
          // 这里需要重新创建注入器来包含新的提供者
          // 实际实现中可能需要更复杂的逻辑
          console.log(`Installing providers for extension: ${extension.name}`);
        }

        // 初始化扩展
        if (extension.initialize) {
          await extension.initialize(platform);
        }

        this.initializedExtensions.add(extension.name);
        console.log(`Extension ${extension.name} installed successfully`);
      } catch (error) {
        console.error(`Failed to install extension ${extension.name}:`, error);
        throw error;
      }
    }
  }

  /**
   * 卸载扩展
   */
  async uninstall(platform: PlatformRef, extensionNames: string[]): Promise<void> {
    for (const name of extensionNames) {
      if (!this.initializedExtensions.has(name)) {
        continue;
      }

      try {
        const extension = ExtensionRegistry.get(name);
        if (extension?.destroy) {
          await extension.destroy(platform);
        }

        this.initializedExtensions.delete(name);
        this.extensionInstances.delete(name);
        console.log(`Extension ${name} uninstalled successfully`);
      } catch (error) {
        console.error(`Failed to uninstall extension ${name}:`, error);
      }
    }
  }

  /**
   * 获取已安装的扩展列表
   */
  getInstalled(): string[] {
    return Array.from(this.initializedExtensions);
  }

  /**
   * 检查扩展是否已安装
   */
  isInstalled(name: string): boolean {
    return this.initializedExtensions.has(name);
  }
}

// ============================================================================
// 注册内置扩展
// ============================================================================

// 注册所有内置扩展
ExtensionRegistry.register(LoggerExtension, {
  name: 'logger',
  version: '1.0.0',
  description: '日志服务扩展'
});

ExtensionRegistry.register(HttpExtension, {
  name: 'http',
  version: '1.0.0',
  description: 'HTTP客户端扩展',
  dependencies: ['logger']
});

ExtensionRegistry.register(StorageExtension, {
  name: 'storage',
  version: '1.0.0',
  description: '存储服务扩展'
});

ExtensionRegistry.register(RouterExtension, {
  name: 'router',
  version: '1.0.0',
  description: '路由服务扩展',
  dependencies: ['logger']
});

// ============================================================================
// 导出API
// ============================================================================

/**
 * 注册自定义扩展
 */
export function registerExtension(extension: PlatformExtension, config?: ExtensionConfig): void {
  ExtensionRegistry.register(extension, config);
}

/**
 * 获取扩展
 */
export function getExtension(name: string): PlatformExtension | undefined {
  return ExtensionRegistry.get(name);
}

/**
 * 获取所有可用扩展
 */
export function getAvailableExtensions(): PlatformExtension[] {
  return ExtensionRegistry.getAll();
}

/**
 * 创建扩展管理器
 */
export function createExtensionManager(): ExtensionManager {
  return new ExtensionManager();
}

/**
 * 内置扩展常量
 */
export const BuiltInExtensions = {
  Logger: LoggerExtension,
  Http: HttpExtension,
  Storage: StorageExtension,
  Router: RouterExtension
} as const;
import { PlatformExtension, PlatformRef } from './platform-ref';
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
// 扩展示例 (仅供参考，实际项目中应该删除)
// ============================================================================

/**
 * 示例扩展 - 展示如何创建自定义扩展
 * 注意：这只是一个示例，实际使用时应该创建你自己的扩展
 */
export const ExampleExtension: PlatformExtension = {
  name: 'example',
  providers: [
    // 在这里添加你的扩展提供者
  ],
  initialize: async (platform: PlatformRef) => {
    console.log('Example extension initialized');
  },
  destroy: async (platform: PlatformRef) => {
    console.log('Example extension destroyed');
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
// 示例：如何注册扩展 (仅供参考)
// ============================================================================

// 示例：注册自定义扩展
// ExtensionRegistry.register(MyCustomExtension, {
//   name: 'my-extension',
//   version: '1.0.0',
//   description: '我的自定义扩展',
//   dependencies: ['other-extension']
// });

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
 * 示例扩展常量 (仅供参考)
 */
export const ExampleExtensions = {
  Example: ExampleExtension
} as const;
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';
import { PlatformRef } from './platform-ref';

/**
 * 平台管理器接口
 * 管理系统中的唯一平台实例
 */
export interface IPlatformManager {
  /**
   * 获取当前平台实例
   */
  getCurrentPlatform(): PlatformRef | null;

  /**
   * 设置当前平台实例
   */
  setPlatform(platform: PlatformRef): void;

  /**
   * 清除当前平台实例
   */
  clearPlatform(): void;

  /**
   * 检查是否存在平台实例
   */
  hasPlatform(): boolean;

  /**
   * 销毁当前平台（如果存在）
   */
  destroyCurrentPlatform(): boolean;
}

/**
 * 平台管理器令牌
 */
export const PLATFORM_MANAGER = new InjectionToken<IPlatformManager>('PLATFORM_MANAGER');

/**
 * 平台管理器实现
 * 取代 GlobalPlatform 静态单例模式，采用DI方式管理平台
 */
@Injectable({ providedIn: 'root' })
export class PlatformManager implements IPlatformManager {
  private currentPlatform: PlatformRef | null = null;

  getCurrentPlatform(): PlatformRef | null {
    return this.currentPlatform;
  }

  setPlatform(platform: PlatformRef): void {
    if (this.currentPlatform && !this.currentPlatform.destroyed) {
      throw new Error('A platform instance already exists. Only one platform can exist at a time. Call clearPlatform() or destroyCurrentPlatform() first.');
    }
    this.currentPlatform = platform;
  }

  clearPlatform(): void {
    this.currentPlatform = null;
  }

  hasPlatform(): boolean {
    return this.currentPlatform !== null && !this.currentPlatform.destroyed;
  }

  destroyCurrentPlatform(): boolean {
    if (this.currentPlatform) {
      this.currentPlatform.destroy();
      this.currentPlatform = null;
      return true;
    }
    return false;
  }
}
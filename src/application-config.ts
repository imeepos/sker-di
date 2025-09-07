import { InjectionToken } from './injection-token';

/**
 * 基础应用配置接口
 */
export interface BaseApplicationConfig {
  /** 应用名称 */
  name: string;
  /** 是否启用调试模式 */
  enableDebug?: boolean;
  /** 应用版本 */
  version?: string;
  /** 应用环境 */
  environment?: 'development' | 'production' | 'test';
}

/**
 * 应用配置类型 - 保持通用性
 */
export type ApplicationConfig = BaseApplicationConfig;

/**
 * 基础应用配置令牌
 */
export const APPLICATION_CONFIG = new InjectionToken<ApplicationConfig>('APPLICATION_CONFIG');

// 特定平台配置令牌已移除 - DI库保持平台无关性

/**
 * 应用启动上下文令牌
 */
export const APPLICATION_BOOTSTRAP_CONTEXT = new InjectionToken<ApplicationBootstrapContext>('APPLICATION_BOOTSTRAP_CONTEXT');

/**
 * 应用启动上下文接口
 */
export interface ApplicationBootstrapContext {
  /** 启动时间戳 */
  bootstrapTime: number;
  /** 平台名称 */
  platformName: string;
  /** 启动参数 */
  startupArgs?: string[];
  /** 环境变量 */
  environment?: Record<string, string>;
}

/**
 * 创建应用配置提供者
 * @param config 应用配置
 * @returns 配置提供者数组
 */
export function provideApplicationConfig(config: ApplicationConfig) {
  return [
    // 基础配置
    { provide: APPLICATION_CONFIG, useValue: config },

    // 启动上下文
    {
      provide: APPLICATION_BOOTSTRAP_CONTEXT,
      useFactory: () => ({
        bootstrapTime: Date.now(),
        platformName: 'default',
        environment: typeof process !== 'undefined' ? process.env : {}
      } as ApplicationBootstrapContext)
    }
  ];
}

/**
 * 应用配置工厂
 * 用于动态创建应用配置
 */
export interface ApplicationConfigFactory {
  (): ApplicationConfig;
}

/**
 * 创建应用配置工厂提供者
 * @param factory 配置工厂函数
 * @returns 配置提供者数组
 */
export function provideApplicationConfigFactory(
  factory: ApplicationConfigFactory
) {
  return [
    {
      provide: APPLICATION_CONFIG,
      useFactory: factory
    },
    {
      provide: APPLICATION_BOOTSTRAP_CONTEXT,
      useFactory: () => ({
        bootstrapTime: Date.now(),
        platformName: 'default',
        environment: typeof process !== 'undefined' ? process.env : {}
      } as ApplicationBootstrapContext)
    }
  ];
}
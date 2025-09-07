import { InjectionToken } from './injection-token';

/**
 * 基础应用配置接口
 */
export interface BaseApplicationConfig {
  /** 应用名称 */
  name?: string;
  /** 是否启用调试模式 */
  enableDebug?: boolean;
  /** 应用版本 */
  version?: string;
  /** 应用环境 */
  environment?: 'development' | 'production' | 'test';
}

/**
 * Web应用配置
 */
export interface WebApplicationConfig extends BaseApplicationConfig {
  /** 应用类型 */
  type: 'web';
  /** 根DOM选择器 */
  selector?: string;
  /** 是否启用路由 */
  enableRouting?: boolean;
  /** 基础路径 */
  basePath?: string;
  /** 静态资源路径 */
  assetsPath?: string;
}

/**
 * 微服务应用配置
 */
export interface MicroserviceApplicationConfig extends BaseApplicationConfig {
  /** 应用类型 */
  type: 'microservice';
  /** 服务端口 */
  port?: number;
  /** 服务主机 */
  host?: string;
  /** API前缀 */
  apiPrefix?: string;
  /** 最大请求大小 */
  maxRequestSize?: number;
}

/**
 * 桌面应用配置
 */
export interface DesktopApplicationConfig extends BaseApplicationConfig {
  /** 应用类型 */
  type: 'desktop';
  /** 窗口配置 */
  window?: {
    width?: number;
    height?: number;
    resizable?: boolean;
    title?: string;
  };
  /** 是否启用自动更新 */
  enableAutoUpdate?: boolean;
}

/**
 * 移动应用配置
 */
export interface MobileApplicationConfig extends BaseApplicationConfig {
  /** 应用类型 */
  type: 'mobile';
  /** 平台 */
  platform?: 'ios' | 'android';
  /** 是否启用推送通知 */
  enablePushNotifications?: boolean;
  /** 主题配置 */
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    darkMode?: boolean;
  };
}

/**
 * 应用配置联合类型
 */
export type ApplicationConfig = 
  | WebApplicationConfig 
  | MicroserviceApplicationConfig 
  | DesktopApplicationConfig 
  | MobileApplicationConfig;

/**
 * 基础应用配置令牌
 */
export const APPLICATION_CONFIG = new InjectionToken<BaseApplicationConfig>('APPLICATION_CONFIG');

/**
 * Web应用配置令牌
 */
export const WEB_APPLICATION_CONFIG = new InjectionToken<WebApplicationConfig>('WEB_APPLICATION_CONFIG');

/**
 * 微服务应用配置令牌
 */
export const MICROSERVICE_APPLICATION_CONFIG = new InjectionToken<MicroserviceApplicationConfig>('MICROSERVICE_APPLICATION_CONFIG');

/**
 * 桌面应用配置令牌
 */
export const DESKTOP_APPLICATION_CONFIG = new InjectionToken<DesktopApplicationConfig>('DESKTOP_APPLICATION_CONFIG');

/**
 * 移动应用配置令牌
 */
export const MOBILE_APPLICATION_CONFIG = new InjectionToken<MobileApplicationConfig>('MOBILE_APPLICATION_CONFIG');

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
export function provideApplicationConfig<T extends ApplicationConfig>(config: T) {
  const providers = [
    // 基础配置
    { provide: APPLICATION_CONFIG, useValue: config },
    
    // 启动上下文 - 在创建时动态获取平台名称
    {
      provide: APPLICATION_BOOTSTRAP_CONTEXT,
      useFactory: () => ({
        bootstrapTime: Date.now(),
        platformName: 'default', // 注意：这里将在平台创建时被覆盖
        environment: typeof process !== 'undefined' ? process.env : {}
      } as ApplicationBootstrapContext)
    }
  ];

  // 根据类型添加特定配置
  switch (config.type) {
    case 'web':
      providers.push({ provide: WEB_APPLICATION_CONFIG, useValue: config });
      break;
    case 'microservice':
      providers.push({ provide: MICROSERVICE_APPLICATION_CONFIG, useValue: config });
      break;
    case 'desktop':
      providers.push({ provide: DESKTOP_APPLICATION_CONFIG, useValue: config });
      break;
    case 'mobile':
      providers.push({ provide: MOBILE_APPLICATION_CONFIG, useValue: config });
      break;
  }

  return providers;
}

/**
 * 应用配置工厂
 * 用于动态创建应用配置
 */
export interface ApplicationConfigFactory<T extends ApplicationConfig> {
  (): T;
}

/**
 * 创建应用配置工厂提供者
 * @param factory 配置工厂函数
 * @returns 配置提供者数组
 */
export function provideApplicationConfigFactory<T extends ApplicationConfig>(
  factory: ApplicationConfigFactory<T>
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
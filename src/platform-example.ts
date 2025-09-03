/**
 * Platform 注入器使用示例
 * 
 * 展示如何使用平台注入器来管理跨应用共享的服务
 */

import 'reflect-metadata';
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';
import { createPlatformInjector, createApplicationInjector } from './index';

// ==================== 平台级服务 ====================

/**
 * 平台级日志服务 - 跨所有应用共享
 */
@Injectable({ providedIn: 'platform' })
export class PlatformLoggerService {
  private logs: Array<{ timestamp: number; level: string; message: string }> = [];

  log(level: 'info' | 'warn' | 'error', message: string) {
    const entry = {
      timestamp: Date.now(),
      level,
      message
    };
    this.logs.push(entry);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  getAllLogs() {
    return [...this.logs];
  }

  getLogCount() {
    return this.logs.length;
  }
}

/**
 * 平台级配置服务 - 存储全局配置
 */
@Injectable({ providedIn: 'platform' })
export class PlatformConfigService {
  private config = {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    apiBaseUrl: process.env.API_BASE_URL || 'https://api.example.com',
    features: {
      enableLogging: true,
      enableMetrics: true,
      enableDebug: process.env.NODE_ENV === 'development'
    }
  };

  get<K extends keyof typeof this.config>(key: K): typeof this.config[K] {
    return this.config[key];
  }

  getFeature(feature: keyof typeof this.config.features): boolean {
    return this.config.features[feature];
  }
}

/**
 * 平台级缓存服务 - 跨应用共享缓存
 */
@Injectable({ providedIn: 'platform' })
export class PlatformCacheService {
  private cache = new Map<string, { value: any; expires?: number }>();

  set(key: string, value: any, ttlMs?: number) {
    const expires = ttlMs ? Date.now() + ttlMs : undefined;
    this.cache.set(key, { value, expires });
  }

  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// ==================== 应用级服务 ====================

/**
 * 应用级用户服务 - 每个应用独立
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(
    private logger: PlatformLoggerService,
    private config: PlatformConfigService
  ) {}

  async getUser(id: string) {
    this.logger.log('info', `获取用户信息: ${id}`);
    
    const apiUrl = this.config.get('apiBaseUrl');
    // 模拟 API 调用
    return {
      id,
      name: `User ${id}`,
      apiUrl
    };
  }
}

/**
 * 应用级数据服务 - 使用平台缓存
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(
    private cache: PlatformCacheService,
    private logger: PlatformLoggerService
  ) {}

  async getData(key: string): Promise<any> {
    // 先检查缓存
    const cached = this.cache.get(key);
    if (cached) {
      this.logger.log('info', `缓存命中: ${key}`);
      return cached;
    }

    // 模拟数据获取
    this.logger.log('info', `获取数据: ${key}`);
    const data = { key, value: `data-${key}`, timestamp: Date.now() };
    
    // 缓存5分钟
    this.cache.set(key, data, 5 * 60 * 1000);
    
    return data;
  }
}

// ==================== 使用示例 ====================

export function demonstratePlatformInjector() {
  console.log('=== Platform 注入器演示 ===\n');

  // 1. 创建完整的注入器层次结构
  const platformInjector = createPlatformInjector([
    { provide: 'PLATFORM_NAME', useValue: 'MyPlatform' }
  ]);

  const app1Injector = createApplicationInjector([
    { provide: 'APP_NAME', useValue: 'Application 1' }
  ], platformInjector);

  const app2Injector = createApplicationInjector([
    { provide: 'APP_NAME', useValue: 'Application 2' }
  ], platformInjector);

  // 创建根注入器来处理通用服务
  const rootInjector1 = createInjector([], app1Injector);
  const rootInjector2 = createInjector([], app2Injector);

  console.log('1. 注入器层次结构创建完成');
  console.log(`   Platform: ${platformInjector.scope}`);
  console.log(`   App1: ${app1Injector.scope}`);
  console.log(`   App2: ${app2Injector.scope}`);
  console.log(`   Root1: ${rootInjector1.scope}`);
  console.log(`   Root2: ${rootInjector2.scope}`);

  console.log('\n2. 应用注入器创建完成');
  console.log(`   App1 作用域: ${app1Injector.scope}`);
  console.log(`   App2 作用域: ${app2Injector.scope}`);

  // 3. 验证平台服务的单例性
  const logger1 = app1Injector.get(PlatformLoggerService);
  const logger2 = app2Injector.get(PlatformLoggerService);
  const loggerPlatform = platformInjector.get(PlatformLoggerService);

  console.log('\n3. 验证平台服务单例性');
  console.log(`   Logger1 === Logger2: ${logger1 === logger2}`);
  console.log(`   Logger1 === LoggerPlatform: ${logger1 === loggerPlatform}`);

  // 4. 使用平台服务
  logger1.log('info', '来自应用1的日志');
  logger2.log('warn', '来自应用2的警告');
  loggerPlatform.log('error', '来自平台的错误');

  console.log(`\n4. 平台日志服务统计`);
  console.log(`   总日志数: ${logger1.getLogCount()}`);

  // 5. 使用平台缓存
  const cache1 = app1Injector.get(PlatformCacheService);
  const cache2 = app2Injector.get(PlatformCacheService);

  cache1.set('shared-data', { from: 'app1', value: 123 });
  
  console.log('\n5. 验证平台缓存共享');
  console.log(`   App1 设置数据: shared-data`);
  console.log(`   App2 读取数据: ${JSON.stringify(cache2.get('shared-data'))}`);
  console.log(`   缓存大小: ${cache1.size()}`);

  // 6. 应用级服务使用平台服务
  const userService1 = app1Injector.get(UserService);
  const dataService2 = app2Injector.get(DataService);

  console.log('\n6. 应用服务使用平台服务');
  
  // 这些调用会使用共享的平台日志服务
  userService1.getUser('123').then(user => {
    console.log(`   App1 用户服务: ${JSON.stringify(user)}`);
  });

  dataService2.getData('test-key').then(data => {
    console.log(`   App2 数据服务: ${JSON.stringify(data)}`);
  });

  // 7. 最终统计
  setTimeout(() => {
    console.log('\n7. 最终统计');
    console.log(`   平台日志总数: ${logger1.getLogCount()}`);
    console.log(`   平台缓存大小: ${cache1.size()}`);
    console.log('\n=== 演示完成 ===');
  }, 100);
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
  demonstratePlatformInjector();
}

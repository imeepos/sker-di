import 'reflect-metadata';
import { Injectable } from './injectable';
import { createPlatformInjector, createApplicationInjector } from './index';
import { InjectionToken } from './injection-token';

describe('Platform 注入器支持', () => {
  describe('createPlatformInjector', () => {
    it('应该创建平台注入器并自动解析 providedIn: "platform" 的服务', () => {
      @Injectable({ providedIn: 'platform' })
      class PlatformLoggerService {
        log(message: string) {
          return `[Platform] ${message}`;
        }
      }

      const platformInjector = createPlatformInjector();
      
      const logger = platformInjector.get(PlatformLoggerService);
      expect(logger).toBeInstanceOf(PlatformLoggerService);
      expect(logger.log('test')).toBe('[Platform] test');
    });

    it('应该在平台注入器中解析 providedIn: "root" 的服务', () => {
      @Injectable({ providedIn: 'root' })
      class RootService {
        getValue() {
          return 'root-value';
        }
      }

      const platformInjector = createPlatformInjector();
      
      const service = platformInjector.get(RootService);
      expect(service).toBeInstanceOf(RootService);
      expect(service.getValue()).toBe('root-value');
    });

    it('应该支持手动注册的提供者', () => {
      const CONFIG_TOKEN = new InjectionToken<{ version: string }>('CONFIG');
      
      const platformInjector = createPlatformInjector([
        { provide: CONFIG_TOKEN, useValue: { version: '1.0.0' } }
      ]);
      
      const config = platformInjector.get(CONFIG_TOKEN);
      expect(config).toEqual({ version: '1.0.0' });
    });

    it('应该正确标识为平台注入器', () => {
      const platformInjector = createPlatformInjector();
      expect(platformInjector.scope).toBe('platform');
    });
  });

  describe('createApplicationInjector', () => {
    it('应该创建应用注入器并继承平台注入器的服务', () => {
      @Injectable({ providedIn: 'platform' })
      class PlatformService {
        getPlatformData() {
          return 'platform-data';
        }
      }

      @Injectable({ providedIn: 'root' })
      class AppService {
        getAppData() {
          return 'app-data';
        }
      }

      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector([], platformInjector);
      
      // 应该能获取平台服务
      const platformService = appInjector.get(PlatformService);
      expect(platformService.getPlatformData()).toBe('platform-data');
      
      // 应该能获取应用服务
      const appService = appInjector.get(AppService);
      expect(appService.getAppData()).toBe('app-data');
    });

    it('应该正确标识为应用注入器', () => {
      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector([], platformInjector);
      
      expect(appInjector.scope).toBe('application');
    });

    it('应用注入器不应该自动解析 providedIn: "platform" 的服务', () => {
      @Injectable({ providedIn: 'platform' })
      class PlatformOnlyService {
        getData() {
          return 'platform-only';
        }
      }

      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector([], platformInjector);
      
      // 平台注入器可以解析
      const platformService = platformInjector.get(PlatformOnlyService);
      expect(platformService.getData()).toBe('platform-only');
      
      // 应用注入器应该从父级获取，而不是自己解析
      const appService = appInjector.get(PlatformOnlyService);
      expect(appService).toBe(platformService); // 应该是同一个实例
    });
  });

  describe('层次化注入器', () => {
    it('应该支持完整的注入器层次结构', () => {
      @Injectable({ providedIn: 'platform' })
      class PlatformConfigService {
        getConfig() {
          return { platform: 'config' };
        }
      }

      @Injectable({ providedIn: 'root' })
      class SharedService {
        getSharedData() {
          return 'shared';
        }
      }

      const APP_TOKEN = new InjectionToken<string>('APP_TOKEN');
      
      // 创建层次结构
      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector([
        { provide: APP_TOKEN, useValue: 'app-specific' }
      ], platformInjector);
      
      // 验证层次结构
      expect(appInjector.parent).toBe(platformInjector);
      
      // 验证服务解析
      const platformConfig = appInjector.get(PlatformConfigService);
      const sharedService = appInjector.get(SharedService);
      const appToken = appInjector.get(APP_TOKEN);
      
      expect(platformConfig.getConfig()).toEqual({ platform: 'config' });
      expect(sharedService.getSharedData()).toBe('shared');
      expect(appToken).toBe('app-specific');
    });

    it('应该确保平台服务的单例性', () => {
      @Injectable({ providedIn: 'platform' })
      class SingletonService {
        private static instanceCount = 0;
        public readonly instanceId: number;
        
        constructor() {
          this.instanceId = ++SingletonService.instanceCount;
        }
        
        static resetCount() {
          SingletonService.instanceCount = 0;
        }
      }

      SingletonService.resetCount();
      
      const platformInjector = createPlatformInjector();
      const app1Injector = createApplicationInjector([], platformInjector);
      const app2Injector = createApplicationInjector([], platformInjector);
      
      const service1 = app1Injector.get(SingletonService);
      const service2 = app2Injector.get(SingletonService);
      const service3 = platformInjector.get(SingletonService);
      
      // 所有应该是同一个实例
      expect(service1).toBe(service2);
      expect(service2).toBe(service3);
      expect(service1.instanceId).toBe(1);
    });
  });
});

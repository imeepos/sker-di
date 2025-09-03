import 'reflect-metadata';
import { Injectable } from './injectable';
import { EnvironmentInjector } from './environment-injector';
import {
  createRootInjector,
  createPlatformInjector,
  createApplicationInjector,
  createFeatureInjector,
  createInjector,
  resetRootInjector
} from './index';

describe('Auto 作用域和层次结构测试', () => {
  // 在每个测试后重置根注入器
  afterEach(() => {
    resetRootInjector();
  });
  // 定义不同作用域的服务
  @Injectable({ providedIn: 'auto' })
  class AutoService {
    getValue() { return 'auto'; }
  }

  @Injectable({ providedIn: 'root' })
  class RootService {
    getValue() { return 'root'; }
  }

  @Injectable({ providedIn: 'platform' })
  class PlatformService {
    getValue() { return 'platform'; }
  }

  @Injectable({ providedIn: 'application' })
  class ApplicationService {
    getValue() { return 'application'; }
  }

  @Injectable({ providedIn: 'feature' })
  class FeatureService {
    getValue() { return 'feature'; }
  }

  describe('Auto 作用域测试', () => {
    it('auto 服务应该可以在任何注入器中解析', () => {
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector();
      const featureInjector = createFeatureInjector([], appInjector);
      
      // auto 服务应该在所有注入器中都能解析
      expect(rootInjector.get(AutoService).getValue()).toBe('auto');
      expect(platformInjector.get(AutoService).getValue()).toBe('auto');
      expect(appInjector.get(AutoService).getValue()).toBe('auto');
      expect(featureInjector.get(AutoService).getValue()).toBe('auto');
    });

    it('auto 服务在不同注入器中应该是不同实例', () => {
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector();
      
      const rootService = rootInjector.get(AutoService);
      const platformService = platformInjector.get(AutoService);
      const appService = appInjector.get(AutoService);
      
      // 每个注入器都会创建自己的实例
      expect(rootService).not.toBe(platformService);
      expect(platformService).not.toBe(appService);
      expect(rootService).not.toBe(appService);
    });

    it('同一注入器中的 auto 服务应该保持单例', () => {
      const injector = createInjector([]);
      
      const service1 = injector.get(AutoService);
      const service2 = injector.get(AutoService);
      
      expect(service1).toBe(service2);
    });
  });

  describe('正确的层次结构', () => {
    it('应该支持正确的层次结构: Root → Platform → Application → Feature', () => {
      // 创建正确的层次结构
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector();
      const featureInjector = createFeatureInjector([], appInjector);
      
      // 验证层次关系
      expect(platformInjector.parent).toBe(rootInjector);
      expect(appInjector.parent).toBe(platformInjector);
      expect(featureInjector.parent).toBe(appInjector);
      
      // 验证作用域
      expect(rootInjector.scope).toBe('root');
      expect(platformInjector.scope).toBe('platform');
      expect(appInjector.scope).toBe('application');
      expect(featureInjector.scope).toBe('feature');
    });

    it('应该通过层次结构正确解析服务', () => {
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector();
      const featureInjector = createFeatureInjector([], appInjector);
      
      // 从最底层获取所有服务
      const rootService = featureInjector.get(RootService);
      const platformService = featureInjector.get(PlatformService);
      const appService = featureInjector.get(ApplicationService);
      const featureService = featureInjector.get(FeatureService);
      const autoService = featureInjector.get(AutoService);
      
      expect(rootService.getValue()).toBe('root');
      expect(platformService.getValue()).toBe('platform');
      expect(appService.getValue()).toBe('application');
      expect(featureService.getValue()).toBe('feature');
      expect(autoService.getValue()).toBe('auto');
    });

    it('应该确保服务在正确的层级实例化', () => {
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      const app1Injector = createApplicationInjector();
      const app2Injector = createApplicationInjector();
      
      // root 和 platform 服务应该在所有子注入器中共享
      const rootService1 = app1Injector.get(RootService);
      const rootService2 = app2Injector.get(RootService);
      const platformService1 = app1Injector.get(PlatformService);
      const platformService2 = app2Injector.get(PlatformService);
      
      expect(rootService1).toBe(rootService2);
      expect(platformService1).toBe(platformService2);
      
      // application 服务应该在不同应用中独立
      const appService1 = app1Injector.get(ApplicationService);
      const appService2 = app2Injector.get(ApplicationService);
      
      expect(appService1).not.toBe(appService2);
    });
  });

  describe('createInjector 默认行为', () => {
    it('createInjector 默认应该创建 auto 作用域的注入器', () => {
      const injector = createInjector([]);
      expect(injector.scope).toBe('auto');
    });

    it('createInjector 应该支持指定作用域', () => {
      const rootInjector = createInjector([], undefined, 'root');
      const platformInjector = createInjector([], undefined, 'platform');
      const appInjector = createInjector([], undefined, 'application');
      const featureInjector = createInjector([], undefined, 'feature');
      
      expect(rootInjector.scope).toBe('root');
      expect(platformInjector.scope).toBe('platform');
      expect(appInjector.scope).toBe('application');
      expect(featureInjector.scope).toBe('feature');
    });

    it('auto 作用域注入器应该能解析 auto 服务', () => {
      const autoInjector = createInjector([]);
      const service = autoInjector.get(AutoService);
      expect(service.getValue()).toBe('auto');
    });

    it('auto 作用域注入器不应该解析其他特定作用域的服务', () => {
      const autoInjector = createInjector([]);
      
      expect(() => autoInjector.get(RootService))
        .toThrow('No provider for RootService');
      
      expect(() => autoInjector.get(PlatformService))
        .toThrow('No provider for PlatformService');
      
      expect(() => autoInjector.get(ApplicationService))
        .toThrow('No provider for ApplicationService');
      
      expect(() => autoInjector.get(FeatureService))
        .toThrow('No provider for FeatureService');
    });
  });

  describe('灵活的组合使用', () => {
    it('应该支持标准的层次结构组合', () => {
      // 创建标准的层次结构
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      const autoInjector = createInjector([], platformInjector, 'auto');

      // auto 注入器可以解析 auto 服务
      const autoService = autoInjector.get(AutoService);
      expect(autoService.getValue()).toBe('auto');

      // auto 注入器也可以解析父级的 platform 服务
      const platformService = autoInjector.get(PlatformService);
      const rootService = autoInjector.get(RootService);

      expect(platformService.getValue()).toBe('platform');
      expect(rootService.getValue()).toBe('root');

      // 验证层次关系
      expect(autoInjector.parent).toBe(platformInjector);
      expect(platformInjector.parent).toBe(rootInjector);
    });
  });
});

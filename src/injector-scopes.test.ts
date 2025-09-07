import 'reflect-metadata';
import { Injectable } from './injectable';
import { createInjector } from './index';
import { IInjectorRegistry, INJECTOR_REGISTRY, InjectorRegistry } from './injector-registry';
import { IPlatformManager, PLATFORM_MANAGER, PlatformManager } from './platform-manager';
import { EnvironmentInjector } from './environment-injector';

describe('注入器作用域统一测试', () => {
  let tempRootInjector: EnvironmentInjector;
  let injectorRegistry: IInjectorRegistry;

  beforeEach(() => {
    // 创建临时根注入器用于测试
    tempRootInjector = new EnvironmentInjector([
      { provide: INJECTOR_REGISTRY, useClass: InjectorRegistry },
      { provide: PLATFORM_MANAGER, useClass: PlatformManager }
    ], undefined, 'root');
    
    injectorRegistry = tempRootInjector.get(INJECTOR_REGISTRY);
  });

  afterEach(() => {
    // 清理所有注入器
    injectorRegistry && injectorRegistry.destroyAll();
  });
  // 定义不同作用域的服务
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

  @Injectable({ providedIn: 'root' })
  class RootService {
    getValue() { return 'root'; }
  }

  @Injectable({ providedIn: null })
  class ManualService {
    getValue() { return 'manual'; }
  }

  describe('作用域解析规则', () => {
    it('平台注入器应该只解析 platform 服务', () => {
      injectorRegistry.createRootInjector(); // 必须先创建根注入器
      const platformInjector = injectorRegistry.createPlatformInjector();

      // 可以解析 platform 服务
      const platformService = platformInjector.get(PlatformService);
      expect(platformService.getValue()).toBe('platform');

      // 可以解析根服务（通过层次结构）
      const rootService = platformInjector.get(RootService);
      expect(rootService.getValue()).toBe('root');

      // 不能解析其他作用域的服务
      expect(() => platformInjector.get(ApplicationService))
        .toThrow('No provider for ApplicationService');

      expect(() => platformInjector.get(FeatureService))
        .toThrow('No provider for FeatureService');
    });

    it('应用注入器应该只解析 application 服务，其他通过层次继承', () => {
      injectorRegistry.createRootInjector(); // 必须先创建根注入器
      injectorRegistry.createPlatformInjector(); // 必须先创建平台注入器
      const appInjector = injectorRegistry.createApplicationInjector();

      // 可以解析 application 服务
      const appService = appInjector.get(ApplicationService);
      expect(appService.getValue()).toBe('application');

      // 可以从父级获取 platform 服务和根服务
      const platformService = appInjector.get(PlatformService);
      expect(platformService.getValue()).toBe('platform');

      const rootService = appInjector.get(RootService);
      expect(rootService.getValue()).toBe('root');

      // 不能解析 feature 服务
      expect(() => appInjector.get(FeatureService))
        .toThrow('No provider for FeatureService');
    });

    it('功能注入器应该只解析 feature 服务，其他通过层次继承', () => {
      injectorRegistry.createRootInjector(); // 必须先创建根注入器
      injectorRegistry.createPlatformInjector(); // 必须先创建平台注入器
      const appInjector = injectorRegistry.createApplicationInjector();
      const featureInjector = injectorRegistry.createFeatureInjector([], appInjector);

      // 可以解析 feature 服务
      const featureService = featureInjector.get(FeatureService);
      expect(featureService.getValue()).toBe('feature');

      // 可以从父级获取 application 服务
      const appService = featureInjector.get(ApplicationService);
      expect(appService.getValue()).toBe('application');

      // 可以从祖父级获取 platform 服务和根服务
      const platformService = featureInjector.get(PlatformService);
      expect(platformService.getValue()).toBe('platform');

      const rootService = featureInjector.get(RootService);
      expect(rootService.getValue()).toBe('root');
    });

    it('根注入器应该只解析 root 服务', () => {
      const rootInjector = createInjector([
        { provide: RootService, useClass: RootService }
      ]);
      
      // 可以解析 root 服务
      const rootService = rootInjector.get(RootService);
      expect(rootService.getValue()).toBe('root');
      
      // 不能解析其他作用域的服务
      expect(() => rootInjector.get(PlatformService))
        .toThrow('No provider for PlatformService');
      
      expect(() => rootInjector.get(ApplicationService))
        .toThrow('No provider for ApplicationService');
      
      expect(() => rootInjector.get(FeatureService))
        .toThrow('No provider for FeatureService');
    });
  });

  describe('作用域标识', () => {
    it('应该正确标识各个注入器的作用域', () => {
      injectorRegistry.createRootInjector(); // 必须先创建根注入器
      const platformInjector = injectorRegistry.createPlatformInjector();
      const appInjector = injectorRegistry.createApplicationInjector();
      const featureInjector = injectorRegistry.createFeatureInjector([], appInjector);
      const rootInjector = createInjector([], undefined, 'root');
      
      expect(platformInjector.scope).toBe('platform');
      expect(appInjector.scope).toBe('application');
      expect(featureInjector.scope).toBe('feature');
      expect(rootInjector.scope).toBe('root');
    });
  });

  describe('服务单例性', () => {
    it('同作用域的服务应该保持单例', () => {
      injectorRegistry.createRootInjector(); // 必须先创建根注入器
      const platformInjector = injectorRegistry.createPlatformInjector();
      const app1Injector = injectorRegistry.createApplicationInjector();
      const app2Injector = injectorRegistry.createApplicationInjector();
      
      // platform 服务在所有子注入器中应该是同一个实例
      const platform1 = app1Injector.get(PlatformService);
      const platform2 = app2Injector.get(PlatformService);
      const platform3 = platformInjector.get(PlatformService);
      
      expect(platform1).toBe(platform2);
      expect(platform2).toBe(platform3);
      
      // application 服务在不同应用注入器中应该是不同实例
      const app1Service = app1Injector.get(ApplicationService);
      const app2Service = app2Injector.get(ApplicationService);
      
      expect(app1Service).not.toBe(app2Service);
    });

    it('feature 服务应该在不同功能模块中独立', () => {
      injectorRegistry.createRootInjector(); // 必须先创建根注入器
      injectorRegistry.createPlatformInjector(); // 必须先创建平台注入器
      const appInjector = injectorRegistry.createApplicationInjector();
      const feature1Injector = injectorRegistry.createFeatureInjector([], appInjector);
      const feature2Injector = injectorRegistry.createFeatureInjector([], appInjector);
      
      const feature1Service = feature1Injector.get(FeatureService);
      const feature2Service = feature2Injector.get(FeatureService);
      
      // 不同功能模块的服务应该是不同实例
      expect(feature1Service).not.toBe(feature2Service);
    });
  });

  describe('手动注册服务', () => {
    it('providedIn: null 的服务需要手动注册', () => {
      const injector = createInjector([
        { provide: ManualService, useClass: ManualService }
      ]);
      
      const service = injector.get(ManualService);
      expect(service.getValue()).toBe('manual');
    });

    it('没有手动注册的 null 作用域服务应该抛出错误', () => {
      const injector = createInjector([]);
      
      expect(() => injector.get(ManualService))
        .toThrow('No provider for ManualService');
    });
  });

  describe('完整的层次结构', () => {
    it('应该支持完整的注入器层次结构', () => {
      // 创建完整的层次结构，包含专门的 root 注入器
      injectorRegistry.createRootInjector(); // 必须先创建根注入器
      const platformInjector = injectorRegistry.createPlatformInjector();
      const appInjector = injectorRegistry.createApplicationInjector();
      const rootInjector = createInjector([], appInjector, 'root'); // root 注入器
      const featureInjector = injectorRegistry.createFeatureInjector([], rootInjector);

      // 验证层次关系
      expect(featureInjector.parent).toBe(rootInjector);
      expect(rootInjector.parent).toBe(appInjector);
      expect(appInjector.parent).toBe(platformInjector);

      // 从最底层获取所有服务
      const platformService = featureInjector.get(PlatformService);
      const appService = featureInjector.get(ApplicationService);
      const rootService = featureInjector.get(RootService);
      const featureService = featureInjector.get(FeatureService);

      expect(platformService.getValue()).toBe('platform');
      expect(appService.getValue()).toBe('application');
      expect(rootService.getValue()).toBe('root');
      expect(featureService.getValue()).toBe('feature');
    });

    it('应该展示清晰的作用域职责分离', () => {
      // 每个注入器只负责自己作用域的服务
      injectorRegistry.createRootInjector(); // 必须先创建根注入器
      const platformInjector = injectorRegistry.createPlatformInjector();
      const appInjector = injectorRegistry.createApplicationInjector();
      const rootInjector = createInjector([], appInjector, 'root');
      const featureInjector = injectorRegistry.createFeatureInjector([], rootInjector);

      // 验证各自的作用域
      expect(platformInjector.scope).toBe('platform');
      expect(appInjector.scope).toBe('application');
      expect(rootInjector.scope).toBe('root');
      expect(featureInjector.scope).toBe('feature');

      // 验证职责分离：每个注入器只自动解析自己作用域的服务
      // 平台注入器
      expect(() => platformInjector.get(PlatformService)).not.toThrow();
      expect(() => platformInjector.get(ApplicationService)).toThrow();
      expect(() => platformInjector.get(RootService)).not.toThrow(); // 可以从父级继承
      expect(() => platformInjector.get(FeatureService)).toThrow();

      // 应用注入器
      expect(() => appInjector.get(ApplicationService)).not.toThrow();
      expect(() => appInjector.get(PlatformService)).not.toThrow(); // 从父级继承
      expect(() => appInjector.get(RootService)).not.toThrow(); // 从祖父级继承
      expect(() => appInjector.get(FeatureService)).toThrow();

      // 根注入器（这里是自定义的 root 作用域注入器，不是全局根注入器）
      expect(() => rootInjector.get(RootService)).not.toThrow();
      expect(() => rootInjector.get(ApplicationService)).not.toThrow(); // 从父级继承
      expect(() => rootInjector.get(PlatformService)).not.toThrow(); // 从祖父级继承
      expect(() => rootInjector.get(FeatureService)).toThrow();

      // 功能注入器
      expect(() => featureInjector.get(FeatureService)).not.toThrow();
      expect(() => featureInjector.get(RootService)).not.toThrow(); // 从父级继承
      expect(() => featureInjector.get(ApplicationService)).not.toThrow(); // 从祖父级继承
      expect(() => featureInjector.get(PlatformService)).not.toThrow(); // 从曾祖父级继承
    });
  });
});

import 'reflect-metadata';
import { Injectable } from './injectable';
import { EnvironmentInjector } from './environment-injector';
import { IInjectorRegistry, INJECTOR_REGISTRY, InjectorRegistry } from './injector-registry';
import { IPlatformManager, PLATFORM_MANAGER, PlatformManager } from './platform-manager';

describe('应用注入器自动父级测试', () => {
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

  describe('自动父级绑定', () => {
    it('应用注入器应该自动使用全局平台注入器作为父级', () => {
      // 创建根注入器和平台注入器
      const rootInjector = injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector();
      
      // 创建应用注入器（不需要传入平台注入器）
      const appInjector = injectorRegistry.createApplicationInjector([
        { provide: 'APP_CONFIG', useValue: 'app-value' }
      ]);
      
      // 验证父子关系
      expect(appInjector.parent).toBe(platformInjector);
      expect(appInjector.scope).toBe('application');
      
      // 验证可以访问父级服务
      expect(appInjector.get('APP_CONFIG')).toBe('app-value');
      expect(appInjector.get(PlatformService).getValue()).toBe('platform');
      expect(appInjector.get(RootService).getValue()).toBe('root');
    });

    it('可以创建多个应用注入器，都使用同一个平台注入器', () => {
      injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector();
      
      const app1Injector = injectorRegistry.createApplicationInjector([
        { provide: 'APP_NAME', useValue: 'App1' }
      ]);
      
      const app2Injector = injectorRegistry.createApplicationInjector([
        { provide: 'APP_NAME', useValue: 'App2' }
      ]);
      
      // 都应该使用同一个平台注入器作为父级
      expect(app1Injector.parent).toBe(platformInjector);
      expect(app2Injector.parent).toBe(platformInjector);
      
      // 应用服务应该独立
      expect(app1Injector.get('APP_NAME')).toBe('App1');
      expect(app2Injector.get('APP_NAME')).toBe('App2');
      
      // 平台服务应该共享
      const platformService1 = app1Injector.get(PlatformService);
      const platformService2 = app2Injector.get(PlatformService);
      expect(platformService1).toBe(platformService2);
      
      // 应用服务应该独立
      const appService1 = app1Injector.get(ApplicationService);
      const appService2 = app2Injector.get(ApplicationService);
      expect(appService1).not.toBe(appService2);
    });

    it('功能注入器仍然需要明确指定应用注入器', () => {
      injectorRegistry.createRootInjector();
      injectorRegistry.createPlatformInjector();
      const appInjector = injectorRegistry.createApplicationInjector();
      
      // 功能注入器仍然需要明确指定应用注入器
      const featureInjector = injectorRegistry.createFeatureInjector([
        { provide: 'FEATURE_CONFIG', useValue: 'feature-value' }
      ], appInjector);
      
      expect(featureInjector.parent).toBe(appInjector);
      expect(featureInjector.scope).toBe('feature');
      
      // 验证可以访问所有层级的服务
      expect(featureInjector.get('FEATURE_CONFIG')).toBe('feature-value');
      expect(featureInjector.get(ApplicationService).getValue()).toBe('application');
      expect(featureInjector.get(PlatformService).getValue()).toBe('platform');
      expect(featureInjector.get(RootService).getValue()).toBe('root');
    });
  });

  describe('错误处理', () => {
    it('没有平台注入器时创建应用注入器应该失败', () => {
      injectorRegistry.createRootInjector();
      // 没有创建平台注入器
      
      expect(() => {
        injectorRegistry.createApplicationInjector();
      }).toThrow('Platform injector must be created before application injector');
    });

    it('应该展示正确的创建顺序', () => {
      // ❌ 错误：没有根注入器
      expect(() => {
        injectorRegistry.createApplicationInjector();
      }).toThrow('Platform injector must be created before application injector');
      
      // ❌ 错误：有根注入器但没有平台注入器
      injectorRegistry.createRootInjector();
      expect(() => {
        injectorRegistry.createApplicationInjector();
      }).toThrow('Platform injector must be created before application injector');
      
      // ✅ 正确：先创建平台注入器
      injectorRegistry.createPlatformInjector();
      const appInjector = injectorRegistry.createApplicationInjector();
      expect(appInjector).toBeDefined();
    });
  });

  describe('完整的层次结构', () => {
    it('应该支持完整的自动化层次结构', () => {
      // 创建完整的层次结构
      const rootInjector = injectorRegistry.createRootInjector([
        { provide: 'ROOT_TOKEN', useValue: 'root-value' }
      ]);
      
      const platformInjector = injectorRegistry.createPlatformInjector([
        { provide: 'PLATFORM_TOKEN', useValue: 'platform-value' }
      ]);
      
      const appInjector = injectorRegistry.createApplicationInjector([
        { provide: 'APP_TOKEN', useValue: 'app-value' }
      ]);
      
      const featureInjector = injectorRegistry.createFeatureInjector([
        { provide: 'FEATURE_TOKEN', useValue: 'feature-value' }
      ], appInjector);
      
      // 验证层次关系
      expect(platformInjector.parent).toBe(rootInjector);
      expect(appInjector.parent).toBe(platformInjector);
      expect(featureInjector.parent).toBe(appInjector);
      
      // 从最底层获取所有服务
      expect(featureInjector.get('ROOT_TOKEN')).toBe('root-value');
      expect(featureInjector.get('PLATFORM_TOKEN')).toBe('platform-value');
      expect(featureInjector.get('APP_TOKEN')).toBe('app-value');
      expect(featureInjector.get('FEATURE_TOKEN')).toBe('feature-value');
      
      // 验证自动解析的服务
      expect(featureInjector.get(RootService).getValue()).toBe('root');
      expect(featureInjector.get(PlatformService).getValue()).toBe('platform');
      expect(featureInjector.get(ApplicationService).getValue()).toBe('application');
      expect(featureInjector.get(FeatureService).getValue()).toBe('feature');
    });

    it('应该支持多应用架构', () => {
      // 创建共享的基础设施
      injectorRegistry.createRootInjector([
        { provide: 'SHARED_CONFIG', useValue: 'shared' }
      ]);
      
      injectorRegistry.createPlatformInjector([
        { provide: 'PLATFORM_NAME', useValue: 'MyPlatform' }
      ]);
      
      // 创建多个应用
      const webAppInjector = injectorRegistry.createApplicationInjector([
        { provide: 'APP_TYPE', useValue: 'web' }
      ]);
      
      const mobileAppInjector = injectorRegistry.createApplicationInjector([
        { provide: 'APP_TYPE', useValue: 'mobile' }
      ]);
      
      // 为每个应用创建功能模块
      const webUserFeature = injectorRegistry.createFeatureInjector([
        { provide: 'FEATURE_NAME', useValue: 'web-user' }
      ], webAppInjector);
      
      const mobileUserFeature = injectorRegistry.createFeatureInjector([
        { provide: 'FEATURE_NAME', useValue: 'mobile-user' }
      ], mobileAppInjector);
      
      // 验证共享服务
      expect(webUserFeature.get('SHARED_CONFIG')).toBe('shared');
      expect(mobileUserFeature.get('SHARED_CONFIG')).toBe('shared');
      expect(webUserFeature.get('PLATFORM_NAME')).toBe('MyPlatform');
      expect(mobileUserFeature.get('PLATFORM_NAME')).toBe('MyPlatform');
      
      // 验证应用隔离
      expect(webUserFeature.get('APP_TYPE')).toBe('web');
      expect(mobileUserFeature.get('APP_TYPE')).toBe('mobile');
      
      // 验证功能隔离
      expect(webUserFeature.get('FEATURE_NAME')).toBe('web-user');
      expect(mobileUserFeature.get('FEATURE_NAME')).toBe('mobile-user');
      
      // 验证平台服务的单例性
      const webPlatformService = webUserFeature.get(PlatformService);
      const mobilePlatformService = mobileUserFeature.get(PlatformService);
      expect(webPlatformService).toBe(mobilePlatformService);
      
      // 验证应用服务的隔离性
      const webAppService = webUserFeature.get(ApplicationService);
      const mobileAppService = mobileUserFeature.get(ApplicationService);
      expect(webAppService).not.toBe(mobileAppService);
    });
  });
});

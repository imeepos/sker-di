import 'reflect-metadata';
import { Injectable } from './injectable';
import { Inject } from './inject';
import { EnvironmentInjector } from './environment-injector';
import { IInjectorRegistry, INJECTOR_REGISTRY, InjectorRegistry } from './injector-registry';
import { IPlatformManager, PLATFORM_MANAGER, PlatformManager } from './platform-manager';

describe('第二阶段 DI 重构验证', () => {
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

  describe('✅ InjectorRegistry 服务 (取代静态单例)', () => {
    it('应该通过 InjectorRegistry 服务管理注入器生命周期', () => {
      const injectorRegistry = tempRootInjector.get(INJECTOR_REGISTRY);
      
      // 验证服务实例
      expect(injectorRegistry).toBeDefined();
      expect(injectorRegistry).toBeInstanceOf(InjectorRegistry);
      
      // 创建根注入器
      const rootInjector = injectorRegistry.createRootInjector([
        { provide: 'ROOT_TOKEN', useValue: 'root-value' }
      ]);
      
      expect(rootInjector).toBeDefined();
      expect(rootInjector.scope).toBe('root');
      expect(rootInjector.get('ROOT_TOKEN')).toBe('root-value');
      
      // 验证根注入器单例
      expect(injectorRegistry.getRootInjector()).toBe(rootInjector);
    });

    it('应该通过 InjectorRegistry 创建平台注入器', () => {
      const injectorRegistry = tempRootInjector.get(INJECTOR_REGISTRY);
      
      // 先创建根注入器
      injectorRegistry.createRootInjector();
      
      // 创建平台注入器
      const platformInjector = injectorRegistry.createPlatformInjector([
        { provide: 'PLATFORM_TOKEN', useValue: 'platform-value' }
      ]);
      
      expect(platformInjector).toBeDefined();
      expect(platformInjector.scope).toBe('platform');
      expect(platformInjector.get('PLATFORM_TOKEN')).toBe('platform-value');
      
      // 验证层次关系
      expect(platformInjector.parent).toBe(injectorRegistry.getRootInjector());
      expect(injectorRegistry.getPlatformInjector()).toBe(platformInjector);
    });

    it('应该通过 InjectorRegistry 创建应用注入器', () => {
      const injectorRegistry = tempRootInjector.get(INJECTOR_REGISTRY);
      
      // 创建根注入器和平台注入器
      injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector();
      
      // 创建应用注入器
      const appInjector = injectorRegistry.createApplicationInjector([
        { provide: 'APP_TOKEN', useValue: 'app-value' }
      ]);
      
      expect(appInjector).toBeDefined();
      expect(appInjector.scope).toBe('application');
      expect(appInjector.get('APP_TOKEN')).toBe('app-value');
      
      // 验证层次关系
      expect(appInjector.parent).toBe(platformInjector);
    });

    it('应该管理完整的注入器层次结构', () => {
      const injectorRegistry = tempRootInjector.get(INJECTOR_REGISTRY);
      
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
      
      // 验证服务可以从底层访问所有层级
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
  });

  describe('✅ PlatformManager 服务 (取代 GlobalPlatform 单例)', () => {
    it('应该通过 PlatformManager 服务管理平台实例', () => {
      const platformManager = tempRootInjector.get(PLATFORM_MANAGER);
      
      // 验证服务实例
      expect(platformManager).toBeDefined();
      expect(platformManager).toBeInstanceOf(PlatformManager);
      
      // 初始状态应该没有平台
      expect(platformManager.getCurrentPlatform()).toBeNull();
      expect(platformManager.hasPlatform()).toBe(false);
    });

    it('应该正确管理平台生命周期', () => {
      const platformManager = tempRootInjector.get(PLATFORM_MANAGER);
      
      // 创建模拟平台
      const mockPlatform = {
        destroyed: false,
        destroy: jest.fn()
      } as any;
      
      // 设置平台
      platformManager.setPlatform(mockPlatform);
      expect(platformManager.getCurrentPlatform()).toBe(mockPlatform);
      expect(platformManager.hasPlatform()).toBe(true);
      
      // 销毁当前平台
      const destroyed = platformManager.destroyCurrentPlatform();
      expect(destroyed).toBe(true);
      expect(mockPlatform.destroy).toHaveBeenCalled();
      expect(platformManager.getCurrentPlatform()).toBeNull();
      
      // 清除平台
      platformManager.clearPlatform();
      expect(platformManager.getCurrentPlatform()).toBeNull();
    });

    it('应该防止重复设置平台', () => {
      const platformManager = tempRootInjector.get(PLATFORM_MANAGER);
      
      const mockPlatform1 = { destroyed: false } as any;
      const mockPlatform2 = { destroyed: false } as any;
      
      // 设置第一个平台
      platformManager.setPlatform(mockPlatform1);
      
      // 尝试设置第二个平台应该失败
      expect(() => {
        platformManager.setPlatform(mockPlatform2);
      }).toThrow('A platform instance already exists. Only one platform can exist at a time. Call clearPlatform() or destroyCurrentPlatform() first.');
    });
  });

  describe('✅ DI 原则验证: "一切皆服务，一切皆可注入"', () => {
    it('应该通过依赖注入获取所有管理服务', () => {
      // 创建测试注入器，包含所有必要的DI服务
      const testInjector = new EnvironmentInjector([
        { provide: INJECTOR_REGISTRY, useClass: InjectorRegistry },
        { provide: PLATFORM_MANAGER, useClass: PlatformManager }
      ], undefined, 'root');
      
      // 验证所有管理服务都可以通过DI获取
      const injectorRegistry = testInjector.get(INJECTOR_REGISTRY);
      const platformManager = testInjector.get(PLATFORM_MANAGER);
      
      expect(injectorRegistry).toBeInstanceOf(InjectorRegistry);
      expect(platformManager).toBeInstanceOf(PlatformManager);
      
      // 清理
      testInjector.destroy();
    });

    it('应该支持服务间的依赖注入', () => {
      @Injectable({ providedIn: 'root' })
      class TestService {
        constructor(
          @Inject(INJECTOR_REGISTRY) private injectorRegistry: IInjectorRegistry,
          @Inject(PLATFORM_MANAGER) private platformManager: IPlatformManager
        ) {}
        
        createTestHierarchy() {
          this.injectorRegistry.createRootInjector();
          const platformInjector = this.injectorRegistry.createPlatformInjector();
          const appInjector = this.injectorRegistry.createApplicationInjector();
          return { platformInjector, appInjector };
        }
        
        getPlatform() {
          return this.platformManager.getCurrentPlatform();
        }
      }
      
      const testInjector = new EnvironmentInjector([
        { provide: INJECTOR_REGISTRY, useClass: InjectorRegistry },
        { provide: PLATFORM_MANAGER, useClass: PlatformManager },
        TestService
      ], undefined, 'root');
      
      const testService = testInjector.get(TestService);
      expect(testService).toBeDefined();
      
      // 验证服务可以使用注入的依赖
      const { platformInjector, appInjector } = testService.createTestHierarchy();
      expect(platformInjector).toBeDefined();
      expect(appInjector).toBeDefined();
      expect(appInjector.parent).toBe(platformInjector);
      
      expect(testService.getPlatform()).toBeNull(); // 没有设置平台
      
      // 清理
      testInjector.destroy();
    });
  });

  describe('🚫 静态单例模式已完全移除', () => {
    it('EnvironmentInjector 不再有静态单例字段', () => {
      // 验证静态字段已被移除
      expect((EnvironmentInjector as any).rootInjectorInstance).toBeUndefined();
      expect((EnvironmentInjector as any).platformInjectorInstance).toBeUndefined();
    });

    it('EnvironmentInjector 不再有静态管理方法', () => {
      // 验证静态方法已被移除
      expect((EnvironmentInjector as any).createRootInjector).toBeUndefined();
      expect((EnvironmentInjector as any).getRootInjector).toBeUndefined();
      expect((EnvironmentInjector as any).resetRootInjector).toBeUndefined();
      expect((EnvironmentInjector as any).createPlatformInjector).toBeUndefined();
      expect((EnvironmentInjector as any).getPlatformInjector).toBeUndefined();
      expect((EnvironmentInjector as any).resetPlatformInjector).toBeUndefined();
      expect((EnvironmentInjector as any).createApplicationInjector).toBeUndefined();
      expect((EnvironmentInjector as any).createFeatureInjector).toBeUndefined();
    });
  });
});
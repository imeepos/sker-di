import 'reflect-metadata';
import { Injectable } from './injectable';
import { EnvironmentInjector } from './environment-injector';
import { IInjectorRegistry, INJECTOR_REGISTRY, InjectorRegistry } from './injector-registry';
import { IPlatformManager, PLATFORM_MANAGER, PlatformManager } from './platform-manager';

describe('平台注入器单例测试', () => {
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

  @Injectable({ providedIn: 'platform' })
  class PlatformService {
    getValue() { return 'platform-service'; }
  }

  @Injectable({ providedIn: 'root' })
  class RootService {
    getValue() { return 'root-service'; }
  }

  describe('单例行为', () => {
    it('应该只允许创建一个平台注入器', () => {
      // 先创建根注入器
      const rootInjector = injectorRegistry.createRootInjector();
      
      // 第一次创建平台注入器应该成功
      const platformInjector1 = injectorRegistry.createPlatformInjector([
        { provide: 'PLATFORM_CONFIG', useValue: { version: '1.0.0' } }
      ]);
      
      expect(platformInjector1).toBeDefined();
      expect(platformInjector1.scope).toBe('platform');
      expect(platformInjector1.parent).toBe(rootInjector);
      
      // 第二次创建应该抛出错误
      expect(() => {
        injectorRegistry.createPlatformInjector([
          { provide: 'ANOTHER_CONFIG', useValue: { version: '2.0.0' } }
        ]);
      }).toThrow('Platform injector already exists. Call resetPlatformInjector() first to recreate it.');
    });

    it('getPlatformInjector 应该返回已创建的平台注入器', () => {
      // 初始状态应该返回 null
      expect(injectorRegistry.getPlatformInjector()).toBeNull();
      
      // 创建根注入器和平台注入器
      injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector([
        { provide: 'TEST_TOKEN', useValue: 'test-value' }
      ]);
      
      // 获取应该返回同一个实例
      const retrievedInjector = injectorRegistry.getPlatformInjector();
      expect(retrievedInjector).toBe(platformInjector);
      expect(retrievedInjector?.get('TEST_TOKEN')).toBe('test-value');
    });

    it('resetPlatformInjector 应该允许重新创建平台注入器', () => {
      // 创建根注入器和第一个平台注入器
      injectorRegistry.createRootInjector();
      const platformInjector1 = injectorRegistry.createPlatformInjector([
        { provide: 'CONFIG1', useValue: 'value1' }
      ]);
      
      expect(platformInjector1.get('CONFIG1')).toBe('value1');
      expect(injectorRegistry.getPlatformInjector()).toBe(platformInjector1);
      
      // 重置平台注入器
      injectorRegistry.resetPlatformInjector();
      expect(injectorRegistry.getPlatformInjector()).toBeNull();
      
      // 现在应该可以创建新的平台注入器
      const platformInjector2 = injectorRegistry.createPlatformInjector([
        { provide: 'CONFIG2', useValue: 'value2' }
      ]);
      
      expect(platformInjector2).not.toBe(platformInjector1);
      expect(platformInjector2.get('CONFIG2')).toBe('value2');
      expect(injectorRegistry.getPlatformInjector()).toBe(platformInjector2);
      
      // 第一个注入器应该已经被销毁
      expect(() => platformInjector1.get('CONFIG1')).toThrow();
    });

    it('resetRootInjector 应该同时重置平台注入器', () => {
      // 创建根注入器和平台注入器
      const rootInjector = injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector();
      
      expect(injectorRegistry.getRootInjector()).toBe(rootInjector);
      expect(injectorRegistry.getPlatformInjector()).toBe(platformInjector);
      
      // 重置根注入器应该同时重置平台注入器
      injectorRegistry.resetRootInjector();
      
      expect(injectorRegistry.getRootInjector()).toBeNull();
      expect(injectorRegistry.getPlatformInjector()).toBeNull();
    });
  });

  describe('依赖关系', () => {
    it('平台注入器必须在根注入器之后创建', () => {
      // 现在的逻辑是自动创建根注入器，所以直接测试创建成功
      const platformInjector = injectorRegistry.createPlatformInjector();
      expect(platformInjector).toBeDefined();
      
      // 验证根注入器已被自动创建
      expect(injectorRegistry.getRootInjector()).toBeDefined();
      expect(platformInjector.parent).toBe(injectorRegistry.getRootInjector());
    });

    it('应用注入器应该能使用全局平台注入器', () => {
      // 创建根注入器和平台注入器
      injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector([
        { provide: 'PLATFORM_TOKEN', useValue: 'platform-value' }
      ]);
      
      // 创建多个应用注入器，都使用同一个平台注入器
      const app1Injector = injectorRegistry.createApplicationInjector([
        { provide: 'APP1_TOKEN', useValue: 'app1-value' }
      ]);

      const app2Injector = injectorRegistry.createApplicationInjector([
        { provide: 'APP2_TOKEN', useValue: 'app2-value' }
      ]);
      
      // 验证都使用同一个平台注入器
      expect(app1Injector.parent).toBe(platformInjector);
      expect(app2Injector.parent).toBe(platformInjector);
      
      // 验证都能访问平台服务
      expect(app1Injector.get('PLATFORM_TOKEN')).toBe('platform-value');
      expect(app2Injector.get('PLATFORM_TOKEN')).toBe('platform-value');
      
      // 验证应用服务的隔离
      expect(app1Injector.get('APP1_TOKEN')).toBe('app1-value');
      expect(app2Injector.get('APP2_TOKEN')).toBe('app2-value');
      
      expect(() => app1Injector.get('APP2_TOKEN')).toThrow();
      expect(() => app2Injector.get('APP1_TOKEN')).toThrow();
    });
  });

  describe('服务解析', () => {
    it('platform 服务应该在平台注入器中正确解析', () => {
      injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector();
      
      const service = platformInjector.get(PlatformService);
      expect(service).toBeInstanceOf(PlatformService);
      expect(service.getValue()).toBe('platform-service');
      
      // 同一个注入器中应该返回相同实例
      const service2 = platformInjector.get(PlatformService);
      expect(service2).toBe(service);
    });

    it('子注入器应该能继承平台注入器的服务', () => {
      injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector();
      const appInjector = injectorRegistry.createApplicationInjector();
      
      const platformService1 = platformInjector.get(PlatformService);
      const platformService2 = appInjector.get(PlatformService);
      
      // 应该是同一个实例（从平台注入器继承）
      expect(platformService1).toBe(platformService2);
    });

    it('平台注入器应该能访问根注入器的服务', () => {
      injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector();
      
      const rootService = platformInjector.get(RootService);
      expect(rootService).toBeInstanceOf(RootService);
      expect(rootService.getValue()).toBe('root-service');
    });

    it('多个应用应该共享平台服务实例', () => {
      injectorRegistry.createRootInjector();
      const platformInjector = injectorRegistry.createPlatformInjector();
      const app1Injector = injectorRegistry.createApplicationInjector();
      const app2Injector = injectorRegistry.createApplicationInjector();
      
      const platformService1 = app1Injector.get(PlatformService);
      const platformService2 = app2Injector.get(PlatformService);
      const platformService3 = platformInjector.get(PlatformService);
      
      // 所有应该是同一个实例
      expect(platformService1).toBe(platformService2);
      expect(platformService2).toBe(platformService3);
    });
  });

  describe('错误处理', () => {
    it('应该提供清晰的错误信息', () => {
      injectorRegistry.createRootInjector();
      injectorRegistry.createPlatformInjector();
      
      expect(() => {
        injectorRegistry.createPlatformInjector();
      }).toThrow('Platform injector already exists. Call resetPlatformInjector() first to recreate it.');
    });

    it('重置不存在的平台注入器应该安全', () => {
      expect(injectorRegistry.getPlatformInjector()).toBeNull();
      
      // 重置不存在的平台注入器不应该抛出错误
      expect(() => {
        injectorRegistry.resetPlatformInjector();
      }).not.toThrow();
      
      expect(injectorRegistry.getPlatformInjector()).toBeNull();
    });
  });
});

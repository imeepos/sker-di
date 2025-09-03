import 'reflect-metadata';
import { Injectable } from './injectable';
import { 
  createRootInjector, 
  createPlatformInjector,
  createApplicationInjector,
  getRootInjector,
  getPlatformInjector,
  resetRootInjector,
  resetPlatformInjector
} from './index';

describe('平台注入器单例测试', () => {
  // 在每个测试后重置注入器
  afterEach(() => {
    resetRootInjector(); // 这会同时重置平台注入器
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
      const rootInjector = createRootInjector();
      
      // 第一次创建平台注入器应该成功
      const platformInjector1 = createPlatformInjector([
        { provide: 'PLATFORM_CONFIG', useValue: { version: '1.0.0' } }
      ]);
      
      expect(platformInjector1).toBeDefined();
      expect(platformInjector1.scope).toBe('platform');
      expect(platformInjector1.parent).toBe(rootInjector);
      
      // 第二次创建应该抛出错误
      expect(() => {
        createPlatformInjector([
          { provide: 'ANOTHER_CONFIG', useValue: { version: '2.0.0' } }
        ]);
      }).toThrow('Platform injector already exists! Platform injector must be globally unique.');
    });

    it('getPlatformInjector 应该返回已创建的平台注入器', () => {
      // 初始状态应该返回 null
      expect(getPlatformInjector()).toBeNull();
      
      // 创建根注入器和平台注入器
      createRootInjector();
      const platformInjector = createPlatformInjector([
        { provide: 'TEST_TOKEN', useValue: 'test-value' }
      ]);
      
      // 获取应该返回同一个实例
      const retrievedInjector = getPlatformInjector();
      expect(retrievedInjector).toBe(platformInjector);
      expect(retrievedInjector?.get('TEST_TOKEN')).toBe('test-value');
    });

    it('resetPlatformInjector 应该允许重新创建平台注入器', () => {
      // 创建根注入器和第一个平台注入器
      createRootInjector();
      const platformInjector1 = createPlatformInjector([
        { provide: 'CONFIG1', useValue: 'value1' }
      ]);
      
      expect(platformInjector1.get('CONFIG1')).toBe('value1');
      expect(getPlatformInjector()).toBe(platformInjector1);
      
      // 重置平台注入器
      resetPlatformInjector();
      expect(getPlatformInjector()).toBeNull();
      
      // 现在应该可以创建新的平台注入器
      const platformInjector2 = createPlatformInjector([
        { provide: 'CONFIG2', useValue: 'value2' }
      ]);
      
      expect(platformInjector2).not.toBe(platformInjector1);
      expect(platformInjector2.get('CONFIG2')).toBe('value2');
      expect(getPlatformInjector()).toBe(platformInjector2);
      
      // 第一个注入器应该已经被销毁
      expect(() => platformInjector1.get('CONFIG1')).toThrow();
    });

    it('resetRootInjector 应该同时重置平台注入器', () => {
      // 创建根注入器和平台注入器
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      
      expect(getRootInjector()).toBe(rootInjector);
      expect(getPlatformInjector()).toBe(platformInjector);
      
      // 重置根注入器应该同时重置平台注入器
      resetRootInjector();
      
      expect(getRootInjector()).toBeNull();
      expect(getPlatformInjector()).toBeNull();
    });
  });

  describe('依赖关系', () => {
    it('平台注入器必须在根注入器之后创建', () => {
      // 没有根注入器时创建平台注入器应该失败
      expect(() => {
        createPlatformInjector();
      }).toThrow('Root injector not found! Please create a root injector first using createRootInjector() before creating platform injector.');
      
      // 创建根注入器后应该成功
      createRootInjector();
      const platformInjector = createPlatformInjector();
      expect(platformInjector).toBeDefined();
    });

    it('应用注入器应该能使用全局平台注入器', () => {
      // 创建根注入器和平台注入器
      createRootInjector();
      const platformInjector = createPlatformInjector([
        { provide: 'PLATFORM_TOKEN', useValue: 'platform-value' }
      ]);
      
      // 创建多个应用注入器，都使用同一个平台注入器
      const app1Injector = createApplicationInjector([
        { provide: 'APP1_TOKEN', useValue: 'app1-value' }
      ], platformInjector);
      
      const app2Injector = createApplicationInjector([
        { provide: 'APP2_TOKEN', useValue: 'app2-value' }
      ], platformInjector);
      
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
      createRootInjector();
      const platformInjector = createPlatformInjector();
      
      const service = platformInjector.get(PlatformService);
      expect(service).toBeInstanceOf(PlatformService);
      expect(service.getValue()).toBe('platform-service');
      
      // 同一个注入器中应该返回相同实例
      const service2 = platformInjector.get(PlatformService);
      expect(service2).toBe(service);
    });

    it('子注入器应该能继承平台注入器的服务', () => {
      createRootInjector();
      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector([], platformInjector);
      
      const platformService1 = platformInjector.get(PlatformService);
      const platformService2 = appInjector.get(PlatformService);
      
      // 应该是同一个实例（从平台注入器继承）
      expect(platformService1).toBe(platformService2);
    });

    it('平台注入器应该能访问根注入器的服务', () => {
      createRootInjector();
      const platformInjector = createPlatformInjector();
      
      const rootService = platformInjector.get(RootService);
      expect(rootService).toBeInstanceOf(RootService);
      expect(rootService.getValue()).toBe('root-service');
    });

    it('多个应用应该共享平台服务实例', () => {
      createRootInjector();
      const platformInjector = createPlatformInjector();
      const app1Injector = createApplicationInjector([], platformInjector);
      const app2Injector = createApplicationInjector([], platformInjector);
      
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
      createRootInjector();
      createPlatformInjector();
      
      expect(() => {
        createPlatformInjector();
      }).toThrow('Platform injector already exists! Platform injector must be globally unique.');
    });

    it('重置不存在的平台注入器应该安全', () => {
      expect(getPlatformInjector()).toBeNull();
      
      // 重置不存在的平台注入器不应该抛出错误
      expect(() => {
        resetPlatformInjector();
      }).not.toThrow();
      
      expect(getPlatformInjector()).toBeNull();
    });
  });
});

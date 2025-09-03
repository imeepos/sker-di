import 'reflect-metadata';
import { Injectable } from './injectable';
import { 
  createRootInjector, 
  getRootInjector,
  resetRootInjector,
  createPlatformInjector,
  createApplicationInjector 
} from './index';

describe('根注入器单例测试', () => {
  // 在每个测试后重置根注入器
  afterEach(() => {
    resetRootInjector();
  });

  @Injectable({ providedIn: 'root' })
  class RootService {
    getValue() { return 'root-service'; }
  }

  describe('单例行为', () => {
    it('应该只允许创建一个根注入器', () => {
      // 第一次创建应该成功
      const rootInjector1 = createRootInjector([
        { provide: 'CONFIG', useValue: { version: '1.0.0' } }
      ]);
      
      expect(rootInjector1).toBeDefined();
      expect(rootInjector1.scope).toBe('root');
      
      // 第二次创建应该抛出错误
      expect(() => {
        createRootInjector([
          { provide: 'ANOTHER_CONFIG', useValue: { version: '2.0.0' } }
        ]);
      }).toThrow('Root injector already exists! Root injector must be globally unique.');
    });

    it('getRootInjector 应该返回已创建的根注入器', () => {
      // 初始状态应该返回 null
      expect(getRootInjector()).toBeNull();
      
      // 创建根注入器
      const rootInjector = createRootInjector([
        { provide: 'TEST_TOKEN', useValue: 'test-value' }
      ]);
      
      // 获取应该返回同一个实例
      const retrievedInjector = getRootInjector();
      expect(retrievedInjector).toBe(rootInjector);
      expect(retrievedInjector?.get('TEST_TOKEN')).toBe('test-value');
    });

    it('resetRootInjector 应该允许重新创建根注入器', () => {
      // 创建第一个根注入器
      const rootInjector1 = createRootInjector([
        { provide: 'CONFIG1', useValue: 'value1' }
      ]);
      
      expect(rootInjector1.get('CONFIG1')).toBe('value1');
      expect(getRootInjector()).toBe(rootInjector1);
      
      // 重置根注入器
      resetRootInjector();
      expect(getRootInjector()).toBeNull();
      
      // 现在应该可以创建新的根注入器
      const rootInjector2 = createRootInjector([
        { provide: 'CONFIG2', useValue: 'value2' }
      ]);
      
      expect(rootInjector2).not.toBe(rootInjector1);
      expect(rootInjector2.get('CONFIG2')).toBe('value2');
      expect(getRootInjector()).toBe(rootInjector2);
      
      // 第一个注入器应该已经被销毁，无法使用
      expect(() => rootInjector1.get('CONFIG1')).toThrow();
    });
  });

  describe('与其他注入器的集成', () => {
    it('平台注入器应该自动使用全局根注入器作为父级', () => {
      // 先创建根注入器
      const rootInjector = createRootInjector([
        { provide: 'ROOT_CONFIG', useValue: 'root-value' }
      ]);
      
      // 创建平台注入器时不指定父级
      const platformInjector = createPlatformInjector([
        { provide: 'PLATFORM_CONFIG', useValue: 'platform-value' }
      ]);
      
      // 平台注入器应该能访问根注入器的服务
      expect(platformInjector.get('ROOT_CONFIG')).toBe('root-value');
      expect(platformInjector.get('PLATFORM_CONFIG')).toBe('platform-value');
      
      // 验证父子关系
      expect(platformInjector.parent).toBe(rootInjector);
    });

    it('如果没有根注入器，平台注入器应该抛出错误', () => {
      // 确保没有根注入器
      expect(getRootInjector()).toBeNull();

      // 尝试创建平台注入器应该抛出错误
      expect(() => {
        createPlatformInjector([
          { provide: 'PLATFORM_CONFIG', useValue: 'platform-value' }
        ]);
      }).toThrow('Root injector not found! Please create a root injector first using createRootInjector() before creating platform injector.');

      // 根注入器仍然应该是 null
      expect(getRootInjector()).toBeNull();
    });

    it('应该支持完整的层次结构', () => {
      // 创建根注入器
      const rootInjector = createRootInjector([
        { provide: 'ROOT_TOKEN', useValue: 'root' }
      ]);
      
      // 创建平台注入器
      const platformInjector = createPlatformInjector([
        { provide: 'PLATFORM_TOKEN', useValue: 'platform' }
      ]);
      
      // 创建应用注入器
      const appInjector = createApplicationInjector([
        { provide: 'APP_TOKEN', useValue: 'app' }
      ], platformInjector);
      
      // 验证层次关系
      expect(platformInjector.parent).toBe(rootInjector);
      expect(appInjector.parent).toBe(platformInjector);
      
      // 验证服务解析
      expect(appInjector.get('ROOT_TOKEN')).toBe('root');
      expect(appInjector.get('PLATFORM_TOKEN')).toBe('platform');
      expect(appInjector.get('APP_TOKEN')).toBe('app');
      
      // 验证 root 服务的自动解析
      const rootService = appInjector.get(RootService);
      expect(rootService.getValue()).toBe('root-service');
    });
  });

  describe('错误处理', () => {
    it('应该提供清晰的错误信息 - 重复创建根注入器', () => {
      createRootInjector();

      expect(() => {
        createRootInjector();
      }).toThrow('Root injector already exists! Root injector must be globally unique.');
    });

    it('应该提供清晰的错误信息 - 没有根注入器时创建平台注入器', () => {
      expect(getRootInjector()).toBeNull();

      expect(() => {
        createPlatformInjector();
      }).toThrow('Root injector not found! Please create a root injector first using createRootInjector() before creating platform injector.');
    });

    it('重置不存在的根注入器应该安全', () => {
      expect(getRootInjector()).toBeNull();

      // 重置不存在的根注入器不应该抛出错误
      expect(() => {
        resetRootInjector();
      }).not.toThrow();

      expect(getRootInjector()).toBeNull();
    });

    it('应该展示正确的创建顺序', () => {
      // ❌ 错误的顺序：先创建平台注入器
      expect(() => {
        createPlatformInjector();
      }).toThrow();

      // ✅ 正确的顺序：先创建根注入器
      const rootInjector = createRootInjector();
      expect(rootInjector).toBeDefined();

      // 然后创建平台注入器
      const platformInjector = createPlatformInjector();
      expect(platformInjector).toBeDefined();
      expect(platformInjector.parent).toBe(rootInjector);
    });
  });

  describe('服务解析', () => {
    it('root 服务应该在根注入器中正确解析', () => {
      const rootInjector = createRootInjector();
      
      const service = rootInjector.get(RootService);
      expect(service).toBeInstanceOf(RootService);
      expect(service.getValue()).toBe('root-service');
      
      // 同一个注入器中应该返回相同实例
      const service2 = rootInjector.get(RootService);
      expect(service2).toBe(service);
    });

    it('子注入器应该能继承根注入器的服务', () => {
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      
      const rootService1 = rootInjector.get(RootService);
      const rootService2 = platformInjector.get(RootService);
      
      // 应该是同一个实例（从根注入器继承）
      expect(rootService1).toBe(rootService2);
    });
  });
});

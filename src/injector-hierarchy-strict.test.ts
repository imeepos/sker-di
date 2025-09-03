import 'reflect-metadata';
import { Injectable } from './injectable';
import { 
  createRootInjector, 
  createPlatformInjector,
  createApplicationInjector,
  createFeatureInjector,
  resetRootInjector,
  getRootInjector
} from './index';

describe('严格的注入器层次结构测试', () => {
  afterEach(() => {
    resetRootInjector();
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

  describe('强制的层次结构', () => {
    it('必须按照正确的顺序创建注入器', () => {
      // ❌ 错误：没有根注入器就创建平台注入器
      expect(() => {
        createPlatformInjector();
      }).toThrow('Root injector not found! Please create a root injector first using createRootInjector() before creating platform injector.');

      // ✅ 正确：先创建根注入器
      const rootInjector = createRootInjector();
      expect(rootInjector).toBeDefined();
      expect(rootInjector.scope).toBe('root');

      // ✅ 正确：然后创建平台注入器（单例）
      const platformInjector = createPlatformInjector();
      expect(platformInjector).toBeDefined();
      expect(platformInjector.scope).toBe('platform');
      expect(platformInjector.parent).toBe(rootInjector);

      // ✅ 正确：然后创建应用注入器（自动使用全局平台注入器）
      const appInjector = createApplicationInjector();
      expect(appInjector).toBeDefined();
      expect(appInjector.scope).toBe('application');
      expect(appInjector.parent).toBe(platformInjector);

      // ✅ 正确：最后创建功能注入器
      const featureInjector = createFeatureInjector([], appInjector);
      expect(featureInjector).toBeDefined();
      expect(featureInjector.scope).toBe('feature');
      expect(featureInjector.parent).toBe(appInjector);
    });

    it('平台注入器自动使用全局根注入器', () => {
      const rootInjector = createRootInjector([
        { provide: 'ROOT_CONFIG', useValue: 'root-value' }
      ]);

      const platformInjector = createPlatformInjector([
        { provide: 'PLATFORM_CONFIG', useValue: 'platform-value' }
      ]);

      // 验证父子关系
      expect(platformInjector.parent).toBe(rootInjector);

      // 验证可以访问父级服务
      expect(platformInjector.get('ROOT_CONFIG')).toBe('root-value');
      expect(platformInjector.get('PLATFORM_CONFIG')).toBe('platform-value');
    });

    it('不能跳过层次创建注入器', () => {
      const rootInjector = createRootInjector();

      // ❌ 错误：没有平台注入器就创建应用注入器
      expect(() => {
        createApplicationInjector();
      }).toThrow('Platform injector not found!'); // 现在会强制检查平台注入器
    });
  });

  describe('层次结构的完整性', () => {
    it('应该支持完整的四层结构', () => {
      // 创建完整的层次结构
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector();
      const featureInjector = createFeatureInjector([], appInjector);

      // 验证层次关系
      expect(platformInjector.parent).toBe(rootInjector);
      expect(appInjector.parent).toBe(platformInjector);
      expect(featureInjector.parent).toBe(appInjector);

      // 从最底层获取所有服务
      const rootService = featureInjector.get(RootService);
      const platformService = featureInjector.get(PlatformService);
      const appService = featureInjector.get(ApplicationService);
      const featureService = featureInjector.get(FeatureService);

      expect(rootService.getValue()).toBe('root');
      expect(platformService.getValue()).toBe('platform');
      expect(appService.getValue()).toBe('application');
      expect(featureService.getValue()).toBe('feature');
    });

    it('服务应该在正确的层级实例化', () => {
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

  describe('错误处理和提示', () => {
    it('应该提供清晰的错误信息', () => {
      expect(() => {
        createPlatformInjector();
      }).toThrow('Root injector not found! Please create a root injector first using createRootInjector() before creating platform injector.');
    });

    it('应该防止重复创建根注入器', () => {
      createRootInjector();

      expect(() => {
        createRootInjector();
      }).toThrow('Root injector already exists! Root injector must be globally unique.');
    });

    it('应该防止重复创建平台注入器', () => {
      createRootInjector();
      createPlatformInjector();

      expect(() => {
        createPlatformInjector();
      }).toThrow('Platform injector already exists! Platform injector must be globally unique.');
    });

    it('重置后应该可以重新创建', () => {
      const rootInjector1 = createRootInjector();
      expect(getRootInjector()).toBe(rootInjector1);

      resetRootInjector();
      expect(getRootInjector()).toBeNull();

      const rootInjector2 = createRootInjector();
      expect(rootInjector2).not.toBe(rootInjector1);
      expect(getRootInjector()).toBe(rootInjector2);
    });
  });

  describe('类型安全', () => {
    it('应用注入器必须接受平台注入器作为父级', () => {
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();

      // ✅ 正确：自动使用全局平台注入器作为父级
      const appInjector = createApplicationInjector();
      expect(appInjector.parent).toBe(platformInjector);

      // 现在不需要传入平台注入器参数了
    });

    it('功能注入器必须接受应用注入器作为父级', () => {
      const rootInjector = createRootInjector();
      const platformInjector = createPlatformInjector();
      const appInjector = createApplicationInjector();

      // ✅ 正确：使用应用注入器作为父级
      const featureInjector = createFeatureInjector([], appInjector);
      expect(featureInjector.parent).toBe(appInjector);

      // TypeScript 应该阻止以下错误用法：
      // createFeatureInjector([], platformInjector); // 类型错误
    });
  });

  describe('实际使用场景', () => {
    it('应该支持典型的应用架构', () => {
      // 1. 应用启动时创建根注入器
      const rootInjector = createRootInjector([
        { provide: 'APP_VERSION', useValue: '1.0.0' }
      ]);

      // 2. 创建平台注入器（跨应用共享）
      const platformInjector = createPlatformInjector([
        { provide: 'PLATFORM_NAME', useValue: 'MyPlatform' }
      ]);

      // 3. 为每个应用创建应用注入器
      const webAppInjector = createApplicationInjector([
        { provide: 'APP_TYPE', useValue: 'web' }
      ]);

      const mobileAppInjector = createApplicationInjector([
        { provide: 'APP_TYPE', useValue: 'mobile' }
      ]);

      // 4. 为每个功能模块创建功能注入器
      const userFeatureInjector = createFeatureInjector([
        { provide: 'FEATURE_NAME', useValue: 'user-management' }
      ], webAppInjector);

      // 验证服务解析
      expect(userFeatureInjector.get('APP_VERSION')).toBe('1.0.0');
      expect(userFeatureInjector.get('PLATFORM_NAME')).toBe('MyPlatform');
      expect(userFeatureInjector.get('APP_TYPE')).toBe('web');
      expect(userFeatureInjector.get('FEATURE_NAME')).toBe('user-management');

      // 验证不同应用的隔离
      expect(webAppInjector.get('APP_TYPE')).toBe('web');
      expect(mobileAppInjector.get('APP_TYPE')).toBe('mobile');
    });
  });
});

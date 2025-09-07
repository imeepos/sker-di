// 使用标准的 Jest 全局变量，不需要从 @jest/globals 导入
import { createPlatformFactory, getPlatform, destroyPlatform } from './platform-factory';
import { PlatformRef, PlatformModule } from './platform-ref';
import { Module, ModuleUtils, moduleResolver, MODULE_METADATA_KEY } from './module-system';
import { 
  LoggerExtension, 
  HttpExtension, 
  StorageExtension, 
  RouterExtension,
  Logger,
  HttpClient,
  StorageService,
  Router,
  registerExtension,
  createExtensionManager 
} from './platform-extensions';
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';
import { Provider } from './provider';

describe('Platform Architecture 扩展性测试', () => {
  beforeEach(() => {
    // 重置全局状态
    destroyPlatform();
    moduleResolver.clear();
    // 重置根注入器和平台注入器
    require('./environment-injector').EnvironmentInjector.resetRootInjector();
    // 清理全局注入器实例以适配新架构
    (require('./environment-injector').EnvironmentInjector as any).rootInjectorInstance = null;
    (require('./environment-injector').EnvironmentInjector as any).platformInjectorInstance = null;
  });

  afterEach(() => {
    destroyPlatform();
    moduleResolver.clear();
    // 重置根注入器和平台注入器
    require('./environment-injector').EnvironmentInjector.resetRootInjector();
  });

  describe('🏗️ 基础平台工厂功能', () => {
    it('应该能创建基础平台', () => {
      // 🔴 Red: 编写失败测试
      const corePlatformFactory = createPlatformFactory(null, {
        config: { name: 'core', version: '1.0.0' },
        providers: [
          { provide: 'CORE_CONFIG', useValue: { debug: true } }
        ]
      });

      const platform = corePlatformFactory();

      expect(platform).toBeInstanceOf(PlatformRef);
      expect(platform.config.name).toBe('core');
      expect(platform.injector.get('CORE_CONFIG')).toEqual({ debug: true });
    });


    it('应该确保平台单例性', () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'singleton-test' },
        providers: []
      });

      const platform1 = platformFactory();
      const platform2 = platformFactory();

      expect(platform1).toBe(platform2);
    });
  });

  describe('🧩 模块化系统测试', () => {
    @Injectable()
    class UserService {
      getUsers() {
        return ['user1', 'user2'];
      }
    }

    @Injectable()
    class AdminService {
      constructor(private userService: UserService) {}

      getAdmins() {
        return ['admin1'];
      }
    }

    it('应该支持模块定义和解析', () => {
      @Module({
        name: 'UserModule',
        providers: [{ provide: UserService, useClass: UserService }],
        exports: [UserService]
      })
      class UserModule {}

      @Module({
        name: 'AdminModule',
        providers: [{ provide: AdminService, useClass: AdminService }],
        imports: [UserModule]
      })
      class AdminModule {}

      const resolved = moduleResolver.resolve(AdminModule);

      expect(resolved.moduleClass).toBe(AdminModule);
      expect(resolved.providers).toHaveLength(2); // UserService + AdminService
      expect(resolved.imports).toHaveLength(1);
    });

    it('应该支持 forRoot 和 forChild 模式', () => {
      @Module({
        providers: [{ provide: UserService, useClass: UserService }]
      })
      class UserModule {
        static forRoot() {
          return ModuleUtils.forRoot(UserModule, [
            { provide: 'ROOT_CONFIG', useValue: { isRoot: true } }
          ]);
        }

        static forChild() {
          return ModuleUtils.forChild(UserModule, [
            { provide: 'CHILD_CONFIG', useValue: { isChild: true } }
          ]);
        }
      }

      const rootModule = UserModule.forRoot();
      const childModule = UserModule.forChild();

      expect(rootModule.ngModule).toBe(UserModule);
      expect(rootModule.providers.some(p => 
        ('provide' in p) && p.provide === 'ROOT_CONFIG' && ('useValue' in p) && p.useValue?.isRoot
      )).toBe(true);

      expect(childModule.providers.some(p => 
        ('provide' in p) && p.provide === 'CHILD_CONFIG' && ('useValue' in p) && p.useValue?.isChild
      )).toBe(true);
    });

    it('应该检测循环模块依赖', () => {
      // 首先定义模块类
      class ModuleA {}
      class ModuleB {}

      // 然后手动设置循环依赖的元数据
      Reflect.defineMetadata(MODULE_METADATA_KEY, { name: 'ModuleA', imports: [ModuleB] }, ModuleA);
      Reflect.defineMetadata(MODULE_METADATA_KEY, { name: 'ModuleB', imports: [ModuleA] }, ModuleB);

      expect(() => {
        moduleResolver.resolve(ModuleA);
      }).toThrow(/Circular module dependency/);
    });
  });

  describe('🔌 平台扩展机制测试', () => {
    it('应该支持内置扩展', () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'extended-platform' },
        providers: [],
        extensions: [LoggerExtension, HttpExtension, StorageExtension]
      });

      const platform = platformFactory();

      // 验证扩展服务可用
      const logger = platform.injector.get(Logger);
      const http = platform.injector.get(HttpClient);
      const storage = platform.injector.get(StorageService);

      expect(logger).toBeInstanceOf(Logger);
      expect(http).toBeInstanceOf(HttpClient);
      expect(storage).toBeInstanceOf(StorageService);
    });

    it('应该支持自定义扩展', () => {
      // 定义自定义服务
      const CUSTOM_CONFIG = new InjectionToken<any>('CUSTOM_CONFIG');

      @Injectable({ providedIn: 'platform' })
      class CustomService {
        getValue() {
          return 'custom-value';
        }
      }

      // 定义自定义扩展
      const customExtension = {
        name: 'custom',
        providers: [
          { provide: CustomService, useClass: CustomService },
          { provide: CUSTOM_CONFIG, useValue: { custom: true } }
        ],
        initialize: jest.fn()
      };

      registerExtension(customExtension);

      const platformFactory = createPlatformFactory(null, {
        config: { name: 'custom-platform' },
        providers: [],
        extensions: [customExtension]
      });

      const platform = platformFactory();
      const customService = platform.injector.get(CustomService);
      const config = platform.injector.get(CUSTOM_CONFIG);

      expect(customService.getValue()).toBe('custom-value');
      expect(config.custom).toBe(true);
      expect(customExtension.initialize).toHaveBeenCalledWith(platform);
    });

    it('应该支持扩展依赖管理', async () => {
      const extensionManager = createExtensionManager();
      
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'dependency-test' },
        providers: [],
        extensions: [LoggerExtension, HttpExtension] // 预先添加所有扩展
      });

      const platform = platformFactory();

      // 安装http扩展（应该自动解析logger依赖）
      await extensionManager.install(platform, ['logger']);
      await extensionManager.install(platform, ['http']);

      expect(extensionManager.isInstalled('logger')).toBe(true);
      expect(extensionManager.isInstalled('http')).toBe(true);
    });
  });

  describe('🚀 应用引导测试', () => {
    @Injectable()
    class AppComponent {
      constructor(private logger: Logger) {}

      start() {
        this.logger.info('Application started');
        return 'app-started';
      }
    }

    it('应该能引导应用', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'app-platform' },
        providers: [],
        extensions: [LoggerExtension]
      });

      const platform = platformFactory();
      
      const app = await platform.bootstrapApplication([
        { provide: AppComponent, useClass: AppComponent }
      ]);

      expect(app.isDestroyed).toBe(false);
      
      const component = app.bootstrap(AppComponent) as AppComponent;
      expect(component.start()).toBe('app-started');
    });

    it('应该支持多应用引导', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'multi-app-platform' },
        providers: [],
        extensions: [LoggerExtension]
      });

      const platform = platformFactory();

      const app1 = await platform.bootstrapApplication('app1', []);
      const app2 = await platform.bootstrapApplication('app2', []);

      expect(platform.getApplication('app1')).toBe(app1);
      expect(platform.getApplication('app2')).toBe(app2);
      expect(platform.getApplications()).toHaveLength(2);
    });

    it('应该正确处理应用生命周期', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'lifecycle-platform' },
        providers: []
      });

      const platform = platformFactory();
      const app = await platform.bootstrapApplication([]);

      expect(app.isDestroyed).toBe(false);

      app.destroy();
      expect(app.isDestroyed).toBe(true);

      expect(() => app.bootstrap()).toThrow(/Cannot bootstrap destroyed application/);
    });
  });

  describe('🌐 Web平台示例', () => {
    it('应该能创建完整的Web平台', async () => {
      // 创建Web平台（包含所有服务）
      const webPlatform = createPlatformFactory(null, {
        config: { name: 'web', version: '2.0.0', enableDebug: true },
        providers: [
          { provide: 'ENVIRONMENT', useValue: 'production' },
          { provide: 'PLATFORM_TYPE', useValue: 'web' }
        ],
        extensions: [
          LoggerExtension,
          HttpExtension,
          StorageExtension,
          RouterExtension
        ]
      });

      const platform = webPlatform();
      
      // 引导Web应用
      const app = await platform.bootstrapApplication([
        { provide: 'APP_NAME', useValue: 'My Web App' }
      ]);

      // 验证平台服务
      expect(platform.injector.get('ENVIRONMENT')).toBe('production');
      expect(platform.injector.get('PLATFORM_TYPE')).toBe('web');

      // 验证扩展服务
      const logger = platform.injector.get(Logger);
      const http = platform.injector.get(HttpClient);
      const storage = platform.injector.get(StorageService);
      const router = platform.injector.get(Router);

      expect(logger).toBeInstanceOf(Logger);
      expect(http).toBeInstanceOf(HttpClient);
      expect(storage).toBeInstanceOf(StorageService);
      expect(router).toBeInstanceOf(Router);

      // 验证应用服务
      expect(app.injector.get('APP_NAME')).toBe('My Web App');

      // 测试服务交互
      logger.info('Web platform test completed');
      router.navigate('/test');
      await http.get('/api/test');
      storage.set('test-key', 'test-value');

      expect(router.getCurrentPath()).toBe('/current-path');
      expect(storage.get('test-key')).toBe('mock-value-test-key');
    });
  });

  describe('🧪 边界情况和错误处理', () => {
    it('应该处理平台销毁', () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'destroy-test' },
        providers: []
      });

      const platform = platformFactory();
      expect(platform.destroyed).toBe(false);

      platform.destroy();
      expect(platform.destroyed).toBe(true);

      // 销毁后不能引导应用
      expect(() => platform.bootstrapApplication()).rejects.toThrow(
        /Cannot bootstrap application on destroyed platform/
      );
    });

    it('应该处理重复平台创建', () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'duplicate-test' },
        providers: []
      });

      const platform1 = platformFactory();
      const platform2 = platformFactory();

      expect(platform1).toBe(platform2); // 应该返回同一实例
    });

    it('应该处理扩展初始化失败', async () => {
      const faultyExtension = {
        name: 'faulty',
        providers: [],
        initialize: jest.fn().mockRejectedValue(new Error('Init failed'))
      };

      const platformFactory = createPlatformFactory(null, {
        config: { name: 'faulty-platform' },
        providers: [],
        extensions: [faultyExtension]
      });

      // 应该能处理扩展初始化失败而不影响平台创建
      expect(() => platformFactory()).not.toThrow();
    });
  });

  describe('🔍 调试和监控', () => {
    it('应该提供平台调试信息', () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'debug-platform', enableDebug: true },
        providers: [
          { provide: 'TEST_SERVICE', useValue: 'test' }
        ],
        extensions: [LoggerExtension]
      });

      const platform = platformFactory();
      
      // 验证调试配置
      expect(platform.config.enableDebug).toBe(true);
      expect(platform.config.name).toBe('debug-platform');

      // 验证注入器调试功能
      expect(platform.injector.getInjectorId()).toBeDefined();
      expect(platform.injector.getDebugSnapshot()).toMatchObject({
        type: 'EnvironmentInjector',
        isDestroyed: false
      });
    });
  });
});
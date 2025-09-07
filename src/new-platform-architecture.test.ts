import { 
  createPlatformFactory,
  getPlatform,
  destroyPlatform,
  hasPlatform,
  ApplicationFeature,
  ApplicationState,
  provideApplicationConfig,
  ApplicationConfig
} from './index';

describe('新平台架构', () => {
  afterEach(() => {
    // 每个测试后清理平台
    destroyPlatform();
    // 清理全局注入器实例
    (require('./environment-injector').EnvironmentInjector as any).rootInjectorInstance = null;
    (require('./environment-injector').EnvironmentInjector as any).platformInjectorInstance = null;
  });

  describe('单一平台原则', () => {
    it('应该只允许存在一个平台实例', () => {
      // 创建第一个平台
      const platformFactory1 = createPlatformFactory(null, {
        config: { name: 'platform1', version: '1.0.0' },
        providers: []
      });

      const platform1 = platformFactory1();
      expect(hasPlatform()).toBe(true);
      expect(getPlatform()).toBe(platform1);

      // 尝试创建第二个平台
      const platformFactory2 = createPlatformFactory(null, {
        config: { name: 'platform2', version: '1.0.0' },
        providers: []
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const platform2 = platformFactory2();
      
      // 应该返回同一个平台实例，并显示警告
      expect(platform2).toBe(platform1);
      expect(consoleSpy).toHaveBeenCalledWith('Platform already exists. Returning existing platform instance.');
      
      consoleSpy.mockRestore();
    });

    it('应该能正确销毁和重新创建平台', () => {
      // 创建平台
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'test-platform', version: '1.0.0' },
        providers: []
      });

      const platform = platformFactory();
      expect(hasPlatform()).toBe(true);

      // 销毁平台
      const destroyed = destroyPlatform();
      expect(destroyed).toBe(true);
      expect(hasPlatform()).toBe(false);
      expect(getPlatform()).toBeNull();

      // 重新创建平台
      const newPlatform = platformFactory();
      expect(hasPlatform()).toBe(true);
      expect(newPlatform).not.toBe(platform); // 应该是新实例
    });
  });

  describe('多应用管理', () => {
    it('应该支持在单一平台上运行多个应用', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'multi-app-platform', version: '1.0.0' },
        providers: []
      });

      const platform = platformFactory();

      // 创建第一个应用
      const app1 = await platform.bootstrapApplication('app1', [
        ...provideApplicationConfig({
          name: 'web-app-1',
          version: '1.0.0'
        } as ApplicationConfig),
        { provide: 'APP1_SERVICE', useValue: 'service1' }
      ]);

      // 创建第二个应用
      const app2 = await platform.bootstrapApplication('app2', [
        ...provideApplicationConfig({
          name: 'web-app-2',
          version: '1.0.0'
        } as ApplicationConfig),
        { provide: 'APP2_SERVICE', useValue: 'service2' }
      ]);

      // 验证平台管理多个应用
      expect(platform.getApplications()).toHaveLength(2);
      expect(platform.getApplicationIds()).toEqual(['app1', 'app2']);
      
      expect(platform.getApplication('app1')).toBe(app1);
      expect(platform.getApplication('app2')).toBe(app2);

      // 验证应用属性
      expect(app1.id).toBe('app1');
      expect(app1.name).toBe('web-app-1');
      expect(app1.state).toBe(ApplicationState.RUNNING);
      
      expect(app2.id).toBe('app2'); 
      expect(app2.name).toBe('web-app-2');
      expect(app2.state).toBe(ApplicationState.RUNNING);

      // 验证应用隔离
      expect(app1.injector.get('APP1_SERVICE')).toBe('service1');
      expect(() => app1.injector.get('APP2_SERVICE')).toThrow();
      
      expect(app2.injector.get('APP2_SERVICE')).toBe('service2');
      expect(() => app2.injector.get('APP1_SERVICE')).toThrow();
    });

    it('应该支持独立销毁应用', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'destroy-app-platform', version: '1.0.0' },
        providers: []
      });

      const platform = platformFactory();

      // 创建两个应用
      const app1 = await platform.bootstrapApplication('app1', []);
      const app2 = await platform.bootstrapApplication('app2', []);

      expect(platform.getApplications()).toHaveLength(2);

      // 销毁第一个应用
      const destroyed = await platform.destroyApplication('app1');
      expect(destroyed).toBe(true);
      expect(app1.isDestroyed).toBe(true);
      expect(app1.state).toBe(ApplicationState.DESTROYED);
      
      // 第二个应用仍然运行
      expect(platform.getApplications()).toHaveLength(1);
      expect(platform.getApplication('app1')).toBeUndefined();
      expect(platform.getApplication('app2')).toBe(app2);
      expect(app2.isDestroyed).toBe(false);

      // 尝试销毁不存在的应用
      const notDestroyed = await platform.destroyApplication('nonexistent');
      expect(notDestroyed).toBe(false);
    });
  });

  describe('Feature插件系统', () => {
    it('应该支持加载和卸载Features', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'feature-platform', version: '1.0.0' },
        providers: []
      });

      const platform = platformFactory();

      // 定义Features
      const loggerFeature: ApplicationFeature = {
        name: 'logger',
        version: '1.0.0',
        providers: [
          { provide: 'LOGGER', useValue: { log: jest.fn() } }
        ],
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      const httpFeature: ApplicationFeature = {
        name: 'http',
        version: '2.0.0',
        dependencies: ['logger'],
        providers: [
          { provide: 'HTTP_CLIENT', useValue: { get: jest.fn() } }
        ],
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      // 创建带Features的应用
      const app = await platform.bootstrapApplication('feature-app', [], [
        loggerFeature
      ]);

      // 验证Feature已加载
      expect(app.features.size).toBe(1);
      expect(app.features.has('logger')).toBe(true);
      expect(loggerFeature.initialize).toHaveBeenCalledWith(app);

      // 加载依赖Feature
      await app.loadFeature(httpFeature);
      expect(app.features.size).toBe(2);
      expect(app.features.has('http')).toBe(true);
      expect(httpFeature.initialize).toHaveBeenCalledWith(app);

      // 卸载Feature (应该失败，因为有依赖)
      await expect(app.unloadFeature('logger')).rejects.toThrow(
        "Cannot unload feature 'logger' because 'http' depends on it"
      );

      // 先卸载依赖的Feature
      await app.unloadFeature('http');
      expect(app.features.size).toBe(1);
      expect(httpFeature.destroy).toHaveBeenCalledWith(app);

      // 再卸载基础Feature
      await app.unloadFeature('logger');
      expect(app.features.size).toBe(0);
      expect(loggerFeature.destroy).toHaveBeenCalledWith(app);
    });

    it('应该检查Feature依赖', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'dep-platform', version: '1.0.0' },
        providers: []
      });

      const platform = platformFactory();
      const app = await platform.bootstrapApplication('dep-app', []);

      const dependentFeature: ApplicationFeature = {
        name: 'dependent',
        dependencies: ['missing-feature'],
        initialize: jest.fn()
      };

      // 加载依赖缺失的Feature应该失败
      await expect(app.loadFeature(dependentFeature)).rejects.toThrow(
        "Feature 'dependent' depends on 'missing-feature', but it is not loaded"
      );
      
      expect(dependentFeature.initialize).not.toHaveBeenCalled();
    });

    it('应该支持重新加载Feature', async () => {
      // 🔴 Red: 编写失败测试
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'reload-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();
      
      const reloadableFeature: ApplicationFeature = {
        name: 'reloadable',
        version: '1.0.0',
        providers: [
          { provide: 'FEATURE_DATA', useValue: 'initial-value' }
        ],
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      // 创建应用并加载初始Feature
      const app = await platform.bootstrapApplication('reload-app', [], [
        reloadableFeature
      ]);

      expect(app.features.size).toBe(1);
      expect(reloadableFeature.initialize).toHaveBeenCalledWith(app);
      expect(reloadableFeature.initialize).toHaveBeenCalledTimes(1);

      // 重新加载Feature（应该先销毁，再重新加载）
      const updatedFeature: ApplicationFeature = {
        name: 'reloadable',
        version: '2.0.0',
        providers: [
          { provide: 'FEATURE_DATA', useValue: 'updated-value' }
        ],
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      await app.reloadFeature(updatedFeature); // ❌ 这会失败 - 方法不存在

      // 验证旧Feature被销毁
      expect(reloadableFeature.destroy).toHaveBeenCalledWith(app);
      expect(reloadableFeature.destroy).toHaveBeenCalledTimes(1);

      // 验证新Feature被加载
      expect(updatedFeature.initialize).toHaveBeenCalledWith(app);
      expect(updatedFeature.initialize).toHaveBeenCalledTimes(1);

      // 验证Feature被更新
      expect(app.features.size).toBe(1);
      expect(app.features.get('reloadable')?.version).toBe('2.0.0');
    });

    it('应该处理重新加载不存在的Feature', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'new-feature-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();
      const app = await platform.bootstrapApplication('new-feature-app', []);
      
      const newFeature: ApplicationFeature = {
        name: 'new-feature',
        version: '1.0.0',
        initialize: jest.fn()
      };

      // 重新加载不存在的Feature应该像loadFeature一样工作
      await app.reloadFeature(newFeature); // ❌ 这会失败 - 方法不存在
      
      expect(app.features.size).toBe(1);
      expect(newFeature.initialize).toHaveBeenCalledWith(app);
    });

    it('应该处理重新加载时的依赖检查', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'dep-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();
      
      const baseFeature: ApplicationFeature = {
        name: 'base',
        version: '1.0.0',
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      const dependentFeature: ApplicationFeature = {
        name: 'dependent',
        version: '1.0.0',
        dependencies: ['base'],
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      // 创建应用并加载Features
      const app = await platform.bootstrapApplication('dep-app', [], [
        baseFeature
      ]);
      await app.loadFeature(dependentFeature);

      // 尝试重新加载基础Feature
      const updatedBaseFeature: ApplicationFeature = {
        name: 'base',
        version: '2.0.0',
        initialize: jest.fn()
      };

      // 应该成功重新加载，因为只是更新版本
      await app.reloadFeature(updatedBaseFeature); // ❌ 这会失败 - 方法不存在
      
      expect(app.features.get('base')?.version).toBe('2.0.0');
    });

    it('应该处理重新加载已销毁应用上的Feature', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'destroyed-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();
      const app = await platform.bootstrapApplication('destroyed-app', []);
      
      const feature: ApplicationFeature = {
        name: 'test-feature',
        initialize: jest.fn()
      };

      // 销毁应用
      app.destroy();

      // 尝试在已销毁的应用上重新加载Feature应该失败
      await expect(app.reloadFeature(feature)).rejects.toThrow(
        'Cannot reload feature on destroyed application'
      );
    });

    it('应该处理重新加载时初始化失败的情况', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'init-fail-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();
      const app = await platform.bootstrapApplication('init-fail-app', []);

      const workingFeature: ApplicationFeature = {
        name: 'working',
        version: '1.0.0',
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      // 首先加载一个正常的Feature
      await app.loadFeature(workingFeature);
      expect(app.features.size).toBe(1);

      const failingFeature: ApplicationFeature = {
        name: 'working',
        version: '2.0.0',
        initialize: jest.fn().mockRejectedValue(new Error('Init failed')),
        destroy: jest.fn()
      };

      // 重新加载时初始化失败
      await expect(app.reloadFeature(failingFeature)).rejects.toThrow('Init failed');

      // 验证原Feature被销毁了
      expect(workingFeature.destroy).toHaveBeenCalled();
      
      // 但新Feature应该没有被注册（因为初始化失败）
      expect(app.features.size).toBe(0);
    });

    it('应该处理重新加载时依赖检查失败的情况', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'dep-fail-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();
      
      const baseFeature: ApplicationFeature = {
        name: 'base',
        version: '1.0.0',
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      // 创建应用并加载基础Feature
      const app = await platform.bootstrapApplication('dep-fail-app', [], [
        baseFeature
      ]);

      // 尝试重新加载，但添加一个不存在的依赖
      const updatedFeature: ApplicationFeature = {
        name: 'base',
        version: '2.0.0',
        dependencies: ['nonexistent'],
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      // 应该失败并恢复原有状态
      await expect(app.reloadFeature(updatedFeature)).rejects.toThrow(
        "Feature 'base' depends on 'nonexistent', but it is not loaded"
      );

      // 验证原Feature仍然存在并且被重新初始化了
      expect(app.features.size).toBe(1);
      expect(app.features.get('base')).toBe(baseFeature);
      expect(baseFeature.initialize).toHaveBeenCalledTimes(2); // 初始 + 恢复
    });

    it('应该支持删除Feature（永久删除）', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'delete-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();
      
      const baseFeature: ApplicationFeature = {
        name: 'base',
        version: '1.0.0',
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      const dependentFeature: ApplicationFeature = {
        name: 'dependent',
        version: '1.0.0',
        dependencies: ['base'],
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      const app = await platform.bootstrapApplication('delete-app', [], [
        baseFeature, dependentFeature
      ]);

      expect(app.features.size).toBe(2);

      // 尝试删除被依赖的Feature应该失败
      await expect(app.deleteFeature('base')).rejects.toThrow(
        "Cannot delete feature 'base' because 'dependent' depends on it"
      );

      // 先删除依赖Feature
      await app.deleteFeature('dependent');
      expect(app.features.size).toBe(1);
      expect(dependentFeature.destroy).toHaveBeenCalledWith(app);

      // 再删除基础Feature
      await app.deleteFeature('base');
      expect(app.features.size).toBe(0);
      expect(baseFeature.destroy).toHaveBeenCalledWith(app);

      // 删除不存在的Feature不应该报错
      await expect(app.deleteFeature('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('应用重载功能', () => {
    it('应该支持PlatformRef重载应用', async () => {
      // 🔴 Red: 编写失败测试
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'reload-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();

      const initialFeature: ApplicationFeature = {
        name: 'initial',
        version: '1.0.0',
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      // 创建初始应用
      const initialApp = await platform.bootstrapApplication('test-app', [
        { provide: 'APP_VERSION', useValue: '1.0.0' }
      ], [initialFeature]);

      expect(initialApp.features.size).toBe(1);
      expect(initialFeature.initialize).toHaveBeenCalledWith(initialApp);

      // 重载应用
      const updatedFeature: ApplicationFeature = {
        name: 'updated',
        version: '2.0.0',
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      const reloadedApp = await platform.reloadApplication('test-app', [
        { provide: 'APP_VERSION', useValue: '2.0.0' }
      ], [updatedFeature]); // ❌ 这会失败 - 方法不存在

      // 验证旧应用被销毁
      expect(initialApp.isDestroyed).toBe(true);
      expect(initialFeature.destroy).toHaveBeenCalledWith(initialApp);

      // 验证新应用被创建
      expect(reloadedApp).not.toBe(initialApp);
      expect(reloadedApp.isDestroyed).toBe(false);
      expect(reloadedApp.injector.get('APP_VERSION')).toBe('2.0.0');
      expect(updatedFeature.initialize).toHaveBeenCalledWith(reloadedApp);

      // 验证应用已被替换
      expect(platform.getApplication('test-app')).toBe(reloadedApp);
    });
  });

  describe('FeatureRef和作用域集成', () => {
    it('应该为Feature创建独立的featureInjector', async () => {
      // 🔴 Red: 编写失败测试
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'feature-injector-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();

      const featureWithServices: ApplicationFeature = {
        name: 'services',
        version: '1.0.0',
        providers: [
          { provide: 'FEATURE_SERVICE', useValue: { getValue: () => 'feature-value' } },
          { provide: 'FEATURE_CONFIG', useValue: { enabled: true } }
        ],
        initialize: jest.fn()
      };

      const app = await platform.bootstrapApplication('injector-app', [
        { provide: 'APP_SERVICE', useValue: 'app-value' }
      ], [featureWithServices]);

      // 获取FeatureRef
      const featureRef = app.getFeatureRef('services'); // ❌ 这会失败 - 方法不存在

      // 验证FeatureRef存在
      expect(featureRef).toBeDefined();
      expect(featureRef!.name).toBe('services');
      expect(featureRef!.version).toBe('1.0.0');

      // 验证FeatureRef有自己的注入器
      expect(featureRef!.injector).toBeDefined();
      expect(featureRef!.injector.scope).toBe('feature');

      // 验证作用域链：featureInjector -> appInjector -> platformInjector -> rootInjector
      expect(featureRef!.injector.parent).toBe(app.injector);

      // 验证可以从feature注入器获取服务
      expect((featureRef!.injector.get('FEATURE_SERVICE') as any).getValue()).toBe('feature-value');
      expect((featureRef!.injector.get('FEATURE_CONFIG') as any).enabled).toBe(true);

      // 验证可以通过作用域链获取上级服务
      expect(featureRef!.injector.get('APP_SERVICE')).toBe('app-value');

      // 验证Feature服务隔离（其他Feature无法访问）
      const anotherFeature: ApplicationFeature = {
        name: 'another',
        providers: [{ provide: 'ANOTHER_SERVICE', useValue: 'another' }]
      };
      
      await app.loadFeature(anotherFeature);
      const anotherFeatureRef = app.getFeatureRef('another');
      
      // 互相不能访问对方的服务
      expect(() => anotherFeatureRef!.injector.get('FEATURE_SERVICE')).toThrow();
      expect(() => featureRef!.injector.get('ANOTHER_SERVICE')).toThrow();
    });

    it('应该正确管理Feature的生命周期和注入器', async () => {
      const platformFactory = createPlatformFactory(null, {
        config: { name: 'lifecycle-platform', version: '1.0.0' },
        providers: []
      });
      const platform = platformFactory();

      const featureWithInjector: ApplicationFeature = {
        name: 'managed',
        providers: [
          { provide: 'COUNTER', useValue: { count: 0 } }
        ],
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      const app = await platform.bootstrapApplication('lifecycle-app', []);

      // 加载Feature
      await app.loadFeature(featureWithInjector);
      const featureRef = app.getFeatureRef('managed');
      
      expect((featureRef!.injector.get('COUNTER') as any).count).toBe(0);
      
      // 修改Feature中的服务状态
      (featureRef!.injector.get('COUNTER') as any).count = 5;
      expect((featureRef!.injector.get('COUNTER') as any).count).toBe(5);

      // 卸载Feature应该销毁注入器
      await app.unloadFeature('managed');
      
      // 验证FeatureRef不再可用
      expect(app.getFeatureRef('managed')).toBeUndefined();
      expect(featureWithInjector.destroy).toHaveBeenCalled();
    });
  });

});
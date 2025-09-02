import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';

describe('延迟初始化（Lazy Initialization）', () => {
  describe('LazyProvider 提供者', () => {
    it('应该支持延迟初始化类提供者', () => {
      const COUNTER_TOKEN = new InjectionToken<{ getValue: () => number }>('COUNTER');
      let creationCount = 0;

      @Injectable()
      class Counter {
        constructor() {
          creationCount++;
        }
        
        getValue(): number {
          return 42;
        }
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: COUNTER_TOKEN,
          useLazyClass: Counter // ❌ useLazyClass 未实现
        }
      ]);

      // 此时不应该创建实例
      expect(creationCount).toBe(0);

      // 第一次获取时才创建实例
      const counter1 = injector.get(COUNTER_TOKEN);
      expect(creationCount).toBe(1);
      expect(counter1.getValue()).toBe(42);

      // 第二次获取应该返回同一个实例（singleton）
      const counter2 = injector.get(COUNTER_TOKEN);
      expect(creationCount).toBe(1);
      expect(counter2).toBe(counter1);
    });

  describe('LazyManager 完整性测试', () => {
    it('应该测试所有公共方法的协同工作', () => {
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const COMPREHENSIVE_TOKEN = new InjectionToken('COMPREHENSIVE');
      
      // 注册延迟提供者
      lazyManager.registerLazyProvider(COMPREHENSIVE_TOKEN, () => ({ id: 'test', value: 42 }));
      
      // 验证初始状态
      expect(lazyManager.isInitialized(COMPREHENSIVE_TOKEN)).toBe(false);
      expect(lazyManager.getInitializedInstances()).toEqual([]);
      
      // 获取实例
      const instance = lazyManager.getLazyInstance(COMPREHENSIVE_TOKEN);
      expect(instance.id).toBe('test');
      expect(instance.value).toBe(42);
      
      // 验证初始化后状态
      expect(lazyManager.isInitialized(COMPREHENSIVE_TOKEN)).toBe(true);
      const initializedInstances = lazyManager.getInitializedInstances();
      expect(initializedInstances.length).toBe(1);
      expect(initializedInstances[0]).toBe(instance);
    });
  });

    it('应该支持延迟工厂函数提供者', () => {
      const CONFIG_TOKEN = new InjectionToken<{ value: string }>('CONFIG');
      let factoryCallCount = 0;

      const createConfig = () => {
        factoryCallCount++;
        return { value: 'lazy-config' };
      };

      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: CONFIG_TOKEN,
          useLazyFactory: createConfig // ❌ useLazyFactory 未实现
        }
      ]);

      // 此时不应该调用工厂函数
      expect(factoryCallCount).toBe(0);

      // 第一次获取时才调用工厂函数
      const config1 = injector.get(CONFIG_TOKEN);
      expect(factoryCallCount).toBe(1);
      expect(config1.value).toBe('lazy-config');

      // 第二次获取应该返回同一个实例
      const config2 = injector.get(CONFIG_TOKEN);
      expect(factoryCallCount).toBe(1);
      expect(config2).toBe(config1);
    });

    it('应该支持带依赖的延迟工厂函数', () => {
      const BASE_TOKEN = new InjectionToken<string>('BASE');
      const SERVICE_TOKEN = new InjectionToken<{ message: string }>('SERVICE');
      let factoryCallCount = 0;

      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: BASE_TOKEN, useValue: 'base-value' },
        {
          provide: SERVICE_TOKEN,
          useLazyFactory: (base: string) => {
            factoryCallCount++;
            return { message: `lazy-${base}` };
          },
          deps: [BASE_TOKEN] // ❌ 延迟工厂的依赖注入未实现
        }
      ]);

      expect(factoryCallCount).toBe(0);

      const service = injector.get(SERVICE_TOKEN);
      expect(factoryCallCount).toBe(1);
      expect(service.message).toBe('lazy-base-value');
    });

    it('应该支持多值延迟提供者', () => {
      // 定义插件接口
      interface Plugin {
        getName(): string;
      }
      
      const PLUGINS_TOKEN = new InjectionToken<Plugin[]>('PLUGINS');
      let creationCount = 0;

      @Injectable()
      class Plugin1 implements Plugin {
        constructor() {
          creationCount++;
        }
        
        getName(): string {
          return 'plugin1';
        }
      }

      @Injectable()
      class Plugin2 implements Plugin {
        constructor() {
          creationCount++;
        }
        
        getName(): string {
          return 'plugin2';
        }
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: PLUGINS_TOKEN,
          useLazyClass: Plugin1,
          multi: true // ❌ 多值延迟提供者未实现
        },
        {
          provide: PLUGINS_TOKEN,
          useLazyClass: Plugin2,
          multi: true
        }
      ]);

      expect(creationCount).toBe(0);

      const plugins = injector.get(PLUGINS_TOKEN);
      expect(creationCount).toBe(2);
      expect(plugins.length).toBe(2);
      expect(plugins[0].getName()).toBe('plugin1');
      expect(plugins[1].getName()).toBe('plugin2');
    });
  });

  describe('延迟初始化与生命周期管理', () => {
    it('延迟初始化的实例应该正确调用 OnDestroy', () => {
      const TOKEN = new InjectionToken<any>('DESTROYABLE');
      let destroyCount = 0;
      let creationCount = 0;

      @Injectable()
      class DestroyableService {
        constructor() {
          creationCount++;
        }

        ngOnDestroy(): void {
          destroyCount++;
        }
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: TOKEN,
          useLazyClass: DestroyableService
        }
      ]);

      expect(creationCount).toBe(0);

      // 获取实例触发延迟初始化
      const service = injector.get(TOKEN);
      expect(creationCount).toBe(1);

      // 销毁注入器
      injector.destroy();
      expect(destroyCount).toBe(1);
    });

    it('未获取的延迟实例不应该被销毁', () => {
      const USED_TOKEN = new InjectionToken<any>('USED');
      const UNUSED_TOKEN = new InjectionToken<any>('UNUSED');
      let usedDestroyCount = 0;
      let unusedDestroyCount = 0;

      @Injectable()
      class UsedService {
        ngOnDestroy(): void {
          usedDestroyCount++;
        }
      }

      @Injectable()
      class UnusedService {
        ngOnDestroy(): void {
          unusedDestroyCount++;
        }
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: USED_TOKEN, useLazyClass: UsedService },
        { provide: UNUSED_TOKEN, useLazyClass: UnusedService }
      ]);

      // 只获取一个服务
      injector.get(USED_TOKEN);

      // 销毁注入器
      injector.destroy();

      // 只有被使用的服务应该被销毁
      expect(usedDestroyCount).toBe(1);
      expect(unusedDestroyCount).toBe(0);
    });
  });

  describe('延迟初始化错误处理', () => {
    it('延迟工厂函数抛出异常时应该正确处理', () => {
      const ERROR_TOKEN = new InjectionToken<any>('ERROR');

      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: ERROR_TOKEN,
          useLazyFactory: () => {
            throw new Error('延迟初始化失败');
          }
        }
      ]);

      expect(() => {
        injector.get(ERROR_TOKEN);
      }).toThrow('延迟初始化失败');
    });

    it('延迟类构造函数抛出异常时应该正确处理', () => {
      const ERROR_TOKEN = new InjectionToken<any>('ERROR_CLASS');

      @Injectable()
      class ErrorService {
        constructor() {
          throw new Error('构造函数异常');
        }
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: ERROR_TOKEN,
          useLazyClass: ErrorService
        }
      ]);

      expect(() => {
        injector.get(ERROR_TOKEN);
      }).toThrow('构造函数异常');
    });
  });

  describe('延迟初始化与循环依赖', () => {
    it('应该在延迟初始化时检测循环依赖', () => {
      const SERVICE_A_TOKEN = new InjectionToken<any>('SERVICE_A');
      const SERVICE_B_TOKEN = new InjectionToken<any>('SERVICE_B');

      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: SERVICE_A_TOKEN,
          useLazyFactory: (serviceB: any) => ({ name: 'A', serviceB }),
          deps: [SERVICE_B_TOKEN]
        },
        {
          provide: SERVICE_B_TOKEN,
          useLazyFactory: (serviceA: any) => ({ name: 'B', serviceA }),
          deps: [SERVICE_A_TOKEN]
        }
      ]);

      expect(() => {
        injector.get(SERVICE_A_TOKEN);
      }).toThrow(/循环依赖/);
    });
  });

  describe('LazyManager 错误处理和边界情况', () => {
    it('应该在获取未注册的延迟提供者时抛出错误', () => {
      // 🔴 测试getLazyInstance的错误分支
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const UNKNOWN_TOKEN = new InjectionToken('UNKNOWN');
      
      expect(() => {
        lazyManager.getLazyInstance(UNKNOWN_TOKEN);
      }).toThrow('延迟提供者未注册');
    });

    it('应该处理工厂函数抛出异常的情况', () => {
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const ERROR_TOKEN = new InjectionToken('ERROR_TOKEN');
      
      lazyManager.registerLazyProvider(ERROR_TOKEN, () => {
        throw new Error('工厂函数执行失败');
      });
      
      expect(() => {
        lazyManager.getLazyInstance(ERROR_TOKEN);
      }).toThrow('工厂函数执行失败');
    });

    it('应该处理多值提供者中工厂函数异常的情况', () => {
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const MULTI_ERROR_TOKEN = new InjectionToken('MULTI_ERROR');
      
      lazyManager.registerLazyProvider(MULTI_ERROR_TOKEN, () => 'success', true);
      lazyManager.registerLazyProvider(MULTI_ERROR_TOKEN, () => {
        throw new Error('多值提供者异常');
      }, true);
      
      expect(() => {
        lazyManager.getLazyInstance(MULTI_ERROR_TOKEN);
      }).toThrow('多值提供者异常');
    });

    it('应该正确处理多值延迟提供者', () => {
      // 🔴 测试多值提供者的分支
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const MULTI_TOKEN = new InjectionToken('MULTI');
      
      // 注册多个延迟提供者
      lazyManager.registerLazyProvider(MULTI_TOKEN, () => 'value1', true);
      lazyManager.registerLazyProvider(MULTI_TOKEN, () => 'value2', true);
      
      const result = lazyManager.getLazyInstance(MULTI_TOKEN);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['value1', 'value2']);
    });

    it('应该正确检查延迟提供者的初始化状态', () => {
      // 🔴 测试isInitialized方法
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const TEST_TOKEN = new InjectionToken('TEST');
      
      // 未注册时应该返回false
      expect(lazyManager.isInitialized(TEST_TOKEN)).toBe(false);
      
      // 注册但未初始化
      lazyManager.registerLazyProvider(TEST_TOKEN, () => 'test', false);
      expect(lazyManager.isInitialized(TEST_TOKEN)).toBe(false);
      
      // 初始化后应该返回true
      lazyManager.getLazyInstance(TEST_TOKEN);
      expect(lazyManager.isInitialized(TEST_TOKEN)).toBe(true);
    });

    it('应该正确获取所有已初始化的实例', () => {
      // 🔴 测试getInitializedInstances方法
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const TOKEN1 = new InjectionToken('TOKEN1');
      const TOKEN2 = new InjectionToken('TOKEN2');
      
      // 注册延迟提供者
      lazyManager.registerLazyProvider(TOKEN1, () => ({ name: 'instance1' }), false);
      lazyManager.registerLazyProvider(TOKEN2, () => [{ name: 'instance2' }], false);
      
      // 初始化实例
      lazyManager.getLazyInstance(TOKEN1);
      lazyManager.getLazyInstance(TOKEN2);
      
      const instances = lazyManager.getInitializedInstances();
      expect(instances.length).toBeGreaterThan(0);
      expect(instances.some((inst: any) => inst.name === 'instance1')).toBe(true);
    });

    it('应该测试registerLazyFactory的deps参数为空的情况', () => {
      // 🔴 测试第44-45行：provider.deps || []
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const TOKEN = new InjectionToken('FACTORY_TOKEN');
      
      lazyManager.registerLazyFactory(TOKEN, {
        provide: TOKEN,
        useLazyFactory: () => ({ name: 'factory' }),
        // deps 未定义，应该使用默认的空数组
      }, (token: any, deps: any) => deps);
      
      const instance = lazyManager.getLazyInstance(TOKEN);
      expect(instance.name).toBe('factory');
    });

    it('应该测试getLazyInstance中单值提供者的覆盖逻辑', () => {
      // 🔴 测试第69-76行：单值提供者使用最后注册的提供者
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const TOKEN = new InjectionToken('OVERRIDE_TOKEN');
      
      // 注册多个同名的单值提供者
      lazyManager.registerLazyProvider(TOKEN, () => ({ name: 'first' }), false);
      lazyManager.registerLazyProvider(TOKEN, () => ({ name: 'second' }), false);
      
      const instance = lazyManager.getLazyInstance(TOKEN);
      expect(instance.name).toBe('second'); // 应该使用最后注册的提供者
    });

    it('应该测试getInitializedInstances处理数组实例的情况', () => {
      // 🔴 测试第112行：Array.isArray(lazyItem.instance)
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const TOKEN = new InjectionToken('MULTI_TOKEN');
      
      // 注册多值提供者
      lazyManager.registerLazyProvider(TOKEN, () => ({ name: 'item1' }), true);
      lazyManager.registerLazyProvider(TOKEN, () => ({ name: 'item2' }), true);
      
      // 获取多值实例（返回数组）
      const instances = lazyManager.getLazyInstance(TOKEN);
      expect(Array.isArray(instances)).toBe(true);
      
      // 获取所有已初始化的实例
      const allInstances = lazyManager.getInitializedInstances();
      expect(allInstances.length).toBe(2); // 应该展开数组
    });

    it('应该测试混合单值和多值提供者的复杂场景', () => {
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const MIXED_TOKEN = new InjectionToken('MIXED_TOKEN');
      
      // 先注册单值提供者
      lazyManager.registerLazyProvider(MIXED_TOKEN, () => ({ name: 'single' }), false);
      // 再注册多值提供者
      lazyManager.registerLazyProvider(MIXED_TOKEN, () => ({ name: 'multi1' }), true);
      lazyManager.registerLazyProvider(MIXED_TOKEN, () => ({ name: 'multi2' }), true);
      
      // 由于存在多值提供者，应该返回数组
      const result = lazyManager.getLazyInstance(MIXED_TOKEN);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('应该测试延迟初始化状态的正确性', () => {
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const STATE_TOKEN = new InjectionToken('STATE_TOKEN');
      let callCount = 0;
      
      lazyManager.registerLazyProvider(STATE_TOKEN, () => {
        callCount++;
        return { count: callCount };
      });
      
      // 初始状态
      expect(lazyManager.isInitialized(STATE_TOKEN)).toBe(false);
      
      // 第一次获取
      const instance1 = lazyManager.getLazyInstance(STATE_TOKEN);
      expect(lazyManager.isInitialized(STATE_TOKEN)).toBe(true);
      expect(instance1.count).toBe(1);
      
      // 第二次获取应该返回缓存的实例
      const instance2 = lazyManager.getLazyInstance(STATE_TOKEN);
      expect(instance2).toBe(instance1);
      expect(callCount).toBe(1); // 工厂函数只调用一次
    });

    it('应该测试isInitialized的边界情况', () => {
      // 🔴 测试第99-100行：lazyItems?.some(item => item.initialized) || false
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const TOKEN = new InjectionToken('UNINIT_TOKEN');
      
      // 测试不存在的令牌
      expect(lazyManager.isInitialized(new InjectionToken('NON_EXISTENT'))).toBe(false);
      
      // 注册但未初始化的提供者
      lazyManager.registerLazyProvider(TOKEN, () => ({ name: 'test' }), false);
      expect(lazyManager.isInitialized(TOKEN)).toBe(false);
      
      // 初始化后再检查
      lazyManager.getLazyInstance(TOKEN);
      expect(lazyManager.isInitialized(TOKEN)).toBe(true);
    });

    it('应该测试工厂函数异常后的状态恢复', () => {
      const { LazyManager } = require('./lazy-manager');
      const lazyManager = new LazyManager();
      const RECOVERY_TOKEN = new InjectionToken('RECOVERY_TOKEN');
      let shouldThrow = true;
      
      lazyManager.registerLazyProvider(RECOVERY_TOKEN, () => {
        if (shouldThrow) {
          throw new Error('临时异常');
        }
        return { name: 'recovered' };
      });
      
      // 第一次调用应该抛出异常
      expect(() => lazyManager.getLazyInstance(RECOVERY_TOKEN)).toThrow('临时异常');
      
      // 修改条件后再次调用
      shouldThrow = false;
      const instance = lazyManager.getLazyInstance(RECOVERY_TOKEN);
      expect(instance.name).toBe('recovered');
    });

    describe('registerLazyFactory边界情况', () => {
      it('应该处理deps为undefined的情况', () => {
        const { LazyManager } = require('./lazy-manager');
        const lazyManager = new LazyManager();
        const factoryToken = new InjectionToken<string>('factory-token');
        const mockResolveDeps = jest.fn().mockReturnValue([]);
        
        lazyManager.registerLazyFactory(factoryToken, {
          useLazyFactory: () => 'factory-result',
          deps: undefined // 测试deps为undefined的分支
        }, mockResolveDeps);
        
        const result = lazyManager.getLazyInstance(factoryToken);
        expect(result).toBe('factory-result');
        expect(mockResolveDeps).toHaveBeenCalledWith(factoryToken, []);
      });
    });
  });
});
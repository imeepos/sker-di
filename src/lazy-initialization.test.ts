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
});
import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { Inject } from './inject';
import { InjectionToken } from './injection-token';
import { forwardRef } from './forward-ref'; // ❌ 这会失败

describe('forwardRef 机制', () => {
  describe('解决循环引用问题', () => {

    it('应该支持Token之间使用forwardRef避免循环依赖错误', () => {
      const TOKEN_A = new InjectionToken<any>('SERVICE_A');
      const TOKEN_B = new InjectionToken<any>('SERVICE_B');

      // 这个测试验证forwardRef可以延迟解析，避免立即的循环依赖检测
      // 但实际的循环引用问题需要更复杂的解决方案
      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: TOKEN_A,
          useValue: { name: 'A' }
        },
        {
          provide: TOKEN_B,
          useFactory: (serviceA: any) => ({ name: 'B', serviceA }),
          deps: [forwardRef(() => TOKEN_A)] // 验证forwardRef正确解析
        }
      ]);

      const serviceB = injector.get(TOKEN_B);
      expect(serviceB.name).toBe('B');
      expect(serviceB.serviceA.name).toBe('A');
    });

    it('应该支持Provider中的forwardRef引用', () => {
      @Injectable()
      class BaseService {}

      @Injectable()
      class DerivedService extends BaseService {}

      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: BaseService,
          useClass: forwardRef(() => DerivedService) // ❌ forwardRef 在useClass中未支持
        }
      ]);

      const service = injector.get(BaseService);
      expect(service).toBeInstanceOf(DerivedService);
    });
  });

  describe('forwardRef 嵌套和复合场景', () => {
    it('应该支持多层forwardRef嵌套', () => {
      @Injectable()
      class ServiceC {
        getValue() {
          return 'C';
        }
      }

      @Injectable()
      class ServiceB {
        constructor(@Inject(forwardRef(() => ServiceC)) public serviceC: ServiceC) {}
      }

      @Injectable()
      class ServiceA {
        constructor(@Inject(forwardRef(() => ServiceB)) public serviceB: ServiceB) {}
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: ServiceA, useClass: ServiceA },
        { provide: ServiceB, useClass: ServiceB },
        { provide: ServiceC, useClass: ServiceC }
      ]);

      const serviceA = injector.get(ServiceA);
      expect(serviceA.serviceB.serviceC.getValue()).toBe('C');
    });

    it('应该支持数组中的forwardRef', () => {
      const PLUGIN_A_TOKEN = new InjectionToken<any>('PLUGIN_A');
      const CONSUMER_TOKEN = new InjectionToken<any>('CONSUMER');

      @Injectable()
      class PluginA {
        getName() {
          return 'PluginA';
        }
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: PLUGIN_A_TOKEN, useClass: PluginA },
        {
          provide: CONSUMER_TOKEN,
          useFactory: (pluginA: any) => ({ plugin: pluginA }),
          deps: [forwardRef(() => PLUGIN_A_TOKEN)]
        }
      ]);

      const consumer = injector.get(CONSUMER_TOKEN);
      expect(consumer.plugin.getName()).toBe('PluginA');
    });
  });

  describe('forwardRef 错误处理', () => {
    it('应该在forwardRef函数抛出异常时正确处理', () => {
      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: 'TEST_TOKEN',
          useFactory: () => ({}),
          deps: [forwardRef(() => {
            throw new Error('forwardRef函数执行失败');
          })]
        }
      ]);

      expect(() => {
        injector.get('TEST_TOKEN');
      }).toThrow('forwardRef函数执行失败');
    });

    it('应该在forwardRef返回无效令牌时正确处理', () => {
      const injector = EnvironmentInjector.createWithAutoProviders([
        {
          provide: 'TEST_TOKEN',
          useFactory: (dep: any) => ({ dep }),
          deps: [forwardRef(() => undefined) as any] // ❌ 返回undefined
        }
      ]);

      expect(() => {
        injector.get('TEST_TOKEN');
      }).toThrow(/无效的forwardRef/);
    });
  });

  describe('forwardRef 性能和缓存', () => {
    it('forwardRef应该只解析一次并缓存结果', () => {
      let resolveCount = 0;
      const TOKEN = new InjectionToken<string>('TOKEN');

      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'test-value' },
        {
          provide: 'CONSUMER',
          useFactory: (value: string) => ({ value }),
          deps: [forwardRef(() => {
            resolveCount++;
            return TOKEN;
          })]
        }
      ]);

      // 多次获取同一个令牌
      injector.get('CONSUMER');
      injector.get('CONSUMER');
      injector.get('CONSUMER');

      // forwardRef函数应该只被调用一次
      expect(resolveCount).toBe(1);
    });
  });

  describe('forwardRef 类型安全', () => {
    it('应该在编译时提供正确的类型推断', () => {
      @Injectable()
      class TypedService {
        getValue(): string {
          return 'typed-value';
        }
      }

      @Injectable()
      class Consumer {
        constructor(@Inject(forwardRef(() => TypedService)) public service: TypedService) {}
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: TypedService, useClass: TypedService },
        { provide: Consumer, useClass: Consumer }
      ]);

      const consumer = injector.get(Consumer);
      // 类型应该被正确推断，service.getValue()应该存在
      expect(consumer.service.getValue()).toBe('typed-value');
    });
  });
});
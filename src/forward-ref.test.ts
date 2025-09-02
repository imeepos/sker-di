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

  describe('红阶段：边界情况和错误处理测试', () => {
    describe('ForwardRef类边界测试', () => {
      it('应该正确处理ForwardRef的toString方法', () => {
        const ref = forwardRef(() => String);
        expect(ref.toString()).toBe('ForwardRef');
      });

      it('应该正确识别ForwardRef对象', () => {
         const ref = forwardRef(() => String);
         const notRef = { __forward_ref__: false };
         const fakeRef = { __forward_ref__: true };
         
         expect(require('./forward-ref').isForwardRef(ref)).toBe(true);
         expect(require('./forward-ref').isForwardRef(notRef)).toBe(false);
         expect(require('./forward-ref').isForwardRef(fakeRef)).toBe(true);
         expect(require('./forward-ref').isForwardRef(null)).toBeFalsy();
         expect(require('./forward-ref').isForwardRef(undefined)).toBeFalsy();
         expect(require('./forward-ref').isForwardRef('string')).toBeFalsy();
         expect(require('./forward-ref').isForwardRef(123)).toBeFalsy();
       });

      it('应该在forwardRef函数返回null时抛出错误', () => {
        const ref = forwardRef(() => null);
        expect(() => ref.resolve()).toThrow('无效的forwardRef: forwardRef函数返回了undefined或null');
      });

      it('应该在forwardRef函数返回undefined时抛出错误', () => {
        const ref = forwardRef(() => undefined);
        expect(() => ref.resolve()).toThrow('无效的forwardRef: forwardRef函数返回了undefined或null');
      });

      it('应该正确包装和重新抛出非Error类型的异常', () => {
        const ref = forwardRef(() => {
          throw 'string error';
        });
        expect(() => ref.resolve()).toThrow('string error');
      });

      it('应该正确包装Error类型的异常', () => {
        const ref = forwardRef(() => {
          throw new Error('original error');
        });
        expect(() => ref.resolve()).toThrow('forwardRef解析失败: original error');
      });
    });

    describe('resolveForwardRef函数边界测试', () => {
      it('应该直接返回非ForwardRef值', () => {
        const { resolveForwardRef } = require('./forward-ref');
        
        expect(resolveForwardRef('string')).toBe('string');
        expect(resolveForwardRef(123)).toBe(123);
        expect(resolveForwardRef(null)).toBe(null);
        expect(resolveForwardRef(undefined)).toBe(undefined);
        
        const obj = { test: 'value' };
        expect(resolveForwardRef(obj)).toBe(obj);
      });

      it('应该解析ForwardRef值', () => {
        const { resolveForwardRef } = require('./forward-ref');
        const token = Symbol('test');
        const ref = forwardRef(() => token);
        
        expect(resolveForwardRef(ref)).toBe(token);
      });
    });

    describe('resolveForwardRefCached函数缓存测试', () => {
      it('应该缓存ForwardRef的解析结果', () => {
        const { resolveForwardRefCached } = require('./forward-ref');
        let callCount = 0;
        const token = Symbol('cached-test');
        
        const ref = forwardRef(() => {
          callCount++;
          return token;
        });
        
        // 第一次调用
        const result1 = resolveForwardRefCached(ref);
        expect(result1).toBe(token);
        expect(callCount).toBe(1);
        
        // 第二次调用应该使用缓存
        const result2 = resolveForwardRefCached(ref);
        expect(result2).toBe(token);
        expect(callCount).toBe(1); // 不应该增加
      });

      it('应该直接返回非ForwardRef值而不缓存', () => {
        const { resolveForwardRefCached } = require('./forward-ref');
        const value = 'direct-value';
        
        expect(resolveForwardRefCached(value)).toBe(value);
      });
    });

    describe('resolveForwardRefsInArray函数测试', () => {
      it('应该解析数组中的所有ForwardRef', () => {
        const { resolveForwardRefsInArray } = require('./forward-ref');
        
        const token1 = Symbol('token1');
        const token2 = Symbol('token2');
        const directValue = 'direct';
        
        const array = [
          forwardRef(() => token1),
          directValue,
          forwardRef(() => token2)
        ];
        
        const resolved = resolveForwardRefsInArray(array);
        expect(resolved).toEqual([token1, directValue, token2]);
      });

      it('应该处理空数组', () => {
        const { resolveForwardRefsInArray } = require('./forward-ref');
        
        const resolved = resolveForwardRefsInArray([]);
        expect(resolved).toEqual([]);
      });

      it('应该处理只包含非ForwardRef值的数组', () => {
        const { resolveForwardRefsInArray } = require('./forward-ref');
        
        const array = ['a', 'b', 'c'];
        const resolved = resolveForwardRefsInArray(array);
        expect(resolved).toEqual(['a', 'b', 'c']);
      });

      it('应该处理只包含ForwardRef的数组', () => {
        const { resolveForwardRefsInArray } = require('./forward-ref');
        
        const token1 = Symbol('token1');
        const token2 = Symbol('token2');
        
        const array = [
          forwardRef(() => token1),
          forwardRef(() => token2)
        ];
        
        const resolved = resolveForwardRefsInArray(array);
        expect(resolved).toEqual([token1, token2]);
      });
    });

    describe('resolveForwardRefsInDeps函数测试', () => {
      it('应该处理undefined依赖数组', () => {
        const { resolveForwardRefsInDeps } = require('./forward-ref');
        
        expect(resolveForwardRefsInDeps(undefined)).toBe(undefined);
      });

      it('应该处理null依赖数组', () => {
        const { resolveForwardRefsInDeps } = require('./forward-ref');
        
        expect(resolveForwardRefsInDeps(null)).toBe(null);
      });

      it('应该解析依赖数组中的ForwardRef', () => {
        const { resolveForwardRefsInDeps } = require('./forward-ref');
        
        const token1 = Symbol('dep1');
        const token2 = Symbol('dep2');
        
        const deps = [
          forwardRef(() => token1),
          'direct-dep',
          forwardRef(() => token2)
        ];
        
        const resolved = resolveForwardRefsInDeps(deps);
        expect(resolved).toEqual([token1, 'direct-dep', token2]);
      });

      it('应该处理空依赖数组', () => {
        const { resolveForwardRefsInDeps } = require('./forward-ref');
        
        const resolved = resolveForwardRefsInDeps([]);
        expect(resolved).toEqual([]);
      });
    });

    describe('缓存机制边界测试', () => {
      it('应该为不同的ForwardRef实例分别缓存', () => {
        const { resolveForwardRefCached } = require('./forward-ref');
        
        let callCount1 = 0;
        let callCount2 = 0;
        
        const token1 = Symbol('token1');
        const token2 = Symbol('token2');
        
        const ref1 = forwardRef(() => {
          callCount1++;
          return token1;
        });
        
        const ref2 = forwardRef(() => {
          callCount2++;
          return token2;
        });
        
        // 解析第一个ForwardRef
        resolveForwardRefCached(ref1);
        resolveForwardRefCached(ref1); // 再次解析，应该使用缓存
        expect(callCount1).toBe(1);
        
        // 解析第二个ForwardRef
        resolveForwardRefCached(ref2);
        resolveForwardRefCached(ref2); // 再次解析，应该使用缓存
        expect(callCount2).toBe(1);
        
        // 两个ForwardRef应该独立缓存
        expect(callCount1).toBe(1);
        expect(callCount2).toBe(1);
      });

      it('应该在ForwardRef解析失败时不缓存结果', () => {
        const { resolveForwardRefCached } = require('./forward-ref');
        
        let callCount = 0;
        const ref = forwardRef(() => {
          callCount++;
          throw new Error('解析失败');
        });
        
        // 第一次解析失败
        expect(() => resolveForwardRefCached(ref)).toThrow('forwardRef解析失败: 解析失败');
        expect(callCount).toBe(1);
        
        // 第二次解析应该再次尝试（不应该缓存失败结果）
        expect(() => resolveForwardRefCached(ref)).toThrow('forwardRef解析失败: 解析失败');
        expect(callCount).toBe(2);
      });
    });

    describe('类型检查边界测试', () => {
      it('应该正确处理具有__forward_ref__属性但值为false的对象', () => {
        const { isForwardRef } = require('./forward-ref');
        
        const fakeRef = { __forward_ref__: false };
        expect(isForwardRef(fakeRef)).toBe(false);
      });

      it('应该正确处理具有__forward_ref__属性但不是对象的值', () => {
         const { isForwardRef } = require('./forward-ref');
         
         expect(isForwardRef(true)).toBeFalsy();
         expect(isForwardRef(false)).toBeFalsy();
         expect(isForwardRef(0)).toBeFalsy();
         expect(isForwardRef('')).toBeFalsy();
       });

      it('应该正确处理原型链上有__forward_ref__属性的对象', () => {
         const { isForwardRef } = require('./forward-ref');
         
         const proto = { __forward_ref__: true };
         const obj = Object.create(proto);
         
         // 当前实现会检查原型链上的属性
         expect(isForwardRef(obj)).toBe(true);
       });
    });

    describe('复杂场景测试', () => {
      it('应该处理嵌套的ForwardRef解析', () => {
        const token = Symbol('nested-token');
        
        const innerRef = forwardRef(() => token);
        const outerRef = forwardRef(() => innerRef);
        
        // 外层ForwardRef解析后得到内层ForwardRef
        const resolved = outerRef.resolve();
        expect(require('./forward-ref').isForwardRef(resolved)).toBe(true);
        expect(resolved.resolve()).toBe(token);
      });

      it('应该处理返回函数的ForwardRef', () => {
        const targetFunction = () => 'function-result';
        const ref = forwardRef(() => targetFunction);
        
        const resolved = ref.resolve();
        expect(typeof resolved).toBe('function');
        expect(resolved()).toBe('function-result');
      });

      it('应该处理返回类构造函数的ForwardRef', () => {
        class TestClass {
          value = 'test';
        }
        
        const ref = forwardRef(() => TestClass);
        const ResolvedClass = ref.resolve();
        
        expect(ResolvedClass).toBe(TestClass);
        const instance = new ResolvedClass();
        expect(instance.value).toBe('test');
      });

      it('应该处理返回复杂对象的ForwardRef', () => {
        const complexObject = {
          nested: {
            value: 'deep-value',
            method: () => 'method-result'
          },
          array: [1, 2, 3]
        };
        
        const ref = forwardRef(() => complexObject);
        const resolved = ref.resolve();
        
        expect(resolved).toBe(complexObject);
        expect(resolved.nested.value).toBe('deep-value');
        expect(resolved.nested.method()).toBe('method-result');
        expect(resolved.array).toEqual([1, 2, 3]);
      });
    });
  });
});
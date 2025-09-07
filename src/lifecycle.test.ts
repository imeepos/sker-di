import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { OnDestroy, isOnDestroy } from './lifecycle';
import { IInjectorRegistry, INJECTOR_REGISTRY, InjectorRegistry } from './injector-registry';
import { IPlatformManager, PLATFORM_MANAGER, PlatformManager } from './platform-manager';

describe('生命周期管理', () => {
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
  it('应该在服务销毁时调用 ngOnDestroy', () => {
    const destroySpy = jest.fn();

    @Injectable({ providedIn: 'root' })
    class ServiceWithDestroy implements OnDestroy {
      ngOnDestroy(): void {
        destroySpy();
      }
    }

    const injector = injectorRegistry.createRootInjector([]);
    const service = injector.get(ServiceWithDestroy);

    expect(service).toBeInstanceOf(ServiceWithDestroy);
    expect(destroySpy).not.toHaveBeenCalled();

    // 销毁注入器
    injector.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('应该销毁所有创建的实例', () => {
    const destroySpy1 = jest.fn();
    const destroySpy2 = jest.fn();

    @Injectable({ providedIn: 'root' })
    class Service1 implements OnDestroy {
      ngOnDestroy(): void {
        destroySpy1();
      }
    }

    @Injectable({ providedIn: 'root' })
    class Service2 implements OnDestroy {
      ngOnDestroy(): void {
        destroySpy2();
      }
    }

    const injector = injectorRegistry.createRootInjector([]);
    
    // 获取两个服务实例
    injector.get(Service1);
    injector.get(Service2);

    expect(destroySpy1).not.toHaveBeenCalled();
    expect(destroySpy2).not.toHaveBeenCalled();

    // 销毁注入器
    injector.destroy();
    
    expect(destroySpy1).toHaveBeenCalledTimes(1);
    expect(destroySpy2).toHaveBeenCalledTimes(1);
  });

  it('应该处理没有实现 OnDestroy 的服务', () => {
    @Injectable({ providedIn: 'root' })
    class ServiceWithoutDestroy {
      value = 'test';
    }

    const injector = injectorRegistry.createRootInjector([]);
    const service = injector.get(ServiceWithoutDestroy);

    expect(service).toBeInstanceOf(ServiceWithoutDestroy);

    // 销毁应该不抛出错误
    expect(() => injector.destroy()).not.toThrow();
  });

  it('应该处理销毁过程中的错误，不影响其他服务的销毁', () => {
    const destroySpy1 = jest.fn();
    const destroySpy2 = jest.fn(() => {
      throw new Error('销毁时出错');
    });
    const destroySpy3 = jest.fn();

    @Injectable({ providedIn: 'root' })
    class Service1 implements OnDestroy {
      ngOnDestroy(): void {
        destroySpy1();
      }
    }

    @Injectable({ providedIn: 'root' })
    class Service2 implements OnDestroy {
      ngOnDestroy(): void {
        destroySpy2();
      }
    }

    @Injectable({ providedIn: 'root' })
    class Service3 implements OnDestroy {
      ngOnDestroy(): void {
        destroySpy3();
      }
    }

    const injector = injectorRegistry.createRootInjector([]);
    
    injector.get(Service1);
    injector.get(Service2);
    injector.get(Service3);

    // 销毁过程中有错误但不应该中断
    expect(() => injector.destroy()).not.toThrow();

    // 所有服务都应该尝试销毁
    expect(destroySpy1).toHaveBeenCalledTimes(1);
    expect(destroySpy2).toHaveBeenCalledTimes(1);
    expect(destroySpy3).toHaveBeenCalledTimes(1);
  });

  it('应该防止重复销毁', () => {
    const destroySpy = jest.fn();

    @Injectable({ providedIn: 'root' })
    class ServiceWithDestroy implements OnDestroy {
      ngOnDestroy(): void {
        destroySpy();
      }
    }

    const injector = injectorRegistry.createRootInjector([]);
    injector.get(ServiceWithDestroy);

    // 第一次销毁
    injector.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);

    // 第二次销毁不应该再调用 ngOnDestroy
    injector.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('销毁后不应该创建新的实例', () => {
    @Injectable({ providedIn: 'root' })
    class TestService {
      value = 'test';
    }

    const injector = injectorRegistry.createRootInjector([]);
    const service = injector.get(TestService);
    expect(service).toBeInstanceOf(TestService);

    // 销毁注入器
    injector.destroy();

    // 尝试获取新实例应该抛出错误
    expect(() => injector.get(TestService))
      .toThrow('注入器已销毁');
  });

  it('应该在工厂提供者创建的实例上调用销毁方法', () => {
    const destroySpy = jest.fn();
    const factorySpy = jest.fn(() => ({
      value: 'factory-created',
      ngOnDestroy: destroySpy
    }));

    const injector = EnvironmentInjector.createWithAutoProviders([
      {
        provide: 'TestService',
        useFactory: factorySpy,
        deps: []
      }
    ]);

    const service = injector.get('TestService') as any;
    expect(service.value).toBe('factory-created');
    expect(factorySpy).toHaveBeenCalledTimes(1);

    injector.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  describe('isOnDestroy 函数', () => {
    it('应该正确识别实现了 OnDestroy 接口的对象', () => {
      class ServiceWithDestroy implements OnDestroy {
        ngOnDestroy(): void {
          // 清理逻辑
        }
      }

      const service = new ServiceWithDestroy();
      expect(isOnDestroy(service)).toBe(true);
    });

    it('应该正确识别没有实现 OnDestroy 接口的对象', () => {
      class ServiceWithoutDestroy {
        value = 'test';
      }

      const service = new ServiceWithoutDestroy();
      expect(isOnDestroy(service)).toBe(false);
    });

    it('应该正确处理有 ngOnDestroy 属性但不是函数的对象', () => {
      const objectWithNonFunctionDestroy = {
        ngOnDestroy: 'not a function'
      };

      expect(isOnDestroy(objectWithNonFunctionDestroy)).toBe(false);
    });

    it('应该正确处理 null 和 undefined', () => {
      expect(isOnDestroy(null)).toBe(false);
      expect(isOnDestroy(undefined)).toBe(false);
    });

    it('应该正确处理空对象', () => {
      const emptyObject = {};
      expect(isOnDestroy(emptyObject)).toBe(false);
    });

    it('应该正确识别动态添加 ngOnDestroy 方法的对象', () => {
      const dynamicObject: any = {
        value: 'test'
      };

      // 动态添加 ngOnDestroy 方法
      dynamicObject.ngOnDestroy = function() {
        console.log('销毁');
      };

      expect(isOnDestroy(dynamicObject)).toBe(true);
    });

    it('应该正确处理原型链上有 ngOnDestroy 方法的对象', () => {
      class BaseService {
        ngOnDestroy(): void {
          // 基类销毁逻辑
        }
      }

      class DerivedService extends BaseService {
        value = 'derived';
      }

      const service = new DerivedService();
      expect(isOnDestroy(service)).toBe(true);
    });
  });
});
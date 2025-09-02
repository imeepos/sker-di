import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { Inject } from './inject';
import { InjectionToken } from './injection-token';

describe('循环依赖检测', () => {
  it('应该检测到直接的循环依赖并抛出错误', () => {
    @Injectable({ providedIn: 'root' })
    class ServiceA {
      constructor(@Inject('ServiceB') public serviceB: any) {}
    }

    @Injectable({ providedIn: 'root' })
    class ServiceB {
      constructor(@Inject('ServiceA') public serviceA: any) {}
    }

    const injector = EnvironmentInjector.createWithAutoProviders([
      { provide: 'ServiceA', useClass: ServiceA },
      { provide: 'ServiceB', useClass: ServiceB }
    ]);

    expect(() => injector.get('ServiceA'))
      .toThrow('检测到循环依赖');
  });

  it('应该检测到间接的循环依赖（A -> B -> C -> A）', () => {
    @Injectable({ providedIn: 'root' })
    class ServiceA {
      constructor(@Inject('ServiceB') public serviceB: any) {}
    }

    @Injectable({ providedIn: 'root' })
    class ServiceB {
      constructor(@Inject('ServiceC') public serviceC: any) {}
    }

    @Injectable({ providedIn: 'root' })
    class ServiceC {
      constructor(@Inject('ServiceA') public serviceA: any) {}
    }

    const injector = EnvironmentInjector.createWithAutoProviders([
      { provide: 'ServiceA', useClass: ServiceA },
      { provide: 'ServiceB', useClass: ServiceB },
      { provide: 'ServiceC', useClass: ServiceC }
    ]);

    expect(() => injector.get('ServiceA'))
      .toThrow('检测到循环依赖');
  });

  it('应该在错误消息中显示完整的依赖路径', () => {
    const tokenA = new InjectionToken<any>('TokenA');
    const tokenB = new InjectionToken<any>('TokenB');
    const tokenC = new InjectionToken<any>('TokenC');

    @Injectable({ providedIn: 'root' })
    class ServiceA {
      constructor(@Inject(tokenB) public serviceB: any) {}
    }

    @Injectable({ providedIn: 'root' })
    class ServiceB {
      constructor(@Inject(tokenC) public serviceC: any) {}
    }

    @Injectable({ providedIn: 'root' })
    class ServiceC {
      constructor(@Inject(tokenA) public serviceA: any) {}
    }

    const injector = EnvironmentInjector.createWithAutoProviders([
      { provide: tokenA, useClass: ServiceA },
      { provide: tokenB, useClass: ServiceB },
      { provide: tokenC, useClass: ServiceC }
    ]);

    expect(() => injector.get(tokenA))
      .toThrow(/TokenA.*TokenB.*TokenC.*TokenA/);
  });

  it('不应该误报非循环依赖为循环依赖', () => {
    @Injectable({ providedIn: 'root' })
    class CommonService {
      value = 'shared';
    }

    @Injectable({ providedIn: 'root' })
    class ServiceA {
      constructor(public common: CommonService) {}
    }

    @Injectable({ providedIn: 'root' })
    class ServiceB {
      constructor(
        public common: CommonService,
        @Inject('ServiceA') public serviceA: ServiceA
      ) {}
    }

    const injector = EnvironmentInjector.createWithAutoProviders([
      { provide: 'ServiceA', useClass: ServiceA }
    ]);

    // 这应该正常工作，不是循环依赖
    expect(() => {
      const serviceB = injector.get(ServiceB);
      expect(serviceB).toBeInstanceOf(ServiceB);
      expect(serviceB.serviceA).toBeInstanceOf(ServiceA);
      expect(serviceB.common).toBeInstanceOf(CommonService);
      expect(serviceB.serviceA.common).toBeInstanceOf(CommonService);
    }).not.toThrow();
  });

  it('应该在工厂提供者中检测循环依赖', () => {
    const tokenA = new InjectionToken<string>('TokenA');
    const tokenB = new InjectionToken<string>('TokenB');

    const injector = EnvironmentInjector.createWithAutoProviders([
      { 
        provide: tokenA, 
        useFactory: (b: string) => `A depends on ${b}`,
        deps: [tokenB]
      },
      { 
        provide: tokenB, 
        useFactory: (a: string) => `B depends on ${a}`,
        deps: [tokenA]
      }
    ]);

    expect(() => injector.get(tokenA))
      .toThrow('检测到循环依赖');
  });

  it('应该在依赖解析完成后清理循环检测状态', () => {
    @Injectable({ providedIn: 'root' })
    class NormalService {
      value = 'normal';
    }

    const injector = EnvironmentInjector.createWithAutoProviders([]);

    // 第一次获取
    const service1 = injector.get(NormalService);
    expect(service1).toBeInstanceOf(NormalService);

    // 第二次获取应该使用缓存，不应该有问题
    const service2 = injector.get(NormalService);
    expect(service2).toBe(service1); // 应该是同一个实例
  });
});
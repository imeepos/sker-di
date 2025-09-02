import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { Inject } from './inject';
import { InjectionToken } from './injection-token';

describe('providedIn 选项支持', () => {
  const testToken = new InjectionToken<string>('测试令牌');

  it('providedIn: "root" 的服务应该能在根注入器中自动注册', () => {
    @Injectable({ providedIn: 'root' })
    class RootService {
      name = 'root-service';
    }

    // 创建一个支持 providedIn 的注入器
    const injector = EnvironmentInjector.createWithAutoProviders([]);
    
    const service = injector.get(RootService);
    expect(service).toBeInstanceOf(RootService);
    expect(service.name).toBe('root-service');
  });

  it('providedIn: null 的服务应该需要手动注册', () => {
    @Injectable({ providedIn: null })
    class ManualService {
      name = 'manual-service';
    }

    const injector = EnvironmentInjector.createWithAutoProviders([]);
    
    expect(() => injector.get(ManualService))
      .toThrow('No provider for ManualService');
  });

  it('应该支持 providedIn 服务的工厂函数配置', () => {
    @Injectable({ 
      providedIn: 'root',
      useFactory: () => ({ factoryValue: 'created-by-factory' })
    })
    class FactoryService {}

    const injector = EnvironmentInjector.createWithAutoProviders([]);
    
    const service = injector.get(FactoryService);
    expect(service).toEqual({ factoryValue: 'created-by-factory' });
  });

  it('应该支持 providedIn 服务的依赖注入', () => {
    @Injectable({ providedIn: 'root' })
    class DependencyService {
      name = 'dependency';
    }

    @Injectable({ providedIn: 'root' })
    class ServiceWithDep {
      constructor(public dep: DependencyService) {}
    }

    const injector = EnvironmentInjector.createWithAutoProviders([]);
    
    const service = injector.get(ServiceWithDep);
    expect(service).toBeInstanceOf(ServiceWithDep);
    expect(service.dep).toBeInstanceOf(DependencyService);
    expect(service.dep.name).toBe('dependency');
  });

  it('应该支持 providedIn 服务使用 @Inject 装饰器', () => {
    const providers = [
      { provide: testToken, useValue: 'injected-value' }
    ];

    @Injectable({ providedIn: 'root' })
    class ServiceWithInject {
      constructor(@Inject(testToken) public value: string) {}
    }

    const injector = EnvironmentInjector.createWithAutoProviders(providers);
    
    const service = injector.get(ServiceWithInject);
    expect(service).toBeInstanceOf(ServiceWithInject);
    expect(service.value).toBe('injected-value');
  });

  it('手动注册的 Provider 应该覆盖 providedIn 自动注册', () => {
    @Injectable({ providedIn: 'root' })
    class OverriddenService {
      name = 'auto-registered';
    }

    class ManualImplementation {
      name = 'manually-registered';
    }

    const providers = [
      { provide: OverriddenService, useClass: ManualImplementation }
    ];

    const injector = EnvironmentInjector.createWithAutoProviders(providers);
    
    const service = injector.get(OverriddenService);
    expect(service.name).toBe('manually-registered');
  });
});
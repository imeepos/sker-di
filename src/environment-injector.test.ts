import { EnvironmentInjector } from './environment-injector';
import { NullInjector } from './null-injector';
import { InjectionToken } from './injection-token';
import { Provider } from './provider';

describe('EnvironmentInjector', () => {
  class TestService {
    constructor(public name: string = 'test') {}
  }

  class DependentService {
    constructor(public testService: TestService) {}
  }

  const stringToken = new InjectionToken<string>('字符串令牌');
  const numberToken = new InjectionToken<number>('数字令牌');

  it('应该能够创建带有提供者的环境注入器', () => {
    const providers: Provider[] = [
      { provide: stringToken, useValue: '测试值' }
    ];
    
    const injector = new EnvironmentInjector(providers);
    expect(injector).toBeDefined();
    expect(injector.parent).toBeInstanceOf(NullInjector);
  });

  it('应该能够通过值提供者获取依赖', () => {
    const providers: Provider[] = [
      { provide: stringToken, useValue: '测试值' }
    ];
    
    const injector = new EnvironmentInjector(providers);
    const result = injector.get(stringToken);
    expect(result).toBe('测试值');
  });

  it('应该能够通过类提供者获取依赖', () => {
    const providers: Provider[] = [
      { provide: TestService, useClass: TestService }
    ];
    
    const injector = new EnvironmentInjector(providers);
    const result = injector.get(TestService);
    expect(result).toBeInstanceOf(TestService);
  });

  it('应该能够通过工厂提供者获取依赖', () => {
    const providers: Provider[] = [
      { 
        provide: stringToken, 
        useFactory: () => '工厂创建的值',
        deps: []
      }
    ];
    
    const injector = new EnvironmentInjector(providers);
    const result = injector.get(stringToken);
    expect(result).toBe('工厂创建的值');
  });

  it('应该支持单例模式（缓存实例）', () => {
    const providers: Provider[] = [
      { provide: TestService, useClass: TestService }
    ];
    
    const injector = new EnvironmentInjector(providers);
    const instance1 = injector.get(TestService);
    const instance2 = injector.get(TestService);
    expect(instance1).toBe(instance2);
  });

  it('应该在找不到提供者时委托给父注入器', () => {
    const injector = new EnvironmentInjector([]);
    
    expect(() => injector.get(TestService))
      .toThrow('NullInjector: No provider for TestService');
  });

  it('应该支持多值注入', () => {
    const providers: Provider[] = [
      { provide: stringToken, useValue: '值1', multi: true },
      { provide: stringToken, useValue: '值2', multi: true }
    ];
    
    const injector = new EnvironmentInjector(providers);
    const result = injector.get(stringToken);
    expect(result).toEqual(['值1', '值2']);
  });

  it('后注册的 Provider 应该覆盖前面的 Provider（非多值注入）', () => {
    const providers: Provider[] = [
      { provide: stringToken, useValue: '第一个值' },
      { provide: stringToken, useValue: '第二个值' }
    ];
    
    const injector = new EnvironmentInjector(providers);
    const result = injector.get(stringToken);
    expect(result).toBe('第二个值'); // 应该是最后注册的值
  });

  it('后注册的类 Provider 应该覆盖前面的类 Provider', () => {
    class FirstService {
      name = 'first';
    }
    
    class SecondService {
      name = 'second';  
    }
    
    const providers: Provider[] = [
      { provide: TestService, useClass: FirstService },
      { provide: TestService, useClass: SecondService }
    ];
    
    const injector = new EnvironmentInjector(providers);
    const result = injector.get(TestService);
    expect(result.name).toBe('second'); // 应该是最后注册的类
  });
});
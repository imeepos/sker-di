import { Injector } from './injector';
import { InjectionToken } from './injection-token';

class TestService {
  constructor(public value: string = 'test') {}
}

class TestInjector extends Injector {
  get<T>(token: any): T {
    if (token === TestService) {
      return new TestService() as T;
    }
    if (token.toString().includes('测试令牌')) {
      return 'token-value' as T;
    }
    throw new Error(`Token not found: ${token}`);
  }

  destroy(): void {
    
  }

  getInjectorId(): string {
    return `test_injector`
  }
}

describe('Injector', () => {
  it('应该能够获取注册的依赖', () => {
    const injector = new TestInjector();
    const result = injector.get(TestService);
    expect(result).toBeInstanceOf(TestService);
  });

  it('应该支持InjectionToken类型的依赖获取', () => {
    const token = new InjectionToken<string>('测试令牌');
    const injector = new TestInjector();
    const result = injector.get(token);
    expect(result).toBe('token-value');
  });

  it('应该支持层次化注入器结构', () => {
    const parent = new TestInjector();
    const child = new TestInjector(parent);
    expect(child.parent).toBe(parent);
  });
});
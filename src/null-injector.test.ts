import { NullInjector } from './null-injector';
import { InjectionToken } from './injection-token';

describe('NullInjector', () => {
  class TestService {
    name = 'test';
  }

  const testToken = new InjectionToken<string>('测试令牌');
  
  it('应该作为注入器链的终点', () => {
    const nullInjector = new NullInjector();
    expect(nullInjector.parent).toBeUndefined();
  });

  it('应该对任何令牌抛出未找到错误', () => {
    const nullInjector = new NullInjector();
    
    expect(() => nullInjector.get(TestService))
      .toThrow('NullInjector: No provider for TestService');
      
    expect(() => nullInjector.get(testToken))
      .toThrow('NullInjector: No provider for InjectionToken 测试令牌');
  });

  it('应该提供有用的错误信息', () => {
    const nullInjector = new NullInjector();
    
    try {
      nullInjector.get(TestService);
    } catch (error: any) {
      expect(error.message).toContain('NullInjector');
      expect(error.message).toContain('TestService');
    }
  });
});
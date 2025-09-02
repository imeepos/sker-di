import { InjectionToken } from './injection-token';

describe('InjectionToken', () => {
  it('应该创建具有描述信息的注入令牌', () => {
    const token = new InjectionToken<string>('测试令牌');
    expect(token.toString()).toBe('InjectionToken 测试令牌');
  });

  it('应该支持泛型类型安全', () => {
    const stringToken = new InjectionToken<string>('字符串令牌');
    const numberToken = new InjectionToken<number>('数字令牌');
    
    expect(stringToken).toBeDefined();
    expect(numberToken).toBeDefined();
  });

  it('应该支持可选的默认值工厂函数', () => {
    const tokenWithFactory = new InjectionToken<string>('带工厂的令牌', {
      factory: () => '默认值'
    });
    
    expect(tokenWithFactory.toString()).toBe('InjectionToken 带工厂的令牌');
  });
});
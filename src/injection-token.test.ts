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

  describe('🔴 红阶段：边界情况和分支覆盖测试', () => {
    it('应该正确返回工厂函数', () => {
      // 🔴 失败的测试：验证factory getter
      const factoryFn = () => 'factory-value';
      const tokenWithFactory = new InjectionToken<string>('工厂令牌', {
        factory: factoryFn
      });
      
      expect(tokenWithFactory.factory).toBe(factoryFn);
    });

    it('应该返回undefined当没有工厂函数时', () => {
      // 🔴 失败的测试：验证无工厂时的factory getter
      const tokenWithoutFactory = new InjectionToken<string>('无工厂令牌');
      
      expect(tokenWithoutFactory.factory).toBeUndefined();
    });

    it('应该返回undefined当options为undefined时', () => {
      // 🔴 失败的测试：验证options为undefined时的factory getter
      const tokenWithUndefinedOptions = new InjectionToken<string>('令牌', undefined);
      
      expect(tokenWithUndefinedOptions.factory).toBeUndefined();
    });

    it('应该返回undefined当options存在但factory为undefined时', () => {
      // 🔴 失败的测试：验证options存在但factory为undefined的情况
      const tokenWithEmptyOptions = new InjectionToken<string>('令牌', {});
      
      expect(tokenWithEmptyOptions.factory).toBeUndefined();
    });

    it('应该支持复杂的工厂函数', () => {
      // 🔴 失败的测试：验证复杂工厂函数
      const complexFactory = () => ({ value: 'complex', timestamp: Date.now() });
      const tokenWithComplexFactory = new InjectionToken<any>('复杂工厂令牌', {
        factory: complexFactory
      });
      
      expect(tokenWithComplexFactory.factory).toBe(complexFactory);
      expect(typeof tokenWithComplexFactory.factory).toBe('function');
    });
  });
});
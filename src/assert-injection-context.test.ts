import { assertInInjectionContext } from './injection-context';
import { runInInjectionContext, getCurrentInjectionContext } from './injection-context';
import { EnvironmentInjector } from './environment-injector';

describe('assertInInjectionContext 验证函数测试', () => {
  describe('assertInInjectionContext 基本功能', () => {
    it('应该在有上下文时正常执行', () => {
      const injector = EnvironmentInjector.createWithAutoProviders([]);
      
      runInInjectionContext(injector, () => {
        expect(() => assertInInjectionContext()).not.toThrow();
      });
    });

    it('应该在没有上下文时抛出错误', () => {
      expect(() => assertInInjectionContext()).toThrow('inject() 必须在注入上下文中调用');
    });

    it('应该返回当前注入器上下文', () => {
      const injector = EnvironmentInjector.createWithAutoProviders([]);
      
      runInInjectionContext(injector, () => {
        const currentInjector = assertInInjectionContext();
        expect(currentInjector).toBe(injector);
      });
    });
  });

  describe('assertInInjectionContext 嵌套上下文', () => {
    it('应该在嵌套上下文中工作', () => {
      const parentInjector = EnvironmentInjector.createWithAutoProviders([]);
      const childInjector = EnvironmentInjector.createWithAutoProviders([], parentInjector);
      
      runInInjectionContext(parentInjector, () => {
        const parentContext = assertInInjectionContext();
        expect(parentContext).toBe(parentInjector);
        
        runInInjectionContext(childInjector, () => {
          const childContext = assertInInjectionContext();
          expect(childContext).toBe(childInjector);
        });
        
        // 恢复到父上下文
        const restoredContext = assertInInjectionContext();
        expect(restoredContext).toBe(parentInjector);
      });
    });
  });

  describe('assertInInjectionContext 错误消息', () => {
    it('应该支持自定义错误消息', () => {
      expect(() => assertInInjectionContext('自定义错误信息'))
        .toThrow('自定义错误信息');
    });

    it('应该在有自定义消息但有上下文时正常执行', () => {
      const injector = EnvironmentInjector.createWithAutoProviders([]);
      
      runInInjectionContext(injector, () => {
        expect(() => assertInInjectionContext('自定义错误信息')).not.toThrow();
        const currentInjector = assertInInjectionContext('自定义错误信息');
        expect(currentInjector).toBe(injector);
      });
    });
  });

  describe('assertInInjectionContext 与其他上下文函数的集成', () => {
    it('应该与 getCurrentInjectionContext 返回相同的结果', () => {
      const injector = EnvironmentInjector.createWithAutoProviders([]);
      
      runInInjectionContext(injector, () => {
        const assertResult = assertInInjectionContext();
        const getCurrentResult = getCurrentInjectionContext();
        
        expect(assertResult).toBe(getCurrentResult);
        expect(assertResult).toBe(injector);
      });
    });

    it('应该在没有上下文时与 getCurrentInjectionContext 的 null 值对应', () => {
      expect(getCurrentInjectionContext()).toBeNull();
      expect(() => assertInInjectionContext()).toThrow();
    });
  });

  describe('assertInInjectionContext 实际使用场景', () => {
    it('应该在 inject() 函数中使用', () => {
      // 模拟 inject() 函数的使用场景
      function mockInject<T>(token: any): T {
        const injector = assertInInjectionContext('inject() 必须在注入上下文中调用');
        return injector.get(token);
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: 'TEST_TOKEN', useValue: 'test-value' }
      ]);
      
      // 在上下文中正常工作
      runInInjectionContext(injector, () => {
        const value = mockInject('TEST_TOKEN');
        expect(value).toBe('test-value');
      });

      // 在上下文外抛出错误
      expect(() => mockInject('TEST_TOKEN')).toThrow('inject() 必须在注入上下文中调用');
    });
  });

  describe('assertInInjectionContext 异常情况', () => {
    it('应该在上下文被意外清空时抛出错误', () => {
      const injector = EnvironmentInjector.createWithAutoProviders([]);
      
      runInInjectionContext(injector, () => {
        // 正常情况
        expect(() => assertInInjectionContext()).not.toThrow();
      });

      // 上下文外
      expect(() => assertInInjectionContext()).toThrow();
    });
  });
});
import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { runInInjectionContext, getCurrentInjectionContext } from './injection-context';
import { InjectionToken } from './injection-token';

describe('注入上下文管理', () => {
  describe('runInInjectionContext', () => {
    it('应该在指定的注入器上下文中执行函数', () => {
      const TOKEN = new InjectionToken<string>('TEST_TOKEN');
      
      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'context-value' }
      ]);

      const result = runInInjectionContext(injector, () => {
        // 在上下文中获取当前注入器
        const contextInjector = getCurrentInjectionContext();
        expect(contextInjector).toBe(injector);
        return contextInjector?.get(TOKEN);
      });

      expect(result).toBe('context-value'); // ❌ 这会失败，因为功能未实现
    });

    it('应该嵌套注入上下文', () => {
      const TOKEN1 = new InjectionToken<string>('TOKEN1');
      const TOKEN2 = new InjectionToken<string>('TOKEN2');

      const injector1 = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN1, useValue: 'value1' }
      ]);

      const injector2 = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN2, useValue: 'value2' }
      ]);

      const result = runInInjectionContext(injector1, () => {
        const context1 = getCurrentInjectionContext();
        expect(context1).toBe(injector1);

        return runInInjectionContext(injector2, () => {
          const context2 = getCurrentInjectionContext();
          expect(context2).toBe(injector2); // 内层上下文应该覆盖外层
          return context2?.get(TOKEN2);
        });
      });

      expect(result).toBe('value2'); // ❌ 嵌套上下文未实现
    });

    it('应该在函数执行后恢复原来的上下文', () => {
      const TOKEN = new InjectionToken<string>('TEST_TOKEN');
      
      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'context-value' }
      ]);

      // 初始时没有上下文
      expect(getCurrentInjectionContext()).toBeNull();

      runInInjectionContext(injector, () => {
        expect(getCurrentInjectionContext()).toBe(injector);
      });

      // 执行后应该恢复原来的上下文
      expect(getCurrentInjectionContext()).toBeNull(); // ❌ 上下文恢复未实现
    });

    it('应该正确处理异步函数', async () => {
      const TOKEN = new InjectionToken<string>('ASYNC_TOKEN');
      
      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'async-value' }
      ]);

      // 在当前实现中，异步操作会丢失上下文（这是预期行为）
      // 需要在异步操作前保存上下文引用
      const result = await runInInjectionContext(injector, async () => {
        const contextInjector = getCurrentInjectionContext();
        expect(contextInjector).toBe(injector);
        
        // 在异步操作前保存上下文
        const savedContext = contextInjector;
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // 异步操作后上下文会丢失，使用保存的引用
        return savedContext?.get(TOKEN);
      });

      expect(result).toBe('async-value');
    });

    it('应该正确处理函数执行中的异常', () => {
      const TOKEN = new InjectionToken<string>('ERROR_TOKEN');
      
      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'error-value' }
      ]);

      expect(() => {
        runInInjectionContext(injector, () => {
          expect(getCurrentInjectionContext()).toBe(injector);
          throw new Error('测试异常');
        });
      }).toThrow('测试异常');

      // 异常后应该恢复原来的上下文
      expect(getCurrentInjectionContext()).toBeNull(); // ❌ 异常处理后的上下文恢复未实现
    });
  });

  describe('getCurrentInjectionContext', () => {
    it('在没有上下文时应该返回 null', () => {
      const context = getCurrentInjectionContext();
      expect(context).toBeNull(); // ❌ getCurrentInjectionContext 未实现
    });

    it('应该返回当前活跃的注入器', () => {
      const TOKEN = new InjectionToken<string>('CURRENT_TOKEN');
      
      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'current-value' }
      ]);

      runInInjectionContext(injector, () => {
        const currentInjector = getCurrentInjectionContext();
        expect(currentInjector).toBe(injector);
        expect(currentInjector?.get(TOKEN)).toBe('current-value');
      });
    });
  });

  describe('与依赖注入的集成', () => {
    it('服务应该能够使用当前上下文的注入器', () => {
      const CONFIG_TOKEN = new InjectionToken<{ env: string }>('CONFIG');
      
      @Injectable({ providedIn: 'root' })
      class ConfigService {
        constructor() {
          const injector = getCurrentInjectionContext();
          if (injector) {
            this.config = injector.get(CONFIG_TOKEN);
          } else {
            this.config = { env: 'default' };
          }
        }
        
        config: { env: string };
      }

      const testInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: CONFIG_TOKEN, useValue: { env: 'test' } }
      ]);

      const service = runInInjectionContext(testInjector, () => {
        return new ConfigService();
      });

      expect(service.config.env).toBe('test'); // ❌ 服务中的上下文获取未实现
    });

    it('应该在工厂函数中提供注入上下文', () => {
      const TOKEN1 = new InjectionToken<string>('TOKEN1');
      const TOKEN2 = new InjectionToken<string>('TOKEN2');

      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN1, useValue: 'value1' },
        { 
          provide: TOKEN2, 
          useFactory: () => {
            // 工厂函数中应该能获取当前上下文
            const contextInjector = getCurrentInjectionContext();
            expect(contextInjector).toBeTruthy();
            return contextInjector?.get(TOKEN1) + '-factory';
          }
        }
      ]);

      const result = runInInjectionContext(injector, () => {
        return injector.get(TOKEN2);
      });

      expect(result).toBe('value1-factory'); // ❌ 工厂函数中的上下文未实现
    });
  });
});
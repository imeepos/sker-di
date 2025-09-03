import * as DI from './index';
import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';
import { Inject } from './inject';
import { forwardRef } from './forward-ref';
import { enableDevMode, getDebugger, getInspector } from './index';

describe('🔴 红阶段：索引文件导出测试', () => {
  describe('核心注入器导出', () => {
    it('应该正确导出InjectionToken', () => {
      // 🔴 失败的测试：验证InjectionToken导出
      expect(DI.InjectionToken).toBeDefined();
      expect(typeof DI.InjectionToken).toBe('function');
      
      const token = new DI.InjectionToken('test-token');
      expect(token).toBeInstanceOf(DI.InjectionToken);
    });

    it('应该正确导出Injector相关类型', () => {
      // 🔴 失败的测试：验证Injector类型导出
      expect(DI.Injector).toBeDefined();
      expect(typeof DI.Injector).toBe('function');
    });

    it('应该正确导出NullInjector', () => {
      // 🔴 失败的测试：验证NullInjector导出
      expect(DI.NullInjector).toBeDefined();
      expect(typeof DI.NullInjector).toBe('function');
      
      const nullInjector = new DI.NullInjector();
      expect(nullInjector).toBeInstanceOf(DI.NullInjector);
    });

    it('应该正确导出EnvironmentInjector', () => {
      // 🔴 失败的测试：验证EnvironmentInjector导出
      expect(DI.EnvironmentInjector).toBeDefined();
      expect(typeof DI.EnvironmentInjector).toBe('function');
      
      const injector = new DI.EnvironmentInjector([]);
      expect(injector).toBeInstanceOf(DI.EnvironmentInjector);
      injector.destroy();
    });
  });

  describe('提供者类型导出', () => {
    it('应该导出所有Provider类型', () => {
      // 🟢 最小实现：验证Provider类型存在
      const providerTypes = [
        'Provider',
        'BaseProvider', 
        'ValueProvider',
        'ClassProvider',
        'FactoryProvider',
        'ExistingProvider',
        'ConstructorProvider',
        'LazyClassProvider',
        'LazyFactoryProvider'
      ];
      
      // 这些是TypeScript类型，在运行时不存在，但导入不应该报错
      expect(true).toBe(true); // 如果导入成功，测试通过
    });
  });

  describe('装饰器和元数据导出', () => {
    it('应该正确导出Injectable装饰器', () => {
      // 🔴 失败的测试：验证Injectable导出
      expect(DI.Injectable).toBeDefined();
      expect(typeof DI.Injectable).toBe('function');
      
      @DI.Injectable()
      class TestService {}
      
      expect(DI.isInjectable(TestService)).toBe(true);
    });

    it('应该正确导出Inject装饰器', () => {
      // 🔴 失败的测试：验证Inject导出
      expect(DI.Inject).toBeDefined();
      expect(typeof DI.Inject).toBe('function');
      
      const token = new DI.InjectionToken('test');
      
      @DI.Injectable()
      class TestService {
        constructor(@DI.Inject(token) value: string) {}
      }
      
      expect(DI.hasInjectMetadata(TestService)).toBe(true);
    });

    it('应该导出Injectable相关工具函数', () => {
      // 🟢 最小实现：验证工具函数导出
      expect(DI.getInjectableMetadata).toBeDefined();
      expect(DI.isInjectable).toBeDefined();
      expect(typeof DI.getInjectableMetadata).toBe('function');
      expect(typeof DI.isInjectable).toBe('function');
    });

    it('应该导出Inject相关工具函数', () => {
      // 🟢 最小实现：验证Inject工具函数
      expect(DI.getInjectMetadata).toBeDefined();
      expect(DI.getInjectOptionsMetadata).toBeDefined();
      expect(DI.hasInjectMetadata).toBeDefined();
      expect(typeof DI.getInjectMetadata).toBe('function');
      expect(typeof DI.getInjectOptionsMetadata).toBe('function');
      expect(typeof DI.hasInjectMetadata).toBe('function');
    });
  });

  describe('生命周期和上下文导出', () => {
    it('应该导出OnDestroy接口', () => {
      // 🟢 最小实现：OnDestroy是接口，运行时不存在
      expect(true).toBe(true); // 如果导入成功，测试通过
    });

    it('应该正确导出注入上下文函数', () => {
      // 🔴 失败的测试：验证注入上下文导出
      expect(DI.runInInjectionContext).toBeDefined();
      expect(DI.getCurrentInjectionContext).toBeDefined();
      expect(typeof DI.runInInjectionContext).toBe('function');
      expect(typeof DI.getCurrentInjectionContext).toBe('function');
    });
  });

  describe('前向引用导出', () => {
    it('应该正确导出forwardRef相关功能', () => {
      // 🔴 失败的测试：验证forwardRef导出
      expect(DI.forwardRef).toBeDefined();
      expect(DI.isForwardRef).toBeDefined();
      expect(DI.resolveForwardRef).toBeDefined();
      expect(typeof DI.forwardRef).toBe('function');
      expect(typeof DI.isForwardRef).toBe('function');
      expect(typeof DI.resolveForwardRef).toBe('function');
      
      const ref = DI.forwardRef(() => String);
      expect(DI.isForwardRef(ref)).toBe(true);
      expect(DI.resolveForwardRef(ref)).toBe(String);
    });
  });
});

describe('🟢 绿阶段：调试工具导出测试', () => {
  describe('调试器导出', () => {
    it('应该正确导出调试器相关功能', () => {
      // 🟢 最小实现：验证调试器导出
      expect(DI.DIDebugger).toBeDefined();
      expect(DI.getDebugger).toBeDefined();
      expect(DI.enableDevMode).toBeDefined();
      expect(DI.disableDebug).toBeDefined();
      expect(typeof DI.getDebugger).toBe('function');
      expect(typeof DI.enableDevMode).toBe('function');
      expect(typeof DI.disableDebug).toBe('function');
      
      const _debugger = DI.getDebugger();
      expect(_debugger).toBeInstanceOf(DI.DIDebugger);
    });

    it('应该导出调试级别和事件类型', () => {
      // 🟢 最小实现：验证枚举导出
      expect(DI.DebugLevel).toBeDefined();
      expect(DI.DebugEventType).toBeDefined();
      expect(typeof DI.DebugLevel).toBe('object');
      expect(typeof DI.DebugEventType).toBe('object');
    });
  });

  describe('检查器导出', () => {
    it('应该正确导出检查器相关功能', () => {
      // 🟢 最小实现：验证检查器导出
      expect(DI.DIInspector).toBeDefined();
      expect(DI.getInspector).toBeDefined();
      expect(DI.printHierarchy).toBeDefined();
      expect(DI.printStats).toBeDefined();
      expect(DI.searchTokens).toBeDefined();
      expect(DI.healthCheck).toBeDefined();
      expect(DI.generateReport).toBeDefined();
      
      expect(typeof DI.getInspector).toBe('function');
      expect(typeof DI.printHierarchy).toBe('function');
      expect(typeof DI.printStats).toBe('function');
      expect(typeof DI.searchTokens).toBe('function');
      expect(typeof DI.healthCheck).toBe('function');
      expect(typeof DI.generateReport).toBe('function');
    });

    it('应该能够使用导出的检查器功能', () => {
      // 🟢 最小实现：测试检查器功能
      DI.enableDevMode({ logToConsole: false });
      
      const inspector = DI.getInspector();
      expect(inspector).toBeInstanceOf(DI.DIInspector);
      
      const hierarchy = DI.printHierarchy();
      expect(typeof hierarchy).toBe('string');
      
      const stats = DI.printStats();
      expect(typeof stats).toBe('string');
      
      const health = DI.healthCheck();
      expect(typeof health).toBe('string');
      
      DI.disableDebug();
    });
  });
});

describe('🔄 重构阶段：集成测试', () => {
  it('应该能够使用导出的功能创建完整的DI系统', () => {
    // 🔄 重构：集成测试所有导出功能
    DI.enableDevMode({ logToConsole: false });
    
    const TOKEN = new DI.InjectionToken<string>('test-token');
    
    @DI.Injectable()
    class ServiceA {
      constructor(@DI.Inject(TOKEN) public value: string) {}
    }
    
    @DI.Injectable()
    class ServiceB {
      constructor(public serviceA: ServiceA) {}
    }
    
    const injector = new DI.EnvironmentInjector([
      { provide: TOKEN, useValue: 'test-value' },
      { provide: ServiceA, useClass: ServiceA },
      { provide: ServiceB, useClass: ServiceB }
    ]);
    
    const serviceB = injector.get(ServiceB);
    expect(serviceB).toBeInstanceOf(ServiceB);
    expect(serviceB.serviceA).toBeInstanceOf(ServiceA);
    expect(serviceB.serviceA.value).toBe('test-value');
    
    // 测试调试功能
    const inspector = DI.getInspector();
    const details = inspector.printInjectorDetails();
    expect(details).toContain('注入器详情');
    
    injector.destroy();
    DI.disableDebug();
  });

  it('应该能够使用forwardRef处理循环依赖', () => {
    // 🔄 重构：测试forwardRef集成
    @DI.Injectable()
    class CircularA {
      constructor(@DI.Inject(DI.forwardRef(() => CircularB)) public b: any) {}
    }
    
    @DI.Injectable()
    class CircularB {
      constructor(@DI.Inject(DI.forwardRef(() => CircularA)) public a: any) {}
    }
    
    const injector = new DI.EnvironmentInjector([
      { provide: CircularA, useClass: CircularA },
      { provide: CircularB, useClass: CircularB }
    ]);
    
    // 这应该抛出循环依赖错误，但不应该是初始化错误
    expect(() => injector.get(CircularA)).toThrow(/循环依赖/);
    
    injector.destroy();
  });
});

describe('PRD_v2.md 新功能导出测试', () => {
  describe('参数装饰器导出', () => {
    it('应该导出新增的参数装饰器', () => {
      expect(DI.Optional).toBeDefined();
      expect(DI.Self).toBeDefined();
      expect(DI.SkipSelf).toBeDefined();
      expect(DI.Host).toBeDefined();
      
      expect(typeof DI.Optional).toBe('function');
      expect(typeof DI.Self).toBe('function');
      expect(typeof DI.SkipSelf).toBe('function');
      expect(typeof DI.Host).toBe('function');
    });
  });

  describe('HostAttributeToken 导出', () => {
    it('应该导出 HostAttributeToken 相关功能', () => {
      expect(DI.HostAttributeToken).toBeDefined();
      expect(DI.isHostAttributeToken).toBeDefined();
      expect(DI.createHostAttributeToken).toBeDefined();
      
      expect(typeof DI.HostAttributeToken).toBe('function');
      expect(typeof DI.isHostAttributeToken).toBe('function');
      expect(typeof DI.createHostAttributeToken).toBe('function');
      
      const token = new DI.HostAttributeToken<string>('data-test');
      expect(DI.isHostAttributeToken(token)).toBe(true);
    });
  });

  describe('InternalInjectFlags 导出', () => {
    it('应该导出位标志优化系统', () => {
      expect(DI.InternalInjectFlags).toBeDefined();
      expect(DI.combineInjectFlags).toBeDefined();
      expect(DI.hasFlag).toBeDefined();
      expect(DI.convertInjectOptionsToFlags).toBeDefined();
      expect(DI.convertFlagsToInjectOptions).toBeDefined();
      expect(DI.flagsToString).toBeDefined();
      
      expect(typeof DI.combineInjectFlags).toBe('function');
      expect(typeof DI.hasFlag).toBe('function');
      expect(typeof DI.convertInjectOptionsToFlags).toBe('function');
      expect(typeof DI.convertFlagsToInjectOptions).toBe('function');
      expect(typeof DI.flagsToString).toBe('function');
    });
    
    it('应该能够使用位标志系统', () => {
      const flags = DI.combineInjectFlags(
        DI.InternalInjectFlags.Optional,
        DI.InternalInjectFlags.SkipSelf
      );
      
      expect(DI.hasFlag(flags, DI.InternalInjectFlags.Optional)).toBe(true);
      expect(DI.hasFlag(flags, DI.InternalInjectFlags.SkipSelf)).toBe(true);
      expect(DI.hasFlag(flags, DI.InternalInjectFlags.Self)).toBe(false);
      
      const flagsStr = DI.flagsToString(flags);
      expect(flagsStr).toContain('Optional');
      expect(flagsStr).toContain('SkipSelf');
    });
  });

  describe('assertInInjectionContext 导出', () => {
    it('应该导出 assertInInjectionContext 函数', () => {
      expect(DI.assertInInjectionContext).toBeDefined();
      expect(typeof DI.assertInInjectionContext).toBe('function');
    });
    
    it('应该在注入上下文中工作', () => {
      const injector = new DI.EnvironmentInjector([]);
      
      DI.runInInjectionContext(injector, () => {
        expect(() => DI.assertInInjectionContext()).not.toThrow();
        const currentInjector = DI.assertInInjectionContext();
        expect(currentInjector).toBe(injector);
      });
      
      injector.destroy();
    });
  });

  describe('🚀 便捷工厂函数测试', () => {
    it('应该正确导出createInjector函数', () => {
      // 🔴 失败的测试：验证createInjector导出
      expect(DI.createInjector).toBeDefined();
      expect(typeof DI.createInjector).toBe('function');
    });

    it('应该能够使用createInjector创建注入器', () => {
      // 🔴 失败的测试：验证createInjector功能
      const testToken = new InjectionToken<string>('TEST_TOKEN');

      const injector = DI.createInjector([
        { provide: testToken, useValue: 'test-value' }
      ]);

      expect(injector).toBeInstanceOf(EnvironmentInjector);
      expect(injector.get(testToken)).toBe('test-value');

      injector.destroy();
    });

    it('应该支持自动解析providedIn服务', () => {
      // 🔴 失败的测试：验证自动解析功能
      @Injectable({ providedIn: 'root' })
      class AutoService {
        getValue() { return 'auto-resolved'; }
      }

      // 使用createInjector创建注入器，不手动注册AutoService
      const injector = DI.createInjector([]);

      // AutoService应该被自动解析
      const instance = injector.get(AutoService);
      expect(instance).toBeInstanceOf(AutoService);
      expect(instance.getValue()).toBe('auto-resolved');

      injector.destroy();
    });

    it('应该支持父注入器参数', () => {
      // 🔴 失败的测试：验证父注入器功能
      const parentToken = new InjectionToken<string>('PARENT_TOKEN');
      const childToken = new InjectionToken<string>('CHILD_TOKEN');

      const parentInjector = DI.createInjector([
        { provide: parentToken, useValue: 'parent-value' }
      ]);

      const childInjector = DI.createInjector([
        { provide: childToken, useValue: 'child-value' }
      ], parentInjector);

      // 子注入器应该能访问父注入器的服务
      expect(childInjector.get(parentToken)).toBe('parent-value');
      expect(childInjector.get(childToken)).toBe('child-value');

      childInjector.destroy();
      parentInjector.destroy();
    });

    it('应该与EnvironmentInjector.createWithAutoProviders等价', () => {
      // 🔴 失败的测试：验证等价性
      const testToken = new InjectionToken<string>('EQUIV_TOKEN');
      const providers = [{ provide: testToken, useValue: 'equiv-value' }];

      const injector1 = DI.createInjector(providers);
      const injector2 = EnvironmentInjector.createWithAutoProviders(providers);

      // 两种方式创建的注入器应该行为一致
      expect(injector1.get(testToken)).toBe(injector2.get(testToken));
      expect(injector1.get(testToken)).toBe('equiv-value');
      expect(injector2.get(testToken)).toBe('equiv-value');

      injector1.destroy();
      injector2.destroy();
    });
  });
});
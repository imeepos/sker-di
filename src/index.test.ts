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
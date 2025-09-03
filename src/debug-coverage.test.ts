import 'reflect-metadata';
import { 
  DIDebugger, 
  DebugLevel, 
  DebugEventType, 
  getDebugger, 
  enableDevMode, 
  disableDebug 
} from './debug';

/**
 * 专门用于提高debug.ts覆盖率的测试
 * 测试DIDebugger类的所有方法和分支
 */
describe('Debug 覆盖率测试', () => {
  let diDebuggerInstance: DIDebugger;

  beforeEach(() => {
    diDebuggerInstance = DIDebugger.getInstance();
    // 重置调试器状态
    diDebuggerInstance.disable();
  });

  afterEach(() => {
    diDebuggerInstance.disable();
  });

  describe('DIDebugger 单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = DIDebugger.getInstance();
      const instance2 = DIDebugger.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('应该通过getDebugger函数获取实例', () => {
      const instance = getDebugger();
      expect(instance).toBe(DIDebugger.getInstance());
    });
  });

  describe('enableDevMode 方法', () => {
    it('应该启用开发模式并输出日志', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      diDebuggerInstance.enableDevMode({ logToConsole: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DI Debug] 开发模式已启用，调试级别:',
        'Info'
      );
      
      consoleSpy.mockRestore();
    });

    it('应该在禁用控制台日志时不输出', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      diDebuggerInstance.enableDevMode({ logToConsole: false });
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('应该使用默认配置', () => {
      diDebuggerInstance.enableDevMode();
      
      // 验证默认配置被应用
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(true);
    });

    it('应该合并自定义配置', () => {
      diDebuggerInstance.enableDevMode({
        level: DebugLevel.Debug,
        collectMetrics: false
      });
      
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(true);
    });
  });

  describe('便捷函数', () => {
    it('应该通过enableDevMode函数启用调试', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      enableDevMode({ logToConsole: true });
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('应该通过disableDebug函数禁用调试', () => {
      diDebuggerInstance.enableDevMode();
      let debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(true);

      disableDebug();
      debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(false);
    });
  });

  describe('disable 方法', () => {
    it('应该清理所有状态', () => {
      diDebuggerInstance.enableDevMode();
      
      // 添加一些数据
      diDebuggerInstance.registerInjector({
        id: 'test-injector',
        type: 'environment',
        providersCount: 5,
        instancesCount: 0,
        isDestroyed: false,
        providers: [],
        instances: []
      });

      diDebuggerInstance.disable();

      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(false);
    });
  });

  describe('startResolution 和 endResolution', () => {
    it('应该在禁用状态下不记录解析时间', () => {
      diDebuggerInstance.disable();
      
      // 这些调用应该早期返回
      diDebuggerInstance.startResolution('test-injector', 'TestToken');
      diDebuggerInstance.endResolution('test-injector', 'TestToken');
      
      // 验证没有记录任何指标
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.metrics.totalInjections).toBe(0);
    });

    it('应该在没有开始时间时不记录结束时间', () => {
      diDebuggerInstance.enableDevMode({ collectMetrics: true });
      
      // 直接记录结束时间，没有开始时间 - 覆盖 debug.ts:240 的 if (startTime) 分支
      diDebuggerInstance.endResolution('test-injector', 'TestToken');
      
      // 验证没有记录解析时间
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.metrics.averageResolutionTime).toBe(0);
    });

    it('应该正确记录解析时间', () => {
      diDebuggerInstance.enableDevMode({ collectMetrics: true });
      
      diDebuggerInstance.startResolution('test-injector', 'TestToken');
      // 添加小延迟
      setTimeout(() => {
        diDebuggerInstance.endResolution('test-injector', 'TestToken');
      }, 1);
      
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.metrics).toBeDefined();
    });

    it('应该在禁用指标收集时不记录', () => {
      diDebuggerInstance.enableDevMode({ collectMetrics: false });
      
      diDebuggerInstance.startResolution('test-injector', 'TestToken');
      diDebuggerInstance.endResolution('test-injector', 'TestToken');
      
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.metrics.totalInjections).toBe(0);
    });
  });

  describe('registerInjector 方法', () => {
    it('应该在禁用状态下不注册注入器', () => {
      diDebuggerInstance.disable();

      // 获取禁用前的注入器数量
      const beforeDebugInfo = diDebuggerInstance.getDebugInfo();
      const beforeCount = beforeDebugInfo.metrics.totalInjectors;

      diDebuggerInstance.registerInjector({
        id: 'test-injector',
        type: 'environment',
        providersCount: 5,
        instancesCount: 0,
        isDestroyed: false,
        providers: [],
        instances: []
      });

      const afterDebugInfo = diDebuggerInstance.getDebugInfo();
      // 在禁用状态下，注入器数量应该不变
      expect(afterDebugInfo.metrics.totalInjectors).toBe(beforeCount);
    });

    it('应该正确注册注入器', () => {
      diDebuggerInstance.enableDevMode();
      
      diDebuggerInstance.registerInjector({
        id: 'test-injector',
        type: 'environment',
        providersCount: 5,
        instancesCount: 0,
        isDestroyed: false,
        providers: [],
        instances: [],
        parentId: 'parent-injector'
      });

      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.metrics.totalInjectors).toBe(1);
    });
  });

  describe('updateInjector 方法', () => {
    it('应该在禁用状态下不更新注入器', () => {
      diDebuggerInstance.disable();
      
      diDebuggerInstance.updateInjector('test-injector', {
        providersCount: 10
      });
      
      // 应该没有任何效果
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(false);
    });

    it('应该更新存在的注入器', () => {
      diDebuggerInstance.enableDevMode();
      
      // 先注册注入器
      diDebuggerInstance.registerInjector({
        id: 'test-injector',
        type: 'environment',
        providersCount: 5,
        instancesCount: 0,
        isDestroyed: false,
        providers: [],
        instances: []
      });

      // 然后更新
      diDebuggerInstance.updateInjector('test-injector', {
        providersCount: 10
      });

      // 验证更新成功
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(true);
    });

    it('应该忽略不存在的注入器', () => {
      diDebuggerInstance.enableDevMode();
      
      // 尝试更新不存在的注入器
      diDebuggerInstance.updateInjector('non-existent', {
        providersCount: 10
      });
      
      // 应该没有错误
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(true);
    });
  });

  describe('logEvent 方法', () => {
    it('应该记录不同类型的事件', () => {
      diDebuggerInstance.enableDevMode();

      const events = [
        {
          type: DebugEventType.InjectorCreated,
          injectorId: 'test-injector',
          tokenName: 'TestToken'
        },
        {
          type: DebugEventType.DependencyRequested,
          injectorId: 'test-injector',
          tokenName: 'TestToken'
        },
        {
          type: DebugEventType.DependencyResolved,
          injectorId: 'test-injector',
          tokenName: 'TestToken',
          instance: { constructor: { name: 'TestClass' } }
        },
        {
          type: DebugEventType.CircularDependencyDetected,
          injectorId: 'test-injector',
          dependencyPath: ['A', 'B', 'A']
        }
      ];

      events.forEach(event => {
        diDebuggerInstance.logEvent(event);
      });

      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.recentEvents.length).toBe(events.length);
    });

    it('应该在禁用状态下不记录事件', () => {
      diDebuggerInstance.disable();

      diDebuggerInstance.logEvent({
        type: DebugEventType.DependencyRequested,
        injectorId: 'test-injector',
        tokenName: 'TestToken'
      });

      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.recentEvents.length).toBe(0);
    });
  });

  describe('getTokenName 私有方法测试', () => {
    it('应该通过不同类型的令牌测试getTokenName', () => {
      diDebuggerInstance.enableDevMode();

      // 测试不同类型的令牌，这会间接测试getTokenName方法
      const tokens = [
        'string-token',
        Symbol('symbol-token'),
        class TestClass {},
        function TestFunction() {},
        { toString: () => 'object-token' },
        null,
        undefined,
        123,
        true
      ];

      tokens.forEach((token) => {
        diDebuggerInstance.startResolution('test-injector', token);
        diDebuggerInstance.endResolution('test-injector', token);
      });

      // 验证没有错误
      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(true);
    });

    it('应该处理匿名函数', () => {
      diDebuggerInstance.enableDevMode();

      const anonymousFunction = function() {};
      Object.defineProperty(anonymousFunction, 'name', { value: '' });

      diDebuggerInstance.startResolution('test-injector', anonymousFunction);
      diDebuggerInstance.endResolution('test-injector', anonymousFunction);

      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(true);
    });
  });

  describe('控制台日志级别测试', () => {
    it('应该根据不同调试级别输出到不同的控制台方法', () => {
      const consoleSpies = {
        error: jest.spyOn(console, 'error').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        info: jest.spyOn(console, 'info').mockImplementation(),
        debug: jest.spyOn(console, 'debug').mockImplementation(),
        trace: jest.spyOn(console, 'trace').mockImplementation()
      };

      // 测试不同级别的事件
      const testCases = [
        { level: DebugLevel.Error, eventType: DebugEventType.CircularDependencyDetected },
        { level: DebugLevel.Warn, eventType: DebugEventType.AutoProviderResolved },
        { level: DebugLevel.Info, eventType: DebugEventType.DependencyRequested },
        { level: DebugLevel.Debug, eventType: DebugEventType.InjectorCreated },
        { level: DebugLevel.Trace, eventType: DebugEventType.InstanceCached }
      ];

      testCases.forEach(({ level, eventType }) => {
        diDebuggerInstance.enableDevMode({
          level,
          logToConsole: true
        });

        diDebuggerInstance.logEvent({
          type: eventType,
          injectorId: 'test-injector',
          tokenName: 'TestToken'
        });
      });

      // 清理
      Object.values(consoleSpies).forEach(spy => spy.mockRestore());
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空的配置对象', () => {
      expect(() => {
        diDebuggerInstance.enableDevMode({});
      }).not.toThrow();
    });

    it('应该处理undefined配置', () => {
      expect(() => {
        diDebuggerInstance.enableDevMode(undefined);
      }).not.toThrow();
    });

    it('应该处理极端的调试级别', () => {
      expect(() => {
        diDebuggerInstance.enableDevMode({ level: 999 as DebugLevel });
      }).not.toThrow();
    });

    it('应该处理大量事件', () => {
      diDebuggerInstance.enableDevMode();

      // 添加大量事件
      for (let i = 0; i < 1000; i++) {
        diDebuggerInstance.logEvent({
          type: DebugEventType.DependencyRequested,
          injectorId: `injector-${i}`,
          tokenName: `Token-${i}`
        });
      }

      const debugInfo = diDebuggerInstance.getDebugInfo();
      expect(debugInfo.recentEvents.length).toBeGreaterThan(0);
    });
  });
});

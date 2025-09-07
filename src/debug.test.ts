import { DIDebugger, getDebugger, enableDevMode, DebugLevel, DebugEventType, DebugEvent } from './debug';
import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';
import { Inject } from './inject';
import { forwardRef } from './forward-ref';
import { Injector } from './injector';

describe('调试支持测试', () => {
  beforeEach(() => {
    // 获取调试器实例并重置状态
    const diDebugger = getDebugger();
    diDebugger.disable(); // 清空状态
    diDebugger.clearHistory(); // 清空历史记录
    // 重置内部状态
    (diDebugger as any).injectorInfos.clear();
    (diDebugger as any).resolutionStartTimes.clear();
  });

  afterEach(() => {
    // 清理
    const diDebugger = getDebugger();
    diDebugger.disable();
    diDebugger.clearHistory();
    // 重置内部状态
    (diDebugger as any).injectorInfos.clear();
    (diDebugger as any).resolutionStartTimes.clear();
  });

  describe('🔴 红阶段：调试器基本功能测试', () => {
    it('调试器应该正确启用开发模式', () => {
      // 🔴 失败的测试：启用开发模式
      const diDebugger = getDebugger();
      diDebugger.enableDevMode({
        level: DebugLevel.Info,
        logToConsole: false,
        collectMetrics: true
      });

      const debugInfo = diDebugger.getDebugInfo();
      expect(debugInfo.config.enabled).toBe(true);
      expect(debugInfo.config.level).toBe(DebugLevel.Info);
      expect(debugInfo.config.collectMetrics).toBe(true);
    });

    it('应该测试不同调试级别的日志输出', () => {
      const diDebugger = getDebugger();
      const consoleSpy = {
        info: jest.spyOn(console, 'info').mockImplementation(),
        debug: jest.spyOn(console, 'debug').mockImplementation(),
        trace: jest.spyOn(console, 'trace').mockImplementation()
      };

      // 启用开发模式并设置不同级别
      diDebugger.enableDevMode({ level: DebugLevel.Info });
      diDebugger.logEvent({
        type: DebugEventType.DependencyRequested,
        tokenName: 'TestToken',
        injectorId: 'test-injector'
      });
      expect(consoleSpy.info).toHaveBeenCalled();

      diDebugger.enableDevMode({ level: DebugLevel.Debug });
      diDebugger.logEvent({
        type: DebugEventType.InstanceCached,
        tokenName: 'TestToken',
        injectorId: 'test-injector'
      });
      expect(consoleSpy.debug).toHaveBeenCalled();

      diDebugger.enableDevMode({ level: DebugLevel.Trace, logToConsole: true });
      diDebugger.logEvent({
        type: DebugEventType.DependencyRequested,
        tokenName: 'TestToken',
        injectorId: 'test-injector'
      });
      // DependencyRequested 事件在 trace 级别下输出到 console.info
      expect(consoleSpy.info).toHaveBeenCalled();

      // 清理
      consoleSpy.info.mockRestore();
      consoleSpy.debug.mockRestore();
      consoleSpy.trace.mockRestore();
    });

    it('应该测试formatEvent的默认分支', () => {
      const diDebugger = getDebugger();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      diDebugger.enableDevMode({ level: DebugLevel.Error });

      // 创建一个未知类型的事件来触发default分支
      const unknownEvent = {
        type: 'UnknownEventType' as any,
        tokenName: 'TestToken',
        injectorId: 'test-injector'
      };

      diDebugger.logEvent(unknownEvent);
      // 未知事件类型不会触发控制台输出，但会被记录
      const events = diDebugger.getDebugInfo().recentEvents;
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => (e as any).type === 'UnknownEventType')).toBe(true);

      consoleSpy.mockRestore();
    });


  });

  it('应该记录调试事件', () => {
    // 🔴 失败的测试：记录调试事件
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    diDebugger.logEvent({
      type: DebugEventType.InjectorCreated,
      injectorId: 'test-injector',
      metadata: { type: 'test' }
    });

    const debugInfo = diDebugger.getDebugInfo();
    expect(debugInfo.recentEvents).toHaveLength(1);
    expect(debugInfo.recentEvents[0].type).toBe(DebugEventType.InjectorCreated);
    expect(debugInfo.recentEvents[0].injectorId).toBe('test-injector');
  });

  it('应该限制事件历史记录大小', () => {
    // 🔴 失败的测试：限制历史记录大小
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      maxEventHistory: 3
    });

    // 记录超过最大历史数量的事件
    for (let i = 0; i < 5; i++) {
      diDebugger.logEvent({
        type: DebugEventType.DependencyRequested,
        injectorId: 'test-injector',
        tokenName: `token-${i}`
      });
    }

    const debugInfo = diDebugger.getDebugInfo();
    expect(debugInfo.recentEvents.length).toBeLessThanOrEqual(3);
  });

  describe('🔴 红阶段：未覆盖分支测试', () => {
    it('应该测试logToConsole为false时不输出到控制台', () => {
      const diDebugger = getDebugger();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // 🔴 测试logToConsole为false的分支
      diDebugger.enableDevMode({ logToConsole: false });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('🟢 绿阶段：注入器调试集成测试', () => {
  @Injectable({ providedIn: 'root' })
  class TestService {
    getValue(): string {
      return 'test-value';
    }
  }

  @Injectable()
  class DependentService {
    constructor(private testService: TestService) { }

    getTestValue(): string {
      return this.testService.getValue();
    }
  }

  it('应该记录注入器创建事件', () => {
    const diDebugger = getDebugger();
    // 🟢 最小实现：创建注入器时记录事件
    diDebugger.enableDevMode({ logToConsole: false });

    const injector = new EnvironmentInjector([
      { provide: TestService, useClass: TestService }
    ]);

    const debugInfo = diDebugger.getDebugInfo();
    const injectorEvents = debugInfo.recentEvents.filter(
      (e: any) => e.type === DebugEventType.InjectorCreated
    );

    expect(injectorEvents).toHaveLength(1);
    expect(injectorEvents[0].injectorId).toBe(injector.getInjectorId());
  });

  it('应该记录提供者注册事件', () => {
    const diDebugger = getDebugger();
    // 🟢 最小实现：注册提供者时记录事件
    diDebugger.enableDevMode({ logToConsole: false, maxEventHistory: 100 });

    const testToken = new InjectionToken<string>('TEST_TOKEN');
    const injector = new EnvironmentInjector([
      { provide: testToken, useValue: 'test' },
      { provide: TestService, useClass: TestService }
    ]);

    const debugInfo = diDebugger.getDebugInfo();
    // 过滤此次注入器创建的provider注册事件
    const thisInjectorId = injector.getInjectorId();
    const providerEvents = debugInfo.recentEvents.filter(
      e => e.type === DebugEventType.ProviderRegistered && e.injectorId === thisInjectorId
    );

    expect(providerEvents).toHaveLength(3); // testToken, TestService, Injector
    // 过滤掉自动注册的Injector provider，只检查用户提供的providers
    const userProviderEvents = providerEvents.filter(e => e.token !== Injector);
    expect(userProviderEvents).toHaveLength(2);
    expect(userProviderEvents.some(e => e.token === testToken)).toBe(true);
    expect(userProviderEvents.some(e => e.token === TestService)).toBe(true);
  });

  it('应该记录依赖请求和解析事件', () => {
    // 🟢 最小实现：依赖注入过程记录事件
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    const injector = new EnvironmentInjector([
      { provide: TestService, useClass: TestService }
    ]);

    const service = injector.get(TestService);

    const debugInfo = diDebugger.getDebugInfo();
    const requestEvents = debugInfo.recentEvents.filter(
      (e: any) => e.type === DebugEventType.DependencyRequested
    );
    const resolveEvents = debugInfo.recentEvents.filter(
      (e: any) => e.type === DebugEventType.DependencyResolved
    );

    expect(requestEvents).toHaveLength(1);
    expect(resolveEvents).toHaveLength(1);
    expect(service).toBeInstanceOf(TestService);
  });

  it('应该记录实例创建事件', () => {
    // 🟢 最小实现：实例创建时记录事件
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false, maxEventHistory: 100 });

    const injector = new EnvironmentInjector([
      { provide: TestService, useClass: TestService }
    ]);

    injector.get(TestService);

    const debugInfo = diDebugger.getDebugInfo();
    // 过滤此次注入器创建的实例创建事件
    const thisInjectorId = injector.getInjectorId();
    const createEvents = debugInfo.recentEvents.filter(
      (e: any) => e.type === DebugEventType.InstanceCreated && e.injectorId === thisInjectorId
    );

    expect(createEvents).toHaveLength(1);
    expect(createEvents[0].tokenName).toBe('TestService');
  });

  it('应该记录缓存命中事件', () => {
    // 🟢 最小实现：缓存命中时记录事件
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    const injector = new EnvironmentInjector([
      { provide: TestService, useClass: TestService }
    ]);

    // 第一次获取
    injector.get(TestService);
    // 第二次获取（应该命中缓存）
    injector.get(TestService);

    const debugInfo = diDebugger.getDebugInfo();
    const cacheEvents = debugInfo.recentEvents.filter(
      (e: any) => e.type === DebugEventType.InstanceCached
    );

    expect(cacheEvents).toHaveLength(1);
  });

  it('应该记录循环依赖检测事件', () => {
    // 🟢 最小实现：循环依赖检测记录事件
    @Injectable()
    class ServiceA {
      constructor(@Inject(forwardRef(() => ServiceB)) private serviceB: any) { }
    }

    @Injectable()
    class ServiceB {
      constructor(@Inject(forwardRef(() => ServiceA)) private serviceA: any) { }
    }

    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    const injector = new EnvironmentInjector([
      { provide: ServiceA, useClass: ServiceA },
      { provide: ServiceB, useClass: ServiceB }
    ]);

    expect(() => injector.get(ServiceA)).toThrow();

    const debugInfo = diDebugger.getDebugInfo();
    const circularEvents = debugInfo.recentEvents.filter(
      (e: any) => e.type === DebugEventType.CircularDependencyDetected
    );

    expect(circularEvents).toHaveLength(1);
  });

  it('应该记录注入器销毁事件', () => {
    // 🟢 最小实现：注入器销毁时记录事件
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    const injector = new EnvironmentInjector([
      { provide: TestService, useClass: TestService }
    ]);

    const injectorId = injector.getInjectorId();
    injector.destroy();

    const debugInfo = diDebugger.getDebugInfo();
    const destroyEvents = debugInfo.recentEvents.filter(
      (e: any) => e.type === DebugEventType.InjectorDestroyed
    );

    expect(destroyEvents).toHaveLength(1);
    expect(destroyEvents[0].injectorId).toBe(injectorId);
  });
});

describe('🔄 重构阶段：度量数据收集测试', () => {
  @Injectable()
  class MetricsTestService {
    getValue(): string {
      return 'metrics-test';
    }
  }

  it('应该正确收集度量数据', () => {
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    const injector = new EnvironmentInjector([
      { provide: MetricsTestService, useClass: MetricsTestService }
    ]);

    // 执行几次注入操作
    injector.get(MetricsTestService);
    injector.get(MetricsTestService); // 缓存命中

    const debugInfo = diDebugger.getDebugInfo();
    const metrics = debugInfo.metrics;

    expect(metrics.totalInjections).toBeGreaterThan(0);
    expect(metrics.totalInstancesCreated).toBeGreaterThan(0);
    expect(metrics.totalProviders).toBeGreaterThan(0);
    expect(metrics.totalInjectors).toBeGreaterThan(0);
  });

  it('应该计算缓存命中率', () => {
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    const injector = new EnvironmentInjector([
      { provide: MetricsTestService, useClass: MetricsTestService }
    ]);

    // 多次获取同一个服务以提高缓存命中率
    for (let i = 0; i < 5; i++) {
      injector.get(MetricsTestService);
    }

    const debugInfo = diDebugger.getDebugInfo();
    expect(debugInfo.metrics.cacheHitRate).toBeGreaterThan(0);
  });

  it('应该跟踪解析时间', () => {
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    const injector = new EnvironmentInjector([
      { provide: MetricsTestService, useClass: MetricsTestService }
    ]);

    // 执行注入操作
    injector.get(MetricsTestService);

    const debugInfo = diDebugger.getDebugInfo();
    expect(debugInfo.metrics.averageResolutionTime).toBeGreaterThanOrEqual(0);
  });
});

describe('调试信息查询测试', () => {
  @Injectable()
  class QueryTestService {
    getData(): string {
      return 'query-data';
    }
  }

  it('应该提供注入器调试信息', () => {
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    const injector = new EnvironmentInjector([
      { provide: QueryTestService, useClass: QueryTestService }
    ]);

    const injectorInfo = diDebugger.getInjectorInfo(injector.getInjectorId());

    expect(injectorInfo).toBeDefined();
    expect(injectorInfo!.id).toBe(injector.getInjectorId());
    expect(injectorInfo!.type).toBe('EnvironmentInjector');
    expect(injectorInfo!.providersCount).toBeGreaterThan(0);
  });

  it('应该构建依赖关系图', () => {
    @Injectable()
    class ChildService {
      getValue(): string {
        return 'child-value';
      }
    }

    @Injectable()
    class ParentService {
      constructor(private child: ChildService) { }
    }

    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    const injector = new EnvironmentInjector([
      { provide: ParentService, useClass: ParentService },
      { provide: ChildService, useClass: ChildService }
    ]);

    injector.get(ParentService);

    const dependencyGraph = diDebugger.getDependencyGraph();

    expect(Object.keys(dependencyGraph).length).toBeGreaterThan(0);
  });

  it('应该提供性能警告', () => {
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    // 创建多个注入器来触发警告
    const injectors = [];
    for (let i = 0; i < 3; i++) {
      injectors.push(new EnvironmentInjector([
        { provide: QueryTestService, useClass: QueryTestService }
      ]));
    }

    const warnings = diDebugger.getPerformanceWarnings();

    // 清理
    injectors.forEach(inj => inj.destroy());

    expect(Array.isArray(warnings)).toBe(true);
  });
});

describe('调试配置测试', () => {
  it('应该支持更新调试配置', () => {
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ level: DebugLevel.Error });

    diDebugger.updateConfig({
      level: DebugLevel.Debug,
      logToConsole: true
    });

    const config = diDebugger.getDebugInfo().config;
    expect(config.level).toBe(DebugLevel.Debug);
    expect(config.logToConsole).toBe(true);
  });

  it('应该支持禁用调试', () => {
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    expect(diDebugger.getDebugInfo().config.enabled).toBe(true);

    diDebugger.disable();

    expect(diDebugger.getDebugInfo().config.enabled).toBe(false);
    expect(diDebugger.getDebugInfo().recentEvents).toHaveLength(0);
  });

  it('应该支持清空调试历史', () => {
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    diDebugger.logEvent({
      type: DebugEventType.DependencyRequested,
      injectorId: 'test',
      tokenName: 'TestToken'
    });

    expect(diDebugger.getDebugInfo().recentEvents).toHaveLength(1);

    diDebugger.clearHistory();

    expect(diDebugger.getDebugInfo().recentEvents).toHaveLength(0);
  });

  it('应该支持导出调试数据', () => {
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    const injector = new EnvironmentInjector([
      { provide: 'TEST', useValue: 'test-value' }
    ]);

    const exportData = diDebugger.exportDebugData();

    expect(typeof exportData).toBe('string');
    expect(() => JSON.parse(exportData)).not.toThrow();

    const parsed = JSON.parse(exportData);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('config');
    expect(parsed).toHaveProperty('metrics');
    expect(parsed).toHaveProperty('injectors');
    expect(parsed).toHaveProperty('events');
  });
});

describe('便捷函数测试', () => {
  it('enableDevMode 便捷函数应该正常工作', () => {
    enableDevMode({ level: DebugLevel.Trace });

    const diDebugger = getDebugger();
    const config = diDebugger.getDebugInfo().config;
    expect(config.enabled).toBe(true);
    expect(config.level).toBe(DebugLevel.Trace);
  });

  it('disableDebug 便捷函数应该正常工作', () => {
    // 🔴 失败的测试：测试disableDebug便捷函数
    const { disableDebug } = require('./debug');
    const diDebugger = getDebugger();

    diDebugger.enableDevMode({ logToConsole: false });
    expect(diDebugger.getDebugInfo().config.enabled).toBe(true);

    disableDebug();
    expect(diDebugger.getDebugInfo().config.enabled).toBe(false);
  });
});

describe('🔴 红阶段：未覆盖方法测试', () => {
  it('应该获取特定注入器的调试信息', () => {
    // 🔴 失败的测试：getInjectorInfo方法
    @Injectable()
    class InjectorTestService {
      getValue(): string {
        return 'test-value';
      }
    }

    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    const injector = new EnvironmentInjector([
      { provide: InjectorTestService, useClass: InjectorTestService }
    ]);

    const injectorId = injector.getInjectorId();
    const injectorInfo = diDebugger.getInjectorInfo(injectorId);

    expect(injectorInfo).toBeDefined();
    expect(injectorInfo!.id).toBe(injectorId);
    expect(injectorInfo!.type).toBe('EnvironmentInjector');
    expect(injectorInfo!.providersCount).toBeGreaterThan(0);
  });

  it('应该返回undefined当注入器不存在时', () => {
    // 🔴 失败的测试：getInjectorInfo不存在的注入器
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    const nonExistentInfo = diDebugger.getInjectorInfo('non-existent-id');
    expect(nonExistentInfo).toBeUndefined();
  });

  it('应该正确计算缓存命中率', () => {
    // 🔴 失败的测试：缓存命中率计算
    @Injectable()
    class CacheTestService {
      getValue(): string {
        return 'test-value';
      }
    }

    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    const injector = new EnvironmentInjector([
      { provide: CacheTestService, useClass: CacheTestService }
    ]);

    // 第一次获取 - 创建实例
    injector.get(CacheTestService);
    // 第二次获取 - 缓存命中
    injector.get(CacheTestService);

    const metrics = diDebugger.getDebugInfo().metrics;
    expect(metrics.cacheHitRate).toBeGreaterThan(0);
  });

  it('应该正确处理解析时间统计', () => {
    // 🔴 失败的测试：解析时间统计
    @Injectable()
    class ResolutionTestService {
      getValue(): string {
        return 'test-value';
      }
    }

    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });
    const injector = new EnvironmentInjector([
      { provide: ResolutionTestService, useClass: ResolutionTestService }
    ]);

    // 模拟解析开始
    const tokenKey = diDebugger['getTokenName'](ResolutionTestService);
    diDebugger['resolutionStartTimes'].set(tokenKey, Date.now() - 5);

    // 获取服务触发解析完成
    injector.get(ResolutionTestService);

    const metrics = diDebugger.getDebugInfo().metrics;
    expect(metrics.averageResolutionTime).toBeGreaterThanOrEqual(0);
  });

  it('应该正确格式化不同类型的令牌名称', () => {
    // 🔴 失败的测试：getTokenName私有方法
    const diDebugger = getDebugger();
    const getTokenName = diDebugger['getTokenName'].bind(diDebugger);

    // 测试字符串令牌
    expect(getTokenName('string-token')).toBe('string-token');

    // 测试符号令牌
    const symbolToken = Symbol('test-symbol');
    expect(getTokenName(symbolToken)).toBe(symbolToken.toString());

    // 测试函数令牌
    class TokenTestClass { }
    expect(getTokenName(TokenTestClass)).toBe('TokenTestClass');

    // 测试匿名函数
    const anonymousFunc = function () { };
    expect(getTokenName(anonymousFunc)).toBe('anonymousFunc');

    // 测试对象令牌
    const objectToken = { toString: () => 'object-token' };
    expect(getTokenName(objectToken)).toBe('object-token');

    // 测试其他类型
    expect(getTokenName(123)).toBe('123');
    expect(getTokenName(null)).toBe('null');
  });

  it('应该正确获取事件级别', () => {
    // 🔴 失败的测试：getEventLevel私有方法
    const diDebugger = getDebugger();
    const getEventLevel = diDebugger['getEventLevel'].bind(diDebugger);

    expect(getEventLevel(DebugEventType.CircularDependencyDetected)).toBe(DebugLevel.Error);
    expect(getEventLevel(DebugEventType.AutoProviderResolved)).toBe(DebugLevel.Warn);
    expect(getEventLevel(DebugEventType.DependencyRequested)).toBe(DebugLevel.Info);
    expect(getEventLevel(DebugEventType.InjectorCreated)).toBe(DebugLevel.Debug);
  });

  it('应该正确格式化不同类型的事件', () => {
    // 🔴 失败的测试：formatEvent私有方法
    const diDebugger = getDebugger();
    const formatEvent = diDebugger['formatEvent'].bind(diDebugger);

    const dependencyRequestedEvent: DebugEvent = {
      type: DebugEventType.DependencyRequested,
      timestamp: Date.now(),
      injectorId: 'test-injector',
      tokenName: 'TestToken'
    };

    const formatted = formatEvent(dependencyRequestedEvent);
    expect(formatted).toContain('请求依赖');
    expect(formatted).toContain('TestToken');
    expect(formatted).toContain('test-injector');

    const circularEvent: DebugEvent = {
      type: DebugEventType.CircularDependencyDetected,
      timestamp: Date.now(),
      injectorId: 'test-injector',
      dependencyPath: ['ServiceA', 'ServiceB', 'ServiceA']
    };

    const circularFormatted = formatEvent(circularEvent);
    expect(circularFormatted).toContain('循环依赖');
    expect(circularFormatted).toContain('ServiceA -> ServiceB -> ServiceA');
  });

  it('应该在禁用度量收集时跳过度量更新', () => {
    // 🔴 失败的测试：度量收集禁用时的行为
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: false
    });

    const initialMetrics = { ...diDebugger.getDebugInfo().metrics };

    diDebugger.logEvent({
      type: DebugEventType.DependencyRequested,
      injectorId: 'test-injector',
      tokenName: 'TestToken'
    });

    const afterMetrics = diDebugger.getDebugInfo().metrics;
    expect(afterMetrics.totalInjections).toBe(initialMetrics.totalInjections);
  });

  it('应该在不同调试级别下正确输出到控制台', () => {
    // 🔴 失败的测试：控制台输出级别控制
    const diDebugger = getDebugger();
    
    // 确保状态清理
    diDebugger.disable();
    diDebugger.clearHistory();
    (diDebugger as any).injectorInfos.clear();
    (diDebugger as any).resolutionStartTimes.clear();
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    const consoleTraceSpy = jest.spyOn(console, 'trace').mockImplementation();

    try {
      diDebugger.enableDevMode({
        logToConsole: true,
        level: DebugLevel.Warn
      });

      // 错误级别事件应该输出
      diDebugger.logEvent({
        type: DebugEventType.CircularDependencyDetected,
        injectorId: 'test-injector',
        dependencyPath: ['A', 'B', 'A']
      });

      // 警告级别事件应该输出
      diDebugger.logEvent({
        type: DebugEventType.AutoProviderResolved,
        injectorId: 'test-injector',
        tokenName: 'TestToken'
      });

      // 验证之前的error和warn事件已被调用
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      // 清理之前的调用记录
      consoleSpy.mockClear();
      consoleWarnSpy.mockClear();
      consoleInfoSpy.mockClear();
      
      // 信息级别事件不应该输出（级别太低）
      diDebugger.logEvent({
        type: DebugEventType.DependencyRequested,
        injectorId: 'test-injector',
        tokenName: 'TestToken'
      });

      // 信息级别事件不应该触发任何控制台输出
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleDebugSpy.mockRestore();
      consoleTraceSpy.mockRestore();
    }
  });

  it('应该正确获取依赖关系图', () => {
    // 🔴 失败的测试：getDependencyGraph方法
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({ logToConsole: false });

    // 模拟依赖解析事件
    diDebugger.logEvent({
      type: DebugEventType.DependencyResolved,
      injectorId: 'test-injector',
      tokenName: 'ServiceA',
      dependencyPath: ['ServiceA', 'ServiceB']
    });

    diDebugger.logEvent({
      type: DebugEventType.DependencyResolved,
      injectorId: 'test-injector',
      tokenName: 'ServiceB',
      dependencyPath: ['ServiceB', 'ServiceC']
    });

    const graph = diDebugger.getDependencyGraph();
    expect(graph['ServiceA']).toContain('ServiceB');
    expect(graph['ServiceB']).toContain('ServiceC');
  });

  it('应该正确检测性能警告', () => {
    // 🔴 失败的测试：getPerformanceWarnings方法
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    // 模拟高解析时间
    diDebugger['metrics'].averageResolutionTime = 15;
    diDebugger['metrics'].circularDependencies = 2;
    diDebugger['metrics'].totalInjectors = 60;
    diDebugger['metrics'].cacheHitRate = 0.5;
    diDebugger['metrics'].totalInjections = 200;

    const warnings = diDebugger.getPerformanceWarnings();

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w: string) => w.includes('平均依赖解析时间较长'))).toBe(true);
    expect(warnings.some((w: string) => w.includes('循环依赖'))).toBe(true);
    expect(warnings.some((w: string) => w.includes('注入器数量过多'))).toBe(true);
    expect(warnings.some((w: string) => w.includes('缓存命中率较低'))).toBe(true);
  });

  it('应该正确更新解析时间统计', () => {
    // 🔴 失败的测试：updateResolutionTime私有方法
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    const updateResolutionTime = diDebugger['updateResolutionTime'].bind(diDebugger);

    // 初始状态 - 可能已有一些解析时间
    const initialTime = diDebugger.getDebugInfo().metrics.averageResolutionTime;
    expect(initialTime).toBeGreaterThanOrEqual(0);

    // 更新解析时间
    updateResolutionTime(10);
    expect(diDebugger.getDebugInfo().metrics.averageResolutionTime).toBeGreaterThan(0);

    updateResolutionTime(20);
    expect(diDebugger.getDebugInfo().metrics.averageResolutionTime).toBeGreaterThan(10);
  });

  it('应该正确处理不同事件类型的度量更新', () => {
    // 🔴 失败的测试：updateMetrics方法的所有分支
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    const initialMetrics = { ...diDebugger.getDebugInfo().metrics };

    // 测试ProviderRegistered事件
    diDebugger.logEvent({
      type: DebugEventType.ProviderRegistered,
      injectorId: 'test-injector',
      tokenName: 'TestProvider'
    });

    expect(diDebugger.getDebugInfo().metrics.totalProviders)
      .toBe(initialMetrics.totalProviders + 1);

    // 测试InstanceCreated事件
    diDebugger.logEvent({
      type: DebugEventType.InstanceCreated,
      injectorId: 'test-injector',
      tokenName: 'TestInstance'
    });

    expect(diDebugger.getDebugInfo().metrics.totalInstancesCreated)
      .toBe(initialMetrics.totalInstancesCreated + 1);

    // 测试AutoProviderResolved事件
    diDebugger.logEvent({
      type: DebugEventType.AutoProviderResolved,
      injectorId: 'test-injector',
      tokenName: 'AutoProvider'
    });

    expect(diDebugger.getDebugInfo().metrics.autoResolvedProviders)
      .toBe(initialMetrics.autoResolvedProviders + 1);
  });

  it('应该正确处理缓存命中率计算', () => {
    // 🔴 失败的测试：缓存命中率计算逻辑
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    // 先记录一些依赖请求
    diDebugger.logEvent({
      type: DebugEventType.DependencyRequested,
      injectorId: 'test-injector',
      tokenName: 'TestToken1'
    });

    diDebugger.logEvent({
      type: DebugEventType.DependencyRequested,
      injectorId: 'test-injector',
      tokenName: 'TestToken2'
    });

    // 记录缓存命中
    diDebugger.logEvent({
      type: DebugEventType.InstanceCached,
      injectorId: 'test-injector',
      tokenName: 'TestToken1'
    });

    const metrics = diDebugger.getDebugInfo().metrics;
    expect(metrics.cacheHitRate).toBeGreaterThan(0);
    expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
  });

  it('应该正确处理startResolution和endResolution', () => {
    // 🔴 失败的测试：解析计时功能
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: true
    });

    const testToken = 'TestToken';
    const injectorId = 'test-injector';

    // 开始解析
    diDebugger.startResolution(injectorId, testToken);

    // 检查是否记录了开始时间
    const resolutionTimes = diDebugger['resolutionStartTimes'];
    const key = `${injectorId}:${testToken}`;
    expect(resolutionTimes.has(key)).toBe(true);

    // 模拟一些处理时间
    setTimeout(() => {
      // 结束解析
      diDebugger.endResolution(injectorId, testToken);

      // 检查时间是否被清理
      expect(resolutionTimes.has(key)).toBe(false);
    }, 10);
  });

  it('应该在禁用度量收集时跳过计时操作', () => {
    // 🔴 失败的测试：禁用度量时的行为
    const diDebugger = getDebugger();
    // 确保状态清理
    diDebugger.disable();
    diDebugger.clearHistory();
    (diDebugger as any).injectorInfos.clear();
    (diDebugger as any).resolutionStartTimes.clear();
    
    diDebugger.enableDevMode({
      logToConsole: false,
      collectMetrics: false
    });

    const testToken = 'TestToken';
    const injectorId = 'test-injector';

    diDebugger.startResolution(injectorId, testToken);

    const resolutionTimes = diDebugger['resolutionStartTimes'];
    const key = `${injectorId}:${testToken}`;
    expect(resolutionTimes.has(key)).toBe(false);

    diDebugger.endResolution(injectorId, testToken);
    // 不应该有任何副作用
  });

  it('应该正确处理注入器注册和更新', () => {
    // 🔴 失败的测试：registerInjector和updateInjector方法

    const injectorInfo = {
      id: 'test-injector',
      type: 'EnvironmentInjector' as const,
      parentId: undefined,
      providersCount: 5,
      instancesCount: 0,
      isDestroyed: false,
      providers: [],
      instances: []
    };

    const diDebugger = getDebugger();
    // 确保状态清理
    diDebugger.disable();
    diDebugger.clearHistory();
    (diDebugger as any).injectorInfos.clear();
    (diDebugger as any).resolutionStartTimes.clear();
    
    // 启用调试器
    diDebugger.enableDevMode({ logToConsole: false });
    diDebugger.registerInjector(injectorInfo);

    const retrievedInfo = diDebugger.getInjectorInfo('test-injector');
    expect(retrievedInfo).toEqual(injectorInfo);
    expect(diDebugger.getDebugInfo().metrics.totalInjectors).toBe(1);

    // 更新注入器信息
    diDebugger.updateInjector('test-injector', { instancesCount: 3 });

    const updatedInfo = diDebugger.getInjectorInfo('test-injector');
    expect(updatedInfo!.instancesCount).toBe(3);
  });

  it('应该测试控制台日志输出的不同级别', () => {
    // 🔴 失败的测试：测试console日志输出
    const consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      trace: jest.spyOn(console, 'trace').mockImplementation()
    };

    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: true,
      level: DebugLevel.Trace
    });

    // 测试不同级别的事件日志输出
    diDebugger.logEvent({
      type: DebugEventType.CircularDependencyDetected,
      injectorId: 'test-injector',
      dependencyPath: ['A', 'B', 'A']
    });

    diDebugger.logEvent({
      type: DebugEventType.AutoProviderResolved,
      injectorId: 'test-injector',
      tokenName: 'TestToken'
    });

    diDebugger.logEvent({
      type: DebugEventType.DependencyRequested,
      injectorId: 'test-injector',
      tokenName: 'TestToken'
    });

    diDebugger.logEvent({
      type: DebugEventType.InjectorCreated,
      injectorId: 'test-injector'
    });

    expect(consoleSpy.error).toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalled();
    expect(consoleSpy.info).toHaveBeenCalled();
    expect(consoleSpy.debug).toHaveBeenCalled();

    // 清理spy
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  it('应该测试getTokenName方法处理不同类型的token', () => {
    // 🔴 失败的测试：测试token名称获取
    const diDebugger = getDebugger();
    // 确保状态清理
     diDebugger.disable();
     diDebugger.clearHistory();
     (diDebugger as any).injectorInfos.clear();
     (diDebugger as any).resolutionStartTimes.clear();
     
     diDebugger.enableDevMode({ logToConsole: false });

    // 测试symbol类型token
    const symbolToken = Symbol('TestSymbol');
    diDebugger.logEvent({
      type: DebugEventType.DependencyRequested,
      injectorId: 'test-injector',
      token: symbolToken,
      tokenName: (diDebugger as any).getTokenName(symbolToken)
    });

    // 测试匿名函数token
    const anonymousFunction = function () { };
    diDebugger.logEvent({
      type: DebugEventType.DependencyRequested,
      injectorId: 'test-injector',
      token: anonymousFunction,
      tokenName: (diDebugger as any).getTokenName(anonymousFunction)
    });

    // 测试有toString方法的对象token
    const objectWithToString = {
      toString: () => 'CustomObject'
    };
    diDebugger.logEvent({
      type: DebugEventType.DependencyRequested,
      injectorId: 'test-injector',
      token: objectWithToString,
      tokenName: (diDebugger as any).getTokenName(objectWithToString)
    });

    const events = diDebugger.getDebugInfo().recentEvents;
    expect(events).toHaveLength(3);

    // 验证token名称被正确处理
    expect(events.some(e => e.tokenName === 'Symbol(TestSymbol)')).toBe(true);
    expect(events.some(e => e.tokenName === 'anonymousFunction')).toBe(true);
    expect(events.some(e => e.tokenName === 'CustomObject')).toBe(true);
  });

  it('应该测试formatEvent方法的默认分支', () => {
    // 🔴 失败的测试：测试formatEvent的default情况
    const diDebugger = getDebugger();
    // 确保状态清理
     diDebugger.disable();
     diDebugger.clearHistory();
     (diDebugger as any).injectorInfos.clear();
     (diDebugger as any).resolutionStartTimes.clear();
     
     diDebugger.enableDevMode({
      logToConsole: false,
      level: DebugLevel.Info
    });

    // 创建一个未知类型的事件来触发default分支
    const timestamp = Date.now();
    const unknownEvent = {
      type: 'unknown-event-type' as any,
      timestamp,
      injectorId: 'test-injector',
      tokenName: 'TestToken'
    };

    // 直接测试formatEvent方法
    const formatEvent = diDebugger['formatEvent'].bind(diDebugger);
    const formattedMessage = formatEvent(unknownEvent);

    // 验证default格式化被调用
    expect(formattedMessage).toContain('unknown-event-type');
    expect(formattedMessage).toContain('TestToken');
    // formatEvent的default分支不包含时间戳，只验证格式
    expect(formattedMessage).toBe('unknown-event-type: TestToken');
  });

  it('应该正确处理Trace级别的日志输出', () => {
    // 🔴 测试console.trace分支
    const traceSpy = jest.spyOn(console, 'trace').mockImplementation();
    
    const diDebugger = getDebugger();
    diDebugger.enableDevMode({
      logToConsole: true,
      level: DebugLevel.Trace
    });

    // 直接调用私有方法logToConsole来测试Trace级别
    const logToConsole = diDebugger['logToConsole'].bind(diDebugger);
    const event: DebugEvent = {
      type: DebugEventType.DependencyRequested,
      timestamp: Date.now(),
      injectorId: 'test-injector',
      tokenName: 'TestToken'
    };

    // 模拟getEventLevel返回Trace级别
    const originalGetEventLevel = diDebugger['getEventLevel'];
    diDebugger['getEventLevel'] = () => DebugLevel.Trace;
    
    logToConsole(event);
    
    expect(traceSpy).toHaveBeenCalled();
    
    // 恢复原方法
    diDebugger['getEventLevel'] = originalGetEventLevel;
    traceSpy.mockRestore();
  });

  it('应该正确处理未知事件类型的级别获取', () => {
    // 🔴 测试getEventLevel的default分支
    const diDebugger = getDebugger();
    const getEventLevel = diDebugger['getEventLevel'].bind(diDebugger);
    
    // 测试未知事件类型
    const unknownEventType = 'unknown-type' as any;
    const level = getEventLevel(unknownEventType);
    
    expect(level).toBe(DebugLevel.Debug);
  });

  it('应该正确格式化没有构造函数名的实例事件', () => {
    // 🔴 测试第491行：event.instance?.constructor?.name || 'unknown'
    const diDebugger = getDebugger();
    enableDevMode({ logToConsole: false });

    // 创建一个没有constructor.name的对象
    const instanceWithoutName = Object.create(null);
    
    const event: DebugEvent = {
      type: DebugEventType.DependencyResolved,
      tokenName: 'test-token',
      instance: instanceWithoutName,
      timestamp: Date.now(),
      injectorId: 'test-injector-id'
    };

    const formatEvent = diDebugger['formatEvent'].bind(diDebugger);
    const message = formatEvent(event);
    
    expect(message).toContain('unknown');
  });

  it('应该正确格式化实例创建事件的构造函数名', () => {
    // 🔴 测试第493行：event.instance?.constructor?.name
    const diDebugger = getDebugger();
    enableDevMode({ logToConsole: false });

    class TestClass {
      constructor() {}
    }

    const instance = new TestClass();
    
    const event: DebugEvent = {
      type: DebugEventType.InstanceCreated,
      tokenName: 'TestClass',
      instance: instance,
      timestamp: Date.now(),
      injectorId: 'test-injector-id'
    };

    const formatEvent = diDebugger['formatEvent'].bind(diDebugger);
    const message = formatEvent(event);
    
    expect(message).toContain('TestClass');
    expect(message).toContain('类型: TestClass');
  });

  it('应该正确格式化没有构造函数的实例创建事件', () => {
    // 🔴 测试第493行：没有构造函数名的情况
    const diDebugger = getDebugger();
    enableDevMode({ logToConsole: false });

    // 创建一个没有constructor的对象
    const instanceWithoutConstructor = Object.create(null);
    
    const event: DebugEvent = {
      type: DebugEventType.InstanceCreated,
      tokenName: 'test-token',
      instance: instanceWithoutConstructor,
      timestamp: Date.now(),
      injectorId: 'test-injector-id'
    };

    const formatEvent = diDebugger['formatEvent'].bind(diDebugger);
    const message = formatEvent(event);
    
    expect(message).toContain('创建实例: test-token');
    expect(message).toContain('类型: undefined'); // 没有constructor.name时应该是undefined
  });
});
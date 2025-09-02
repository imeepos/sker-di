import { DIDebugger, getDebugger, enableDevMode, DebugLevel, DebugEventType } from './debug';
import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';
import { forwardRef } from './forward-ref';
import { Inject } from './inject';

describe('调试支持测试', () => {
  let diDebugger: DIDebugger;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    // 获取调试器实例并重置状态
    diDebugger = getDebugger();
    diDebugger.disable(); // 清空状态
  });

  afterEach(() => {
    // 清理
    if (injector) {
      injector.destroy();
    }
    diDebugger.disable();
  });

  describe('🔴 红阶段：调试器基本功能测试', () => {
    it('调试器应该正确启用开发模式', () => {
      // 🔴 失败的测试：启用开发模式
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

    it('应该记录调试事件', () => {
      // 🔴 失败的测试：记录调试事件
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
      constructor(private testService: TestService) {}

      getTestValue(): string {
        return this.testService.getValue();
      }
    }

    it('应该记录注入器创建事件', () => {
      // 🟢 最小实现：创建注入器时记录事件
      diDebugger.enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: TestService, useClass: TestService }
      ]);

      const debugInfo = diDebugger.getDebugInfo();
      const injectorEvents = debugInfo.recentEvents.filter(
        e => e.type === DebugEventType.InjectorCreated
      );
      
      expect(injectorEvents).toHaveLength(1);
      expect(injectorEvents[0].injectorId).toBe(injector.getInjectorId());
    });

    it('应该记录提供者注册事件', () => {
      // 🟢 最小实现：注册提供者时记录事件
      diDebugger.enableDevMode({ logToConsole: false });

      const testToken = new InjectionToken<string>('TEST_TOKEN');
      injector = new EnvironmentInjector([
        { provide: testToken, useValue: 'test' },
        { provide: TestService, useClass: TestService }
      ]);

      const debugInfo = diDebugger.getDebugInfo();
      const providerEvents = debugInfo.recentEvents.filter(
        e => e.type === DebugEventType.ProviderRegistered
      );
      
      expect(providerEvents).toHaveLength(2);
      expect(providerEvents[0].token).toBe(testToken);
      expect(providerEvents[1].token).toBe(TestService);
    });

    it('应该记录依赖请求和解析事件', () => {
      // 🟢 最小实现：依赖注入过程记录事件
      diDebugger.enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: TestService, useClass: TestService }
      ]);

      const service = injector.get(TestService);

      const debugInfo = diDebugger.getDebugInfo();
      const requestEvents = debugInfo.recentEvents.filter(
        e => e.type === DebugEventType.DependencyRequested
      );
      const resolveEvents = debugInfo.recentEvents.filter(
        e => e.type === DebugEventType.DependencyResolved
      );

      expect(requestEvents).toHaveLength(1);
      expect(resolveEvents).toHaveLength(1);
      expect(service).toBeInstanceOf(TestService);
    });

    it('应该记录实例创建事件', () => {
      // 🟢 最小实现：实例创建时记录事件
      diDebugger.enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: TestService, useClass: TestService }
      ]);

      injector.get(TestService);

      const debugInfo = diDebugger.getDebugInfo();
      const createEvents = debugInfo.recentEvents.filter(
        e => e.type === DebugEventType.InstanceCreated
      );
      
      expect(createEvents).toHaveLength(1);
      expect(createEvents[0].tokenName).toBe('TestService');
    });

    it('应该记录缓存命中事件', () => {
      // 🟢 最小实现：缓存命中时记录事件
      diDebugger.enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: TestService, useClass: TestService }
      ]);

      // 第一次获取
      injector.get(TestService);
      // 第二次获取（应该命中缓存）
      injector.get(TestService);

      const debugInfo = diDebugger.getDebugInfo();
      const cacheEvents = debugInfo.recentEvents.filter(
        e => e.type === DebugEventType.InstanceCached
      );
      
      expect(cacheEvents).toHaveLength(1);
    });

    it('应该记录循环依赖检测事件', () => {
      // 🟢 最小实现：循环依赖检测记录事件
      @Injectable()
      class ServiceA {
        constructor(@Inject(forwardRef(() => ServiceB)) private serviceB: any) {}
      }

      @Injectable()
      class ServiceB {
        constructor(@Inject(forwardRef(() => ServiceA)) private serviceA: any) {}
      }

      diDebugger.enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: ServiceA, useClass: ServiceA },
        { provide: ServiceB, useClass: ServiceB }
      ]);

      expect(() => injector.get(ServiceA)).toThrow();

      const debugInfo = diDebugger.getDebugInfo();
      const circularEvents = debugInfo.recentEvents.filter(
        e => e.type === DebugEventType.CircularDependencyDetected
      );
      
      expect(circularEvents).toHaveLength(1);
    });

    it('应该记录注入器销毁事件', () => {
      // 🟢 最小实现：注入器销毁时记录事件
      diDebugger.enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: TestService, useClass: TestService }
      ]);

      const injectorId = injector.getInjectorId();
      injector.destroy();

      const debugInfo = diDebugger.getDebugInfo();
      const destroyEvents = debugInfo.recentEvents.filter(
        e => e.type === DebugEventType.InjectorDestroyed
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
      diDebugger.enableDevMode({ 
        logToConsole: false, 
        collectMetrics: true 
      });

      injector = new EnvironmentInjector([
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
      diDebugger.enableDevMode({ 
        logToConsole: false, 
        collectMetrics: true 
      });

      injector = new EnvironmentInjector([
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
      diDebugger.enableDevMode({ 
        logToConsole: false, 
        collectMetrics: true 
      });

      injector = new EnvironmentInjector([
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
      diDebugger.enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
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
        constructor(private child: ChildService) {}
      }

      diDebugger.enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: ParentService, useClass: ParentService },
        { provide: ChildService, useClass: ChildService }
      ]);

      injector.get(ParentService);

      const dependencyGraph = diDebugger.getDependencyGraph();
      
      expect(Object.keys(dependencyGraph).length).toBeGreaterThan(0);
    });

    it('应该提供性能警告', () => {
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
      diDebugger.enableDevMode({ logToConsole: false });
      
      expect(diDebugger.getDebugInfo().config.enabled).toBe(true);

      diDebugger.disable();
      
      expect(diDebugger.getDebugInfo().config.enabled).toBe(false);
      expect(diDebugger.getDebugInfo().recentEvents).toHaveLength(0);
    });

    it('应该支持清空调试历史', () => {
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
      diDebugger.enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
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

      const config = diDebugger.getDebugInfo().config;
      expect(config.enabled).toBe(true);
      expect(config.level).toBe(DebugLevel.Trace);
    });
  });
});
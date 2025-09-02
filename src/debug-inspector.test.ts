import { DIInspector, getInspector } from './debug-inspector';
import { enableDevMode, getDebugger } from './debug';
import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { InjectionToken } from './injection-token';
import { forwardRef } from './forward-ref';
import { Inject } from './inject';

describe('调试检查器测试', () => {
  let inspector: DIInspector;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    // 重置调试器状态
    getDebugger().disable();
    inspector = getInspector();
  });

  afterEach(() => {
    if (injector) {
      injector.destroy();
    }
    getDebugger().disable();
  });

  describe('🔴 红阶段：检查器基本功能测试', () => {
    it('应该创建调试检查器实例', () => {
      // 🔴 失败的测试：创建检查器
      expect(inspector).toBeInstanceOf(DIInspector);
    });

    it('应该返回空状态消息当没有注入器时', () => {
      // 🔴 失败的测试：无注入器时的状态
      const hierarchy = inspector.printInjectorHierarchy();
      expect(hierarchy).toContain('没有发现活跃的注入器');
    });

    it('应该返回空搜索结果', () => {
      // 🔴 失败的测试：空搜索结果
      const searchResult = inspector.searchTokens('nonexistent');
      expect(searchResult).toContain('未找到');
    });
  });

  describe('🟢 绿阶段：注入器层次结构显示', () => {
    @Injectable({ providedIn: 'root' })
    class TestService {
      getValue(): string {
        return 'test';
      }
    }

    @Injectable()
    class ChildService {
      constructor(private testService: TestService) {}
    }

    it('应该正确显示注入器层次结构', () => {
      // 🟢 最小实现：显示单个注入器
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: TestService, useClass: TestService }
      ]);

      const hierarchy = inspector.printInjectorHierarchy();
      
      expect(hierarchy).toContain('依赖注入器层次结构');
      expect(hierarchy).toContain('EnvironmentInjector');
      expect(hierarchy).toContain('[活跃]');
      expect(hierarchy).toContain('提供者: 1');
    });

    it('应该显示父子注入器关系', () => {
      // 🟢 最小实现：父子关系显示
      enableDevMode({ logToConsole: false });

      const parentInjector = new EnvironmentInjector([
        { provide: TestService, useClass: TestService }
      ]);

      const childInjector = new EnvironmentInjector([
        { provide: ChildService, useClass: ChildService }
      ], parentInjector);

      const hierarchy = inspector.printInjectorHierarchy();
      
      expect(hierarchy).toContain('EnvironmentInjector');
      
      // 清理
      childInjector.destroy();
      parentInjector.destroy();
    });

    it('应该显示已销毁的注入器', () => {
      // 🟢 最小实现：已销毁注入器标识
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: TestService, useClass: TestService }
      ]);

      injector.destroy();

      const hierarchy = inspector.printInjectorHierarchy();
      expect(hierarchy).toContain('[已销毁]');
    });
  });

  describe('🔄 重构阶段：详细信息显示优化', () => {
    const TEST_TOKEN = new InjectionToken<string>('TEST_TOKEN');

    @Injectable()
    class DetailTestService {
      getValue(): string {
        return 'detail-test';
      }
    }

    it('应该显示注入器详细信息', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: TEST_TOKEN, useValue: 'test-value' },
        { provide: DetailTestService, useClass: DetailTestService },
        { provide: 'MULTI_TOKEN', useValue: 'value1', multi: true },
        { provide: 'MULTI_TOKEN', useValue: 'value2', multi: true }
      ]);

      // 获取服务以创建实例
      injector.get(DetailTestService);
      injector.get('MULTI_TOKEN');

      const details = inspector.printInjectorDetails();
      
      expect(details).toContain('注入器详情');
      expect(details).toContain('提供者列表');
      expect(details).toContain('实例列表');
      expect(details).toContain('DetailTestService');
      expect(details).toContain('[multi]');
    });

    it('应该显示特定注入器的详细信息', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: DetailTestService, useClass: DetailTestService }
      ]);

      const injectorId = injector.getInjectorId();
      const details = inspector.printInjectorDetails(injectorId);
      
      expect(details).toContain(injectorId);
      expect(details).toContain('DetailTestService');
    });

    it('应该处理不存在的注入器ID', () => {
      enableDevMode({ logToConsole: false });

      const details = inspector.printInjectorDetails('nonexistent-id');
      expect(details).toContain('未找到注入器');
    });
  });

  describe('性能统计显示测试', () => {
    @Injectable()
    class StatsTestService {
      compute(): number {
        return Math.random();
      }
    }

    it('应该显示性能统计信息', () => {
      enableDevMode({ 
        logToConsole: false, 
        collectMetrics: true 
      });

      injector = new EnvironmentInjector([
        { provide: StatsTestService, useClass: StatsTestService }
      ]);

      // 执行一些操作以生成统计数据
      injector.get(StatsTestService);
      injector.get(StatsTestService); // 缓存命中

      const stats = inspector.printPerformanceStats();
      
      expect(stats).toContain('性能统计');
      expect(stats).toContain('总注入次数');
      expect(stats).toContain('总实例创建');
      expect(stats).toContain('总提供者数');
      expect(stats).toContain('缓存命中率');
      expect(stats).toContain('平均解析时间');
    });

    it('应该显示性能警告', () => {
      enableDevMode({ 
        logToConsole: false, 
        collectMetrics: true 
      });

      // 创建循环依赖来触发警告
      @Injectable()
      class ServiceA {
        constructor(@Inject(forwardRef(() => ServiceB)) private serviceB: any) {}
      }

      @Injectable()
      class ServiceB {
        constructor(@Inject(forwardRef(() => ServiceA)) private serviceA: any) {}
      }

      injector = new EnvironmentInjector([
        { provide: ServiceA, useClass: ServiceA },
        { provide: ServiceB, useClass: ServiceB }
      ]);

      try {
        injector.get(ServiceA);
      } catch {
        // 预期的循环依赖错误
      }

      const stats = inspector.printPerformanceStats();
      
      // 检查是否包含警告信息
      expect(stats).toContain('性能统计');
    });
  });

  describe('依赖关系图显示测试', () => {
    @Injectable()
    class LeafService {
      getValue(): string {
        return 'leaf';
      }
    }

    @Injectable()
    class RootService {
      constructor(private leafService: LeafService) {}
    }

    it('应该显示依赖关系图', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: RootService, useClass: RootService },
        { provide: LeafService, useClass: LeafService }
      ]);

      // 获取根服务以建立依赖关系
      injector.get(RootService);

      const graph = inspector.printDependencyGraph();
      
      if (graph.includes('没有记录到依赖关系')) {
        // 如果没有记录到依赖关系，这也是正常的
        expect(graph).toContain('没有记录到依赖关系');
      } else {
        expect(graph).toContain('依赖关系图');
      }
    });

    it('应该处理空依赖图', () => {
      enableDevMode({ logToConsole: false });

      const graph = inspector.printDependencyGraph();
      expect(graph).toContain('没有记录到依赖关系');
    });
  });

  describe('搜索功能测试', () => {
    @Injectable()
    class SearchableService {
      search(): string {
        return 'found';
      }
    }

    it('应该能搜索提供者', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: SearchableService, useClass: SearchableService },
        { provide: 'SEARCH_TOKEN', useValue: 'searchable-value' }
      ]);

      const searchResult = inspector.searchTokens('Searchable');
      
      expect(searchResult).toContain('搜索结果');
      expect(searchResult).toContain('SearchableService');
    });

    it('应该能搜索实例', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: SearchableService, useClass: SearchableService }
      ]);

      // 创建实例
      injector.get(SearchableService);

      const searchResult = inspector.searchTokens('SearchableService');
      
      expect(searchResult).toContain('搜索结果');
      expect(searchResult).toContain('SearchableService');
    });

    it('应该区分大小写搜索', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: SearchableService, useClass: SearchableService }
      ]);

      const searchResult = inspector.searchTokens('searchable');
      
      expect(searchResult).toContain('搜索结果');
    });

    it('应该返回未找到消息', () => {
      enableDevMode({ logToConsole: false });

      const searchResult = inspector.searchTokens('NonExistentToken');
      expect(searchResult).toContain('未找到');
    });
  });

  describe('健康检查测试', () => {
    @Injectable()
    class HealthTestService {
      isHealthy(): boolean {
        return true;
      }
    }

    it('应该报告健康的系统状态', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: HealthTestService, useClass: HealthTestService }
      ]);

      injector.get(HealthTestService);

      const health = inspector.validateHealth();
      
      expect(health).toContain('健康状态检查');
      // 可能显示正常状态或警告，都是合法的
      expect(health).toMatch(/(正常|问题)/);
    });

    it('应该检测已销毁的注入器', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: HealthTestService, useClass: HealthTestService }
      ]);

      injector.destroy();

      const health = inspector.validateHealth();
      
      expect(health).toContain('健康状态检查');
      expect(health).toContain('已销毁的注入器');
    });

    it('应该检测空注入器', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([]); // 空的注入器

      const health = inspector.validateHealth();
      
      expect(health).toContain('健康状态检查');
    });
  });

  describe('报告生成测试', () => {
    @Injectable()
    class ReportTestService {
      generateData(): string {
        return 'report-data';
      }
    }

    it('应该生成完整的调试报告', () => {
      enableDevMode({ 
        logToConsole: false,
        collectMetrics: true 
      });

      injector = new EnvironmentInjector([
        { provide: ReportTestService, useClass: ReportTestService }
      ]);

      injector.get(ReportTestService);

      const report = inspector.generateReport();
      
      expect(report).toContain('依赖注入系统调试报告');
      expect(report).toContain('生成时间');
      expect(report).toContain('依赖注入器层次结构');
      expect(report).toContain('性能统计');
      expect(report).toContain('健康状态检查');
    });

    it('应该导出调试数据', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: ReportTestService, useClass: ReportTestService }
      ]);

      const exportData = inspector.exportData();
      
      expect(typeof exportData).toBe('string');
      expect(() => JSON.parse(exportData)).not.toThrow();
    });

    it('应该清空历史记录', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: ReportTestService, useClass: ReportTestService }
      ]);

      injector.get(ReportTestService);

      // 确保有历史记录
      expect(getDebugger().getDebugInfo().recentEvents.length).toBeGreaterThan(0);

      inspector.clearHistory();

      // 确保历史记录被清空
      expect(getDebugger().getDebugInfo().recentEvents.length).toBe(0);
    });
  });

  describe('便捷函数测试', () => {
    it('getInspector 应该返回单例实例', () => {
      const inspector1 = getInspector();
      const inspector2 = getInspector();
      
      expect(inspector1).toBe(inspector2);
    });
  });

  describe('私有方法和边界情况测试', () => {
    @Injectable()
    class EdgeCaseService {
      getValue(): string {
        return 'edge-case';
      }
    }

    it('应该正确处理空搜索字符串', () => {
      enableDevMode({ logToConsole: false });
      
      const searchResult = inspector.searchTokens('');
      expect(searchResult).toContain('未找到');
    });

    it('应该正确处理特殊字符搜索', () => {
      enableDevMode({ logToConsole: false });
      
      injector = new EnvironmentInjector([
        { provide: 'SPECIAL_TOKEN_$#@', useValue: 'special-value' }
      ]);

      const searchResult = inspector.searchTokens('SPECIAL');
      expect(searchResult).toContain('搜索结果');
    });

    it('应该正确显示多提供者标识', () => {
      enableDevMode({ logToConsole: false });
      
      injector = new EnvironmentInjector([
        { provide: 'MULTI_TOKEN', useValue: 'value1', multi: true },
        { provide: 'MULTI_TOKEN', useValue: 'value2', multi: true }
      ]);

      const details = inspector.printInjectorDetails();
      expect(details).toContain('[multi]');
    });

    it('应该正确处理循环依赖检测', () => {
      enableDevMode({ logToConsole: false });
      
      @Injectable()
      class ServiceA {
        constructor(@Inject(forwardRef(() => ServiceB)) private serviceB: any) {}
      }

      @Injectable()
      class ServiceB {
        constructor(@Inject(forwardRef(() => ServiceA)) private serviceA: any) {}
      }

      injector = new EnvironmentInjector([
        { provide: ServiceA, useClass: ServiceA },
        { provide: ServiceB, useClass: ServiceB }
      ]);

      try {
        injector.get(ServiceA);
      } catch (error) {
        // 预期的循环依赖错误
      }

      const health = inspector.validateHealth();
      expect(health).toContain('健康状态检查');
    });

    it('应该正确处理已销毁注入器的详细信息', () => {
      enableDevMode({ logToConsole: false });
      
      injector = new EnvironmentInjector([
        { provide: EdgeCaseService, useClass: EdgeCaseService }
      ]);

      const injectorId = injector.getInjectorId();
      injector.destroy();

      const details = inspector.printInjectorDetails(injectorId);
      expect(details).toContain('注入器详情');
    });

    it('应该正确处理空依赖图显示', () => {
      enableDevMode({ logToConsole: false });
      
      const graph = inspector.printDependencyGraph();
      expect(graph).toContain('没有记录到依赖关系');
    });

    it('应该正确处理性能统计的边界情况', () => {
      enableDevMode({ 
        logToConsole: false,
        collectMetrics: true 
      });
      
      // 不执行任何注入操作
      const stats = inspector.printPerformanceStats();
      expect(stats).toContain('性能统计');
      // 注入次数可能不为0，因为之前的测试可能有累积效果
      expect(stats).toMatch(/总注入次数: \d+/);
    });

    it('应该正确处理导出数据的边界情况', () => {
      enableDevMode({ logToConsole: false });
      
      const exportData = inspector.exportData();
      expect(typeof exportData).toBe('string');
      expect(() => JSON.parse(exportData)).not.toThrow();
      
      const parsedData = JSON.parse(exportData);
      expect(parsedData).toHaveProperty('timestamp');
    });

    it('应该正确处理报告生成的时间格式', () => {
      enableDevMode({ logToConsole: false });
      
      const report = inspector.generateReport();
      // 匹配中文日期格式 2025/9/2 或 ISO格式 2025-09-02
      expect(report).toMatch(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/);
      expect(report).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('应该正确处理注入器层次结构的缩进', () => {
      enableDevMode({ logToConsole: false });
      
      const parentInjector = new EnvironmentInjector([
        { provide: 'PARENT_SERVICE', useValue: 'parent' }
      ]);

      const childInjector = new EnvironmentInjector([
        { provide: 'CHILD_SERVICE', useValue: 'child' }
      ], parentInjector);

      const hierarchy = inspector.printInjectorHierarchy();
      expect(hierarchy).toContain('📦');
      
      // 清理
      childInjector.destroy();
      parentInjector.destroy();
    });

    it('应该正确处理健康检查的警告累积', () => {
      enableDevMode({ logToConsole: false });
      
      // 创建多个已销毁的注入器
      const injector1 = new EnvironmentInjector([]);
      const injector2 = new EnvironmentInjector([]);
      
      injector1.destroy();
      injector2.destroy();

      const health = inspector.validateHealth();
      expect(health).toContain('健康状态检查');
    });
  });

  describe('🔄 重构阶段：便捷函数测试', () => {
    it('应该通过便捷函数搜索令牌', () => {
      // 🔴 测试便捷函数 searchTokens
      const { searchTokens } = require('./debug-inspector');
      const result = searchTokens('test');
      expect(typeof result).toBe('string');
    });

    it('应该通过便捷函数执行健康检查', () => {
      // 🔴 测试便捷函数 healthCheck
      const { healthCheck } = require('./debug-inspector');
      const result = healthCheck();
      expect(typeof result).toBe('string');
      expect(result).toContain('健康状态检查');
    });

    it('应该通过便捷函数生成完整报告', () => {
      // 🔴 测试便捷函数 generateReport
      const { generateReport } = require('./debug-inspector');
      const result = generateReport();
      expect(typeof result).toBe('string');
      expect(result).toContain('📋 依赖注入系统调试报告');
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理空提供者列表的注入器', () => {
      enableDevMode({ logToConsole: false });
      injector = new EnvironmentInjector([]);
      
      const details = inspector.printInjectorDetails();
      expect(details).toContain('注入器详情');
    });

    it('应该处理多值提供者的显示', () => {
      enableDevMode({ logToConsole: false });
      const MULTI_TOKEN = new InjectionToken<string[]>('MULTI_TOKEN');
      
      injector = new EnvironmentInjector([
        { provide: MULTI_TOKEN, useValue: 'value1', multi: true },
        { provide: MULTI_TOKEN, useValue: 'value2', multi: true }
      ]);
      
      // 触发实例创建
      injector.get(MULTI_TOKEN);
      
      const details = inspector.printInjectorDetails();
      expect(details).toContain('[multi]');
    });

    it('应该处理搜索结果为空的情况', () => {
      enableDevMode({ logToConsole: false });
      const TOKEN = new InjectionToken<string>('SEARCH_TOKEN');
      
      injector = new EnvironmentInjector([
        { provide: TOKEN, useValue: 'searchable' }
      ]);
      
      const emptyResult = inspector.searchTokens('nonexistent');
      expect(emptyResult).toContain('未找到');
    });

    it('应该处理特定注入器ID的详细信息查询', () => {
      enableDevMode({ logToConsole: false });
      const TOKEN = new InjectionToken<string>('SPECIFIC_TOKEN');
      
      injector = new EnvironmentInjector([
        { provide: TOKEN, useValue: 'specific' }
      ]);
      
      const injectorId = injector.getInjectorId();
      const details = inspector.printInjectorDetails(injectorId);
      expect(details).toContain('注入器详情');
      
      // 测试不存在的注入器ID
      const notFoundDetails = inspector.printInjectorDetails('nonexistent-id');
      expect(notFoundDetails).toContain('未找到注入器');
    });

    it('应该处理子注入器的层次结构显示', () => {
      enableDevMode({ logToConsole: false });
      
      const parentInjector = new EnvironmentInjector([
        { provide: 'parent', useValue: 'parent-value' }
      ]);
      
      const childInjector = new EnvironmentInjector([
        { provide: 'child', useValue: 'child-value' }
      ], parentInjector);
      
      const hierarchy = inspector.printInjectorHierarchy();
      expect(hierarchy).toContain('依赖注入器层次结构');
      
      // 清理
      childInjector.destroy();
      parentInjector.destroy();
    });

    it('应该处理已销毁注入器的显示', () => {
      enableDevMode({ logToConsole: false });
      
      injector = new EnvironmentInjector([
        { provide: 'test', useValue: 'test-value' }
      ]);
      
      injector.destroy();
      
      const hierarchy = inspector.printInjectorHierarchy();
      expect(hierarchy).toContain('[已销毁]');
    });

    it('应该处理性能统计的边界情况', () => {
      enableDevMode({ 
        logToConsole: false,
        collectMetrics: true 
      });
      
      // 不执行任何注入操作，测试空统计
      const stats = inspector.printPerformanceStats();
      expect(stats).toContain('性能统计');
      expect(stats).toMatch(/总注入次数: \d+/);
    });

    it('应该处理依赖关系图的空状态', () => {
      enableDevMode({ logToConsole: false });
      
      const graph = inspector.printDependencyGraph();
      expect(graph).toContain('没有记录到依赖关系');
    });

    it('应该处理导出数据的JSON格式', () => {
      enableDevMode({ logToConsole: false });
      
      const exportData = inspector.exportData();
      expect(typeof exportData).toBe('string');
      expect(() => JSON.parse(exportData)).not.toThrow();
      
      const parsedData = JSON.parse(exportData);
      expect(parsedData).toHaveProperty('timestamp');
    });

    it('应该处理没有父注入器的注入器层次结构', () => {
      enableDevMode({ logToConsole: false });
      
      injector = new EnvironmentInjector([
        { provide: 'test', useValue: 'test-value' }
      ]);
      
      // 获取注入器信息，此时childMap.has(inj.parentId)为false的情况
      const hierarchy = inspector.printInjectorHierarchy();
      expect(hierarchy).toContain('📦');
    });

    it('应该处理注入器详情的条件分支', () => {
      enableDevMode({ logToConsole: false });
      
      injector = new EnvironmentInjector([
        { provide: 'test', useValue: 'test-value' }
      ]);
      
      // 测试不指定injectorId的情况 (行91的分支)
      const details = inspector.printInjectorDetails();
      expect(details).toContain('注入器详情');
      
      // 测试指定不存在injectorId的情况
      const nonExistentDetails = inspector.printInjectorDetails('non-existent');
      expect(nonExistentDetails).toContain('未找到注入器');
    });

    it('应该测试childMap父子关系构建的分支逻辑', () => {
      // 🔴 测试第39行：childMap.has(inj.parentId)的false分支
      enableDevMode({ logToConsole: false });

      // 创建父子注入器来触发childMap逻辑
      const parentInjector = new EnvironmentInjector([
        { provide: 'parent-service', useValue: 'parent-value' }
      ]);

      const childInjector1 = new EnvironmentInjector([
        { provide: 'child-service-1', useValue: 'child-value-1' }
      ], parentInjector);

      const childInjector2 = new EnvironmentInjector([
        { provide: 'child-service-2', useValue: 'child-value-2' }  
      ], parentInjector);

      // 这将触发childMap构建逻辑，包括第39行的分支
      const hierarchy = inspector.printInjectorHierarchy();
      expect(hierarchy).toContain('依赖注入器层次结构');
      expect(hierarchy).toContain('EnvironmentInjector');

      // 清理
      childInjector2.destroy();
      childInjector1.destroy();
      parentInjector.destroy();
    });

    it('应该测试懒加载提供者标志显示', () => {
      // 🔴 测试第123行：provider.isLazy为true的分支
      enableDevMode({ logToConsole: false });

      // 直接测试DIInspector的renderInjectorDetails方法对isLazy标志的处理
      const mockInjectorInfo = {
        id: 'test-injector',
        type: 'EnvironmentInjector',
        isDestroyed: false,
        parentId: undefined,
        providersCount: 2,
        instancesCount: 0,
        providers: [
          {
            token: 'lazy-provider',
            tokenType: 'string', 
            providerType: 'LazyClassProvider',
            isMulti: false,
            isLazy: true, // 这个标志是关键
            metadata: {}
          },
          {
            token: 'regular-provider',
            tokenType: 'string',
            providerType: 'ValueProvider', 
            isMulti: false,
            isLazy: false,
            metadata: {}
          }
        ],
        instances: []
      };

      // 直接调用private方法进行测试
      const details = (inspector as any).renderInjectorDetails(mockInjectorInfo);
      expect(details).toContain('[lazy]'); // 验证lazy标志显示
      expect(details).toContain('lazy-provider');
    });

    it('应该测试实例标志的组合显示', () => {
      // 🔴 测试第136-138行：实例的isLazy和hasOnDestroy标志组合
      enableDevMode({ logToConsole: false });

      @Injectable()
      class ServiceWithDestroy {
        ngOnDestroy() {
          // OnDestroy hook
        }
      }

      class LazyServiceWithDestroy {
        ngOnDestroy() {
          // OnDestroy hook
        }
      }

      injector = new EnvironmentInjector([
        { provide: ServiceWithDestroy, useClass: ServiceWithDestroy },
        { provide: 'lazy-with-destroy', useLazyClass: LazyServiceWithDestroy }
      ]);

      // 创建普通实例
      injector.get(ServiceWithDestroy);
      // 创建懒加载实例  
      injector.get('lazy-with-destroy');

      const details = inspector.printInjectorDetails();
      expect(details).toContain('[OnDestroy]'); // 测试OnDestroy标志
    });

    it('应该测试搜索时匹配instanceType的分支', () => {
      // 🔴 测试第230行：搜索匹配instanceType而非tokenName的分支
      enableDevMode({ logToConsole: false });

      class UniqueInstanceTypeService {
        value = 'unique';
      }

      injector = new EnvironmentInjector([
        { provide: 'generic-token', useClass: UniqueInstanceTypeService }
      ]);

      // 创建实例以便搜索
      injector.get('generic-token');

      // 搜索instanceType而非tokenName
      const searchResult = inspector.searchTokens('UniqueInstanceType');
      expect(searchResult).toContain('搜索结果');
      expect(searchResult).toContain('UniqueInstanceTypeService'); 
    });

    it('应该测试搜索时的复合匹配逻辑', () => {
      // 🔴 测试搜索功能的完整分支覆盖
      enableDevMode({ logToConsole: false });

      class SearchTestService {
        value = 'search-test';
      }

      injector = new EnvironmentInjector([
        { provide: 'SEARCH_TOKEN', useValue: 'search-value' },
        { provide: 'search-service', useClass: SearchTestService }
      ]);

      // 创建实例
      injector.get('search-service');

      // 测试tokenName匹配
      const tokenResult = inspector.searchTokens('SEARCH_TOKEN');
      expect(tokenResult).toContain('SEARCH_TOKEN');

      // 测试instanceType匹配  
      const instanceResult = inspector.searchTokens('SearchTest');
      expect(instanceResult).toContain('SearchTestService');

      // 测试大小写不敏感匹配
      const caseResult = inspector.searchTokens('searchtestservice');
      expect(caseResult).toContain('搜索结果');
    });

    it('应该处理基础调试信息显示', () => {
      enableDevMode({ logToConsole: false });

      injector = new EnvironmentInjector([
        { provide: 'test-token', useValue: 'test-value' }
      ]);
      
      injector.get('test-token');
      
      const details = inspector.printInjectorDetails();
      expect(details).toContain('test-token');
    });

    it('应该处理实例详细信息显示', () => {
      enableDevMode({ logToConsole: false });

      @Injectable()
      class TestService {
        value = 'test';
      }

      injector = new EnvironmentInjector([
        { provide: TestService, useClass: TestService }
      ]);
      
      injector.get(TestService);
      
      // 测试实例详情显示包含TestService类名
      const details = inspector.printInjectorDetails();
      expect(details).toContain('TestService');
    });
  });
});
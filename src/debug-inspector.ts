import { 
  DIDebugger, 
  getDebugger, 
  DebugLevel, 
  InjectorDebugInfo, 
  ProviderDebugInfo, 
  InstanceDebugInfo,
  DebugMetrics
} from './debug';

/**
 * 依赖注入调试检查器
 * 提供注入器状态检查和可视化工具
 */
export class DIInspector {
  private debugger: DIDebugger;

  constructor() {
    this.debugger = getDebugger();
  }

  /**
   * 打印注入器层次结构
   */
  printInjectorHierarchy(): string {
    const debugInfo = this.debugger.getDebugInfo();
    const injectors = debugInfo.injectors;
    
    if (injectors.length === 0) {
      return '没有发现活跃的注入器';
    }

    // 构建层次结构
    const rootInjectors = injectors.filter(inj => !inj.parentId);
    const childMap = new Map<string, InjectorDebugInfo[]>();
    
    for (const inj of injectors) {
      if (inj.parentId) {
        if (!childMap.has(inj.parentId)) {
          childMap.set(inj.parentId, []);
        }
        childMap.get(inj.parentId)!.push(inj);
      }
    }

    let output = '依赖注入器层次结构:\n';
    output += '=' + '='.repeat(30) + '\n';

    for (const root of rootInjectors) {
      output += this.renderInjectorTree(root, childMap, 0);
    }

    return output;
  }

  /**
   * 渲染注入器树
   */
  private renderInjectorTree(
    injector: InjectorDebugInfo, 
    childMap: Map<string, InjectorDebugInfo[]>, 
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const status = injector.isDestroyed ? '[已销毁]' : '[活跃]';
    
    let output = `${indent}📦 ${injector.type} (${injector.id}) ${status}\n`;
    output += `${indent}   └─ 提供者: ${injector.providersCount}，实例: ${injector.instancesCount}\n`;

    // 渲染子注入器
    const children = childMap.get(injector.id) || [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;
      output += this.renderInjectorTree(child, childMap, depth + 1);
    }

    return output;
  }

  /**
   * 打印注入器详细信息
   */
  printInjectorDetails(injectorId?: string): string {
    const debugInfo = this.debugger.getDebugInfo();
    const injectors = injectorId 
      ? debugInfo.injectors.filter(inj => inj.id === injectorId)
      : debugInfo.injectors;

    if (injectors.length === 0) {
      return injectorId 
        ? `未找到注入器: ${injectorId}`
        : '没有发现活跃的注入器';
    }

    let output = '';

    for (const injector of injectors) {
      output += this.renderInjectorDetails(injector);
      output += '\n' + '-'.repeat(60) + '\n';
    }

    return output;
  }

  /**
   * 渲染单个注入器详情
   */
  private renderInjectorDetails(injector: InjectorDebugInfo): string {
    let output = `📦 注入器详情: ${injector.id}\n`;
    output += `   类型: ${injector.type}\n`;
    output += `   状态: ${injector.isDestroyed ? '已销毁' : '活跃'}\n`;
    output += `   父注入器: ${injector.parentId || '无'}\n`;
    output += `   提供者数量: ${injector.providersCount}\n`;
    output += `   实例数量: ${injector.instancesCount}\n\n`;

    // 提供者信息
    if (injector.providers.length > 0) {
      output += '🔧 提供者列表:\n';
      for (const provider of injector.providers) {
        const flags = [];
        if (provider.isMulti) flags.push('multi');
        if (provider.isLazy) flags.push('lazy');
        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        
        output += `   • ${provider.token} (${provider.providerType})${flagStr}\n`;
      }
      output += '\n';
    }

    // 实例信息
    if (injector.instances.length > 0) {
      output += '📋 实例列表:\n';
      for (const instance of injector.instances) {
        const flags = [];
        if (instance.isLazy) flags.push('lazy');
        if (instance.hasOnDestroy) flags.push('OnDestroy');
        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        
        output += `   • ${instance.tokenName} → ${instance.instanceType}${flagStr}\n`;
      }
      output += '\n';
    }

    return output;
  }

  /**
   * 打印性能统计
   */
  printPerformanceStats(): string {
    const debugInfo = this.debugger.getDebugInfo();
    const metrics = debugInfo.metrics;

    let output = '📊 性能统计\n';
    output += '=' + '='.repeat(20) + '\n';
    output += `总注入次数: ${metrics.totalInjections}\n`;
    output += `总实例创建: ${metrics.totalInstancesCreated}\n`;
    output += `总提供者数: ${metrics.totalProviders}\n`;
    output += `总注入器数: ${metrics.totalInjectors}\n`;
    output += `平均解析时间: ${metrics.averageResolutionTime.toFixed(2)}ms\n`;
    output += `缓存命中率: ${(metrics.cacheHitRate * 100).toFixed(1)}%\n`;
    output += `循环依赖数: ${metrics.circularDependencies}\n`;
    output += `自动解析提供者: ${metrics.autoResolvedProviders}\n\n`;

    // 性能警告
    const warnings = this.debugger.getPerformanceWarnings();
    if (warnings.length > 0) {
      output += '⚠️ 性能警告:\n';
      for (const warning of warnings) {
        output += `   • ${warning}\n`;
      }
      output += '\n';
    }

    return output;
  }

  /**
   * 打印依赖关系图
   */
  printDependencyGraph(): string {
    const graph = this.debugger.getDependencyGraph();
    const keys = Object.keys(graph);

    if (keys.length === 0) {
      return '没有记录到依赖关系';
    }

    let output = '🔗 依赖关系图\n';
    output += '=' + '='.repeat(20) + '\n';

    for (const from of keys) {
      const dependencies = graph[from];
      output += `${from}:\n`;
      for (const to of dependencies) {
        output += `   └─ ${to}\n`;
      }
      output += '\n';
    }

    return output;
  }

  /**
   * 搜索令牌
   */
  searchTokens(searchTerm: string): string {
    const debugInfo = this.debugger.getDebugInfo();
    const results: Array<{
      injectorId: string;
      type: 'provider' | 'instance';
      info: ProviderDebugInfo | InstanceDebugInfo;
    }> = [];

    // 搜索提供者
    for (const injector of debugInfo.injectors) {
      for (const provider of injector.providers) {
        if (provider.token.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            injectorId: injector.id,
            type: 'provider',
            info: provider
          });
        }
      }

      // 搜索实例
      for (const instance of injector.instances) {
        if (instance.tokenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            instance.instanceType.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            injectorId: injector.id,
            type: 'instance',
            info: instance
          });
        }
      }
    }

    if (results.length === 0) {
      return `未找到包含"${searchTerm}"的令牌`;
    }

    let output = `🔍 搜索结果: "${searchTerm}"\n`;
    output += '=' + '='.repeat(30) + '\n';

    for (const result of results) {
      output += `注入器: ${result.injectorId}\n`;
      if (result.type === 'provider') {
        const provider = result.info as ProviderDebugInfo;
        output += `   🔧 提供者: ${provider.token} (${provider.providerType})\n`;
      } else {
        const instance = result.info as InstanceDebugInfo;
        output += `   📋 实例: ${instance.tokenName} → ${instance.instanceType}\n`;
      }
      output += '\n';
    }

    return output;
  }

  /**
   * 验证注入器健康状态
   */
  validateHealth(): string {
    const debugInfo = this.debugger.getDebugInfo();
    const issues: string[] = [];

    // 检查销毁的注入器
    const destroyedCount = debugInfo.injectors.filter(inj => inj.isDestroyed).length;
    if (destroyedCount > 0) {
      issues.push(`发现 ${destroyedCount} 个已销毁的注入器`);
    }

    // 检查性能问题
    const warnings = this.debugger.getPerformanceWarnings();
    issues.push(...warnings);

    // 检查空注入器
    const emptyInjectors = debugInfo.injectors.filter(inj => 
      !inj.isDestroyed && inj.providersCount === 0 && inj.instancesCount === 0
    );
    if (emptyInjectors.length > 0) {
      issues.push(`发现 ${emptyInjectors.length} 个空的活跃注入器`);
    }

    let output = '🏥 健康状态检查\n';
    output += '=' + '='.repeat(20) + '\n';

    if (issues.length === 0) {
      output += '✅ 所有注入器状态正常\n';
    } else {
      output += `⚠️ 发现 ${issues.length} 个问题:\n`;
      for (const issue of issues) {
        output += `   • ${issue}\n`;
      }
    }

    return output;
  }

  /**
   * 生成完整的调试报告
   */
  generateReport(): string {
    let report = '';
    
    report += '📋 依赖注入系统调试报告\n';
    report += '=' + '='.repeat(40) + '\n';
    report += `生成时间: ${new Date().toLocaleString()}\n\n`;

    report += this.printInjectorHierarchy() + '\n';
    report += this.printPerformanceStats() + '\n';
    report += this.validateHealth() + '\n';
    report += this.printDependencyGraph() + '\n';

    return report;
  }

  /**
   * 清空调试历史
   */
  clearHistory(): void {
    this.debugger.clearHistory();
  }

  /**
   * 导出调试数据
   */
  exportData(): string {
    return this.debugger.exportDebugData();
  }
}

/**
 * 全局调试检查器实例
 */
let inspectorInstance: DIInspector | null = null;

/**
 * 获取调试检查器实例
 */
export function getInspector(): DIInspector {
  if (!inspectorInstance) {
    inspectorInstance = new DIInspector();
  }
  return inspectorInstance;
}

/**
 * 便捷函数：打印注入器层次结构
 */
export function printHierarchy(): void {
  console.log(getInspector().printInjectorHierarchy());
}

/**
 * 便捷函数：打印性能统计
 */
export function printStats(): void {
  console.log(getInspector().printPerformanceStats());
}

/**
 * 便捷函数：搜索令牌
 */
export function searchTokens(term: string): void {
  console.log(getInspector().searchTokens(term));
}

/**
 * 便捷函数：健康检查
 */
export function healthCheck(): void {
  console.log(getInspector().validateHealth());
}

/**
 * 便捷函数：生成完整报告
 */
export function generateReport(): void {
  console.log(getInspector().generateReport());
}
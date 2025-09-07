import { Injectable } from './injectable';
/**
 * 调试级别
 */
export enum DebugLevel {
  None = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
  Trace = 5
}

/**
 * 调试事件类型
 */
export enum DebugEventType {
  InjectorCreated = 'injector-created',
  ProviderRegistered = 'provider-registered',
  PlatformEvent = 'platform-event',
  FeatureEvent = 'feature-event',
  DependencyRequested = 'dependency-requested',
  DependencyResolved = 'dependency-resolved',
  InstanceCreated = 'instance-created',
  InstanceCached = 'instance-cached',
  CircularDependencyDetected = 'circular-dependency-detected',
  AutoProviderResolved = 'auto-provider-resolved',
  InjectorDestroyed = 'injector-destroyed'
}

/**
 * 调试事件数据
 */
export interface DebugEvent {
  type: DebugEventType;
  timestamp: number;
  injectorId: string;
  token?: any;
  tokenName?: string;
  provider?: any;
  instance?: any;
  dependencyPath?: string[];
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * 注入器调试信息
 */
export interface InjectorDebugInfo {
  id: string;
  type: string;
  parentId?: string;
  providersCount: number;
  instancesCount: number;
  isDestroyed: boolean;
  providers: ProviderDebugInfo[];
  instances: InstanceDebugInfo[];
}

/**
 * 提供者调试信息
 */
export interface ProviderDebugInfo {
  token: string;
  tokenType: string;
  providerType: string;
  isMulti: boolean;
  isLazy: boolean;
  metadata?: Record<string, any>;
}

/**
 * 实例调试信息
 */
export interface InstanceDebugInfo {
  token: string;
  tokenName: string;
  instanceType: string;
  createdAt: number;
  isLazy: boolean;
  hasOnDestroy: boolean;
}

/**
 * 调试配置
 */
export interface DebugConfig {
  enabled: boolean;
  level: DebugLevel;
  logToConsole: boolean;
  collectMetrics: boolean;
  maxEventHistory: number;
  includeStackTrace: boolean;
}

/**
 * 调试度量数据
 */
export interface DebugMetrics {
  totalInjections: number;
  totalInstancesCreated: number;
  totalProviders: number;
  totalInjectors: number;
  averageResolutionTime: number;
  circularDependencies: number;
  autoResolvedProviders: number;
  cacheHitRate: number;
}
/**
 * 依赖注入调试器
 */
export class DIDebugger {
  private config: DebugConfig;
  private eventHistory: DebugEvent[] = [];
  private metrics: DebugMetrics;
  private injectorInfos = new Map<string, InjectorDebugInfo>();
  private resolutionStartTimes = new Map<string, number>();

  constructor() {
    this.config = {
      enabled: false,
      level: DebugLevel.Error,
      logToConsole: false,
      collectMetrics: false,
      maxEventHistory: 1000,
      includeStackTrace: false
    };

    this.metrics = {
      totalInjections: 0,
      totalInstancesCreated: 0,
      totalProviders: 0,
      totalInjectors: 0,
      averageResolutionTime: 0,
      circularDependencies: 0,
      autoResolvedProviders: 0,
      cacheHitRate: 0
    };
  }


  /**
   * 启用开发模式调试
   */
  enableDevMode(config: Partial<DebugConfig> = {}): void {
    this.config = {
      ...this.config,
      enabled: true,
      level: DebugLevel.Info,
      logToConsole: true,
      collectMetrics: true,
      ...config
    };

    if (this.config.logToConsole) {
      console.log('[DI Debug] 开发模式已启用，调试级别:', DebugLevel[this.config.level]);
    }
  }

  /**
   * 禁用调试
   */
  disable(): void {
    this.config.enabled = false;
    this.eventHistory.length = 0;
    this.injectorInfos.clear();
    this.resolutionStartTimes.clear();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 记录调试事件
   */
  logEvent(event: Omit<DebugEvent, 'timestamp'>): void {
    if (!this.config.enabled) {
      return;
    }

    const debugEvent: DebugEvent = {
      ...event,
      timestamp: Date.now()
    };

    // 添加到历史记录
    this.eventHistory.push(debugEvent);

    // 限制历史记录大小
    if (this.eventHistory.length > this.config.maxEventHistory) {
      this.eventHistory.shift();
    }

    // 更新度量数据
    this.updateMetrics(debugEvent);

    // 控制台输出
    if (this.config.logToConsole) {
      this.logToConsole(debugEvent);
    }
  }

  /**
   * 开始依赖解析计时
   */
  startResolution(injectorId: string, token: any): void {
    if (!this.config.enabled || !this.config.collectMetrics) {
      return;
    }

    const key = `${injectorId}:${this.getTokenName(token)}`;
    this.resolutionStartTimes.set(key, performance.now());
  }

  /**
   * 结束依赖解析计时
   */
  endResolution(injectorId: string, token: any): void {
    if (!this.config.enabled || !this.config.collectMetrics) {
      return;
    }

    const key = `${injectorId}:${this.getTokenName(token)}`;
    const startTime = this.resolutionStartTimes.get(key);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.updateResolutionTime(duration);
      this.resolutionStartTimes.delete(key);
    }
  }

  /**
   * 注册注入器信息
   */
  registerInjector(info: InjectorDebugInfo): void {
    if (!this.config.enabled) {
      return;
    }

    this.injectorInfos.set(info.id, info);
    this.metrics.totalInjectors = this.injectorInfos.size;

    this.logEvent({
      type: DebugEventType.InjectorCreated,
      injectorId: info.id,
      metadata: {
        type: info.type,
        parentId: info.parentId,
        providersCount: info.providersCount
      }
    });
  }

  /**
   * 更新注入器信息
   */
  updateInjector(injectorId: string, updates: Partial<InjectorDebugInfo>): void {
    if (!this.config.enabled) {
      return;
    }

    const info = this.injectorInfos.get(injectorId);
    if (info) {
      Object.assign(info, updates);
    }
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): {
    config: DebugConfig;
    metrics: DebugMetrics;
    injectors: InjectorDebugInfo[];
    recentEvents: DebugEvent[];
  } {
    return {
      config: { ...this.config },
      metrics: { ...this.metrics },
      injectors: Array.from(this.injectorInfos.values()),
      recentEvents: this.eventHistory.slice(-50)
    };
  }

  /**
   * 获取特定注入器的调试信息
   */
  getInjectorInfo(injectorId: string): InjectorDebugInfo | undefined {
    return this.injectorInfos.get(injectorId);
  }

  /**
   * 获取事件历史
   */
  getEventHistory(): DebugEvent[] {
    return [...this.eventHistory];
  }

  /**
   * 获取调试度量数据
   */
  getMetrics(): DebugMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取所有注入器信息
   */
  getAllInjectorsInfo(): InjectorDebugInfo[] {
    return Array.from(this.injectorInfos.values());
  }

  /**
   * 打印注入器层次结构
   */
  printHierarchy(injector?: any): void {
    console.log('=== 注入器层次结构 ===');
    const injectors = this.getAllInjectorsInfo();
    for (const inj of injectors) {
      const indent = '  '.repeat(inj.parentId ? 1 : 0);
      console.log(`${indent}📦 ${inj.type} (${inj.id})`);
      console.log(`${indent}   提供者: ${inj.providersCount}, 实例: ${inj.instancesCount}`);
    }
  }

  /**
   * 打印提供者信息
   */
  logProviders(injector?: any): void {
    console.log('=== 提供者信息 ===');
    const injectors = this.getAllInjectorsInfo();
    for (const inj of injectors) {
      console.log(`\n注入器 ${inj.id}:`);
      for (const provider of inj.providers) {
        console.log(`  - ${provider.token} (${provider.providerType})`);
      }
    }
  }

  /**
   * 获取依赖关系图
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const event of this.eventHistory) {
      if (event.type === DebugEventType.DependencyResolved && event.dependencyPath) {
        const path = event.dependencyPath;
        if (path.length > 1) {
          for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            if (!graph[from]) {
              graph[from] = [];
            }
            if (!graph[from].includes(to)) {
              graph[from].push(to);
            }
          }
        }
      }
    }

    return graph;
  }

  /**
   * 检查是否存在潜在的性能问题
   */
  getPerformanceWarnings(): string[] {
    const warnings: string[] = [];

    // 检查解析时间
    if (this.metrics.averageResolutionTime > 10) {
      warnings.push(`平均依赖解析时间较长: ${this.metrics.averageResolutionTime.toFixed(2)}ms`);
    }

    // 检查循环依赖
    if (this.metrics.circularDependencies > 0) {
      warnings.push(`检测到 ${this.metrics.circularDependencies} 个循环依赖`);
    }

    // 检查缓存命中率
    if (this.metrics.cacheHitRate < 0.8 && this.metrics.totalInjections > 100) {
      warnings.push(`缓存命中率较低: ${(this.metrics.cacheHitRate * 100).toFixed(1)}%`);
    }

    // 检查注入器数量
    if (this.metrics.totalInjectors > 50) {
      warnings.push(`注入器数量过多: ${this.metrics.totalInjectors}，可能影响性能`);
    }

    return warnings;
  }

  /**
   * 清空调试历史
   */
  clearHistory(): void {
    this.eventHistory.length = 0;
    this.resolutionStartTimes.clear();
  }

  /**
   * 导出调试数据
   */
  exportDebugData(): string {
    const data = {
      timestamp: new Date().toISOString(),
      config: this.config,
      metrics: this.metrics,
      injectors: Array.from(this.injectorInfos.values()),
      events: this.eventHistory,
      dependencyGraph: this.getDependencyGraph(),
      performanceWarnings: this.getPerformanceWarnings()
    };

    // 处理循环引用的replacer
    const seen = new WeakSet();
    const replacer = (key: string, value: any) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    };

    return JSON.stringify(data, replacer, 2);
  }

  /**
   * 更新度量数据
   */
  private updateMetrics(event: DebugEvent): void {
    if (!this.config.collectMetrics) {
      return;
    }

    switch (event.type) {
      case DebugEventType.DependencyRequested:
        this.metrics.totalInjections++;
        break;
      case DebugEventType.InstanceCreated:
        this.metrics.totalInstancesCreated++;
        break;
      case DebugEventType.ProviderRegistered:
        this.metrics.totalProviders++;
        break;
      case DebugEventType.CircularDependencyDetected:
        this.metrics.circularDependencies++;
        break;
      case DebugEventType.AutoProviderResolved:
        this.metrics.autoResolvedProviders++;
        break;
      case DebugEventType.InstanceCached:
        // 更新缓存命中率
        const totalRequests = this.metrics.totalInjections;
        const cacheHits = this.eventHistory.filter(e => e.type === DebugEventType.InstanceCached).length;
        this.metrics.cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
        break;
    }
  }

  /**
   * 更新解析时间统计
   */
  private updateResolutionTime(duration: number): void {
    const totalTime = this.metrics.averageResolutionTime * this.metrics.totalInjections;
    this.metrics.averageResolutionTime = (totalTime + duration) / (this.metrics.totalInjections + 1);
  }

  /**
   * 控制台输出调试信息
   */
  private logToConsole(event: DebugEvent): void {
    const level = this.getEventLevel(event.type);
    if (level > this.config.level) {
      return;
    }

    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const prefix = `[DI Debug ${timestamp}]`;

    switch (level) {
      case DebugLevel.Error:
        console.error(prefix, this.formatEvent(event));
        break;
      case DebugLevel.Warn:
        console.warn(prefix, this.formatEvent(event));
        break;
      case DebugLevel.Info:
        console.info(prefix, this.formatEvent(event));
        break;
      case DebugLevel.Debug:
        console.debug(prefix, this.formatEvent(event));
        break;
      case DebugLevel.Trace:
        console.trace(prefix, this.formatEvent(event));
        break;
    }
  }

  /**
   * 获取事件级别
   */
  private getEventLevel(eventType: DebugEventType): DebugLevel {
    switch (eventType) {
      case DebugEventType.CircularDependencyDetected:
        return DebugLevel.Error;
      case DebugEventType.AutoProviderResolved:
        return DebugLevel.Warn;
      case DebugEventType.DependencyRequested:
      case DebugEventType.DependencyResolved:
      case DebugEventType.InstanceCreated:
        return DebugLevel.Info;
      case DebugEventType.InjectorCreated:
      case DebugEventType.ProviderRegistered:
      case DebugEventType.InstanceCached:
      case DebugEventType.InjectorDestroyed:
        return DebugLevel.Debug;
      default:
        return DebugLevel.Debug;
    }
  }

  /**
   * 格式化事件信息
   */
  private formatEvent(event: DebugEvent): string {
    switch (event.type) {
      case DebugEventType.DependencyRequested:
        return `请求依赖: ${event.tokenName} (注入器: ${event.injectorId})`;
      case DebugEventType.DependencyResolved:
        return `解析依赖: ${event.tokenName} -> ${event.instance?.constructor?.name || 'unknown'}`;
      case DebugEventType.InstanceCreated:
        return `创建实例: ${event.tokenName} (类型: ${event.instance?.constructor?.name})`;
      case DebugEventType.CircularDependencyDetected:
        return `循环依赖: ${event.dependencyPath?.join(' -> ')}`;
      case DebugEventType.AutoProviderResolved:
        return `自动解析提供者: ${event.tokenName}`;
      default:
        return `${event.type}: ${event.tokenName || 'N/A'}`;
    }
  }

  /**
   * 获取令牌名称
   */
  private getTokenName(token: any): string {
    if (typeof token === 'string') {
      return token;
    }
    if (typeof token === 'symbol') {
      return token.toString();
    }
    if (typeof token === 'function') {
      return token.name || 'anonymous';
    }
    if (token && typeof token === 'object' && token.toString) {
      return token.toString();
    }
    return String(token);
  }
}

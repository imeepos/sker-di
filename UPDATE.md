# DI 系统升级方案：PRD.md → PRD_v2.md

## 📊 当前状态分析

### ✅ PRD.md 实现完成度：98%
- **已完成**：8个核心功能模块全部实现
- **测试覆盖率**：约80% (147/151测试通过)
- **代码结构**：完整的TypeScript实现，包含详细测试用例

### 🔄 PRD_v2.md 新增要求分析

#### 核心差异对比

| 模块 | PRD.md 状态 | PRD_v2.md 新要求 | 差距分析 |
|------|-------------|------------------|----------|
| 令牌系统 | ✅ 完整实现 | 新增 `HostAttributeToken` | 需扩展 |
| 提供者系统 | ✅ 完整实现 | 明确了接口定义结构 | 需规范化 |
| 注入选项 | ✅ 完整实现 | 新增 `InternalInjectFlags` 位标志优化 | 需重构 |
| 装饰器系统 | ✅ 完整实现 | 新增更多参数装饰器 (`@Optional`, `@Self`, `@SkipSelf`, `@Host`) | 需扩展 |
| 实例管理 | ✅ 完整实现 | 新增循环依赖标记系统 (`CIRCULAR`, `NOT_YET`) | 需优化 |
| 上下文管理 | ✅ 完整实现 | 新增 `assertInInjectionContext` 验证 | 需补充 |
| 高级特性 | ✅ 部分实现 | 新增 `ENVIRONMENT_INITIALIZER`, JIT/AOT支持 | 需大幅扩展 |
| 性能优化 | ✅ 基本实现 | 树摇优化、编译时优化 | 需深度优化 |

## 🎯 升级策略

### Phase 1: 核心API标准化 (优先级：🔴 高)

#### 1.1 提供者系统规范化
```typescript
// 当前状态：已有基本Provider接口
// 目标：标准化为PRD_v2.md规格

interface Provider {
  provide: any;
  multi?: boolean;
}

interface ValueProvider extends Provider {
  useValue: any;
}
// ... 其他Provider类型
```

**实施计划**：
- 重构 `src/provider.ts` 接口定义
- 确保与现有实现兼容
- 更新相关测试用例

#### 1.2 注入选项位标志优化
```typescript
// 目标：实现内部位标志系统
enum InternalInjectFlags {
  Default = 0,
  Optional = 1 << 0,
  SkipSelf = 1 << 1,
  Self = 1 << 2,
  Host = 1 << 3,
}
```

**实施计划**：
- 在 `src/inject-options.ts` 中添加位标志系统
- 保持向后兼容的公共API
- 性能测试验证优化效果

### Phase 2: 装饰器系统扩展 (优先级：🟡 中)

#### 2.1 新增参数装饰器
- `@Optional()` - 标记可选参数
- `@Self()` - 仅在当前注入器查找
- `@SkipSelf()` - 跳过当前注入器
- `@Host()` - 在宿主注入器查找

**实施计划**：
- 扩展 `src/injectable.ts` 装饰器实现
- 新增测试用例验证功能
- 更新元数据系统

### Phase 3: 高级特性实现 (优先级：🟡 中)

#### 3.1 令牌系统扩展
```typescript
// 新增特殊令牌类型
class HostAttributeToken<T> extends InjectionToken<T> {
  constructor(public attributeName: string) {
    super(`HostAttribute[${attributeName}]`);
  }
}
```

#### 3.2 环境初始化器
```typescript
// 新增环境初始化支持
const ENVIRONMENT_INITIALIZER = new InjectionToken<() => void>('ENVIRONMENT_INITIALIZER');
```

**实施计划**：
- 扩展 `src/injection-token.ts`
- 在 `src/environment-injector.ts` 中集成初始化器
- 完善生命周期管理

### Phase 4: 性能与调试优化 (优先级：🟢 低)

#### 4.1 修复现有调试问题
- 解决 `debug.test.ts` 中的循环引用错误
- 完善 `debug-inspector.ts` 实例列表显示
- 提升测试覆盖率至95%+

#### 4.2 树摇优化支持
```typescript
// 实现编译时优化标记
declare global {
  const ngDevMode: boolean;
}
```

**实施计划**：
- 重构调试相关代码
- 添加生产模式优化
- 实现懒加载和代码分割

## 📅 实施时间线

### Sprint 1 (1-2周): 基础规范化
- [x] 分析现状和制定方案
- [ ] Provider接口标准化
- [ ] 注入选项位标志重构
- [ ] 修复现有测试问题

### Sprint 2 (2-3周): 装饰器扩展
- [ ] 实现新增参数装饰器
- [ ] 扩展令牌系统
- [ ] 完善元数据系统

### Sprint 3 (3-4周): 高级特性
- [ ] 环境初始化器实现
- [ ] JIT/AOT编译支持
- [ ] 上下文验证函数

### Sprint 4 (4-5周): 性能调试
- [ ] 调试系统重构
- [ ] 性能优化实施
- [ ] 测试覆盖率达标

## ⚠️ 风险评估与缓解

### 高风险项目
1. **循环依赖检测重构** - 可能影响现有功能
   - 缓解：分阶段重构，保持向后兼容
   
2. **位标志系统性能验证** - 优化效果不确定
   - 缓解：建立性能基准测试

### 中风险项目
1. **装饰器系统扩展** - 元数据兼容性问题
   - 缓解：渐进式添加，充分测试

2. **API规范化** - 可能破坏现有接口
   - 缓解：保持向后兼容，使用废弃警告

## 🎯 成功指标

### 技术指标
- [ ] 测试覆盖率 ≥ 95%
- [ ] 所有测试用例通过 (151/151)
- [ ] 性能基准不退化
- [ ] TypeScript严格模式无错误

### 功能指标
- [ ] 所有PRD_v2.md要求功能实现
- [ ] API文档完整更新
- [ ] 向后兼容性保证
- [ ] 调试功能正常工作

## 📝 后续维护

### 文档更新
- [ ] API文档同步更新
- [ ] 使用示例代码更新
- [ ] 迁移指南编写

### 持续集成
- [ ] 性能回归测试
- [ ] 兼容性测试套件
- [ ] 自动化发布流程

---

## 🚀 立即行动项

1. **立即修复** `debug.test.ts` 和 `debug-inspector.test.ts` 中的循环引用问题
2. **优先实施** Provider接口标准化（影响面最小，收益最大）
3. **并行开发** 注入选项位标志优化（独立模块，可并行）

**预计总工期**: 4-5周
**关键里程碑**: Sprint 1结束时应达到100%测试通过率
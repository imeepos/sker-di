# @sker/di

🚀 **一切皆服务，一切皆可注入！** - 现代化的 TypeScript 依赖注入（DI）系统，借鉴 Angular DI 的核心设计理念，为通用场景提供类型安全的依赖注入解决方案。

## 特性

### 🏆 质量保证

- **🧪 高测试覆盖率** - 语句覆盖率 98.03%，分支覆盖率 93.28%
- **✅ 全面测试** - 530+个测试用例，覆盖核心功能和边界情况
- **🔍 深度验证** - TDD开发模式，先写测试再写实现
- **⚡ 快速反馈** - 16秒内完成全部测试，支持监听模式
- **🛡️ 类型安全** - 100% TypeScript，编译期错误检查
- **🔒 架构安全** - 强制的注入器层次结构和单例保护
- **📊 持续监控** - 自动化测试和覆盖率报告

### ✨ 核心特性
- 🚀 **一切皆服务** - 所有核心组件都实现为可注入服务，消除静态单例模式
- 🔗 **一切皆可注入** - 完整的依赖注入体系，支持任意层级的服务注入
- 🔒 **类型安全** - 完整的 TypeScript 类型支持，编译期错误检查
- 🏗️ **严格层次架构** - Root → Platform → Application → Feature 四层结构
- 🔒 **单例保护** - Root 和 Platform 注入器全局单例，防止架构混乱
- 🎯 **灵活的令牌系统** - 支持类构造函数、InjectionToken、字符串和符号令牌
- ⚙️ **多种提供者** - ValueProvider、ClassProvider、FactoryProvider 等
- 🔧 **注入选项控制** - optional、skipSelf、self、host 等选项
- 🎨 **装饰器支持** - @Injectable、@Inject 装饰器

### 🚀 高级特性
- 🔄 **循环依赖检测** - 自动检测和报告循环依赖
- 💾 **实例缓存** - 单例模式的实例缓存机制
- 🔍 **调试支持** - 开发模式下的完整调试信息
- 📊 **性能监控** - 注入器性能指标和健康检查
- 🔗 **forwardRef** - 解决循环引用问题

## 安装

```bash
npm install @sker/di
# 或
yarn add @sker/di
# 或
pnpm add @sker/di
```

## 快速开始

### 🚀 推荐方式：使用 createInjector

```typescript
import { Injectable, createInjector, Inject } from '@sker/di';

// 定义可注入的服务
@Injectable({ providedIn: 'root' })
class UserService {
  getUser() {
    return { name: 'John', age: 30 };
  }
}

@Injectable({ providedIn: 'root' })
class ApiService {
  constructor(private userService: UserService) {}

  async fetchUser() {
    return this.userService.getUser();
  }
}

// 🚀 使用便捷函数创建注入器，自动解析 providedIn 服务
const injector = createInjector([
  // 只需要配置一些令牌，服务会自动解析
]);

// 获取服务实例
const apiService = injector.get(ApiService);
console.log(apiService.fetchUser());
```

### 传统方式：使用 EnvironmentInjector

```typescript
import { Injectable, EnvironmentInjector, Inject } from '@sker/di';

// 定义可注入的服务
@Injectable()
class UserService {
  getUser() {
    return { name: 'John', age: 30 };
  }
}

@Injectable()
class ApiService {
  constructor(private userService: UserService) {}

  async fetchUser() {
    return this.userService.getUser();
  }
}

// 创建注入器
const injector = new EnvironmentInjector([
  UserService,
  ApiService
]);

// 获取服务实例
const apiService = injector.get(ApiService);
console.log(apiService.fetchUser());
```

### 🏗️ 服务化架构：完全基于DI的企业级多层注入器

```typescript
import {
  Injectable,
  INJECTOR_REGISTRY,
  PLATFORM_MANAGER,
  createInjector
} from '@sker/di';

// 定义不同作用域的服务
@Injectable({ providedIn: 'platform' })
class LoggerService {
  log(message: string) { console.log(`[LOG] ${message}`); }
}

@Injectable({ providedIn: 'application' })
class AuthService {
  isAuthenticated() { return true; }
}

@Injectable({ providedIn: 'feature' })
class UserManagementService {
  getUsers() { return ['user1', 'user2']; }
}

// 🚀 服务化架构：通过DI管理所有层级
const rootInjector = createInjector([]);  // 1. 根注入器（提供基础DI服务）

// 获取注入器注册表服务 - 一切皆服务！
const injectorRegistry = rootInjector.get(INJECTOR_REGISTRY);

// 通过服务管理注入器生命周期 - 消除静态管理！
const platformInjector = injectorRegistry.createPlatformInjector();  // 2. 平台注入器
const webApp = injectorRegistry.createApplicationInjector();          // 3. 应用注入器
const userFeature = injectorRegistry.createFeatureInjector([], webApp); // 4. 功能注入器

// 获取平台管理器服务 - 一切皆可注入！
const platformManager = rootInjector.get(PLATFORM_MANAGER);

// 从任何层级获取服务
const logger = userFeature.get(LoggerService);        // 从平台层继承
const auth = userFeature.get(AuthService);            // 从应用层继承
const userMgmt = userFeature.get(UserManagementService); // 功能层服务

logger.log('Application started with service-based architecture!');
```

### 使用 InjectionToken

```typescript
import { InjectionToken, Injectable } from '@sker/di';

// 定义令牌
const API_URL = new InjectionToken<string>('API_URL');
const CONFIG = new InjectionToken<{ timeout: number }>('CONFIG');

@Injectable()
class HttpService {
  constructor(
    @Inject(API_URL) private apiUrl: string,
    @Inject(CONFIG) private config: { timeout: number }
  ) {}
}

const injector = new EnvironmentInjector([
  { provide: API_URL, useValue: 'https://api.example.com' },
  { provide: CONFIG, useValue: { timeout: 5000 } },
  HttpService
]);
```

### 工厂提供者

```typescript
import { Injectable, InjectionToken } from '@sker/di';

const DATABASE_CONFIG = new InjectionToken<any>('DATABASE_CONFIG');

@Injectable()
class DatabaseService {
  constructor(private config: any) {}
}

const injector = new EnvironmentInjector([
  { 
    provide: DATABASE_CONFIG, 
    useValue: { host: 'localhost', port: 5432 } 
  },
  {
    provide: DatabaseService,
    useFactory: (config) => new DatabaseService(config),
    deps: [DATABASE_CONFIG]
  }
]);
```

## API 文档

### 核心函数

#### createInjector() 🚀 推荐
便捷的注入器创建函数，是 `EnvironmentInjector.createWithAutoProviders()` 的简化版本。

```typescript
function createInjector(providers: Provider[], parent?: Injector): EnvironmentInjector
```

**特性**:
- ✅ **自动解析** - 支持 `@Injectable({ providedIn: 'root' })` 的自动注册
- ✅ **简洁API** - 直接函数调用，无需使用静态方法
- ✅ **层次化支持** - 支持父子注入器关系
- ✅ **完全兼容** - 与 `EnvironmentInjector` 功能完全一致
- ✅ **类型安全** - 完整的 TypeScript 类型支持

**使用示例**:
```typescript
import { createInjector, Injectable, InjectionToken } from '@sker/di';

const API_URL = new InjectionToken<string>('API_URL');

@Injectable({ providedIn: 'root' })
class UserService {
  getUsers() { return ['user1', 'user2']; }
}

// 创建注入器，UserService 会自动解析
const injector = createInjector([
  { provide: API_URL, useValue: 'https://api.example.com' }
]);

const userService = injector.get(UserService); // 自动解析，无需手动注册
```

### 核心类

#### EnvironmentInjector
主要的注入器实现，支持层次化结构和提供者注册。经过重构优化，代码更加简洁高效。

#### EnvironmentInjectorUtils 🆕
环境注入器的工具类，提供通用的辅助方法：
- `getTokenName()` - 获取令牌的可读名称
- `getTokenType()` - 获取令牌类型
- `getProviderType()` - 获取提供者类型
- `isMultiProvider()` - 检查是否为多值提供者
- `validateInjectOptions()` - 验证注入选项
- `generateCircularDependencyError()` - 生成循环依赖错误
- `generateInjectorId()` - 生成唯一注入器ID
- `generateProvidersDebugInfo()` - 生成提供者调试信息
- `generateInstancesDebugInfo()` - 生成实例调试信息

#### InjectionToken<T>
类型安全的注入令牌，用于非类类型的依赖注入。

#### Provider
提供者接口，支持多种提供方式：
- `ValueProvider` - 直接提供值
- `ClassProvider` - 提供类实例
- `FactoryProvider` - 通过工厂函数创建
- `ExistingProvider` - 别名提供者

### 装饰器

#### @Injectable(options?)
标记类为可注入服务。

```typescript
@Injectable({ providedIn: 'root' })
class GlobalService {}
```

#### @Inject(token)
指定参数的注入令牌。

```typescript
constructor(@Inject(TOKEN) value: string) {}
```

### 注入选项

```typescript
injector.get(Token, { optional: true });    // 可选注入
injector.get(Token, { skipSelf: true });    // 跳过当前注入器
injector.get(Token, { self: true });        // 仅当前注入器
```

## 开发和调试

### 启用调试模式

```typescript
import { enableDevMode, getDebugger } from '@sker/di';

// 启用开发模式
enableDevMode({
  level: 'verbose',
  trackMetrics: true,
  logInjections: true
});

// 获取调试器
const debugger = getDebugger();
debugger.printHierarchy(injector);
```

### 性能监控

```typescript
import { getInspector } from '@sker/di';

const inspector = getInspector();

// 健康检查
const health = inspector.healthCheck(injector);

// 生成报告
const report = inspector.generateReport(injector);
console.log(report);
```

## 测试

### 📊 测试覆盖率

当前测试覆盖率达到了优秀水平：

- **语句覆盖率**: **98.03%** ✅
- **分支覆盖率**: **93.28%** ✅
- **函数覆盖率**: **98.15%** ✅
- **行覆盖率**: **98.16%** ✅

**总测试统计**:
- 🧪 **测试套件**: 30个
- ✅ **测试用例**: 530个
- ⚡ **执行时间**: ~16秒

### 🧪 测试命令

```bash
# 运行测试
npm test

# 监控模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

### 📋 测试文件结构

#### 核心功能测试
- `injector.test.ts` - 注入器核心功能
- `environment-injector.test.ts` - 环境注入器
- `injection-token.test.ts` - 注入令牌
- `provider.test.ts` - 提供者系统
- `injectable.test.ts` - @Injectable 装饰器
- `inject.test.ts` - @Inject 装饰器

#### 高级功能测试
- `circular-dependency.test.ts` - 循环依赖检测
- `lazy-initialization.test.ts` - 延迟初始化
- `lifecycle.test.ts` - 生命周期管理
- `forward-ref.test.ts` - 前向引用
- `inject-options.test.ts` - 注入选项

#### 调试和工具测试
- `debug.test.ts` - 调试系统
- `debug-inspector.test.ts` - 调试检查器
- `environment-injector-utils.test.ts` - 工具类

#### 覆盖率专项测试 🆕
- `inject-coverage.test.ts` - inject.ts 向后兼容性测试
- `parameter-decorators-coverage.test.ts` - 参数装饰器边界测试
- `debug-coverage.test.ts` - DIDebugger 分支覆盖测试
- `debug-inspector-coverage.test.ts` - DIInspector 格式化测试
- `lazy-manager-coverage.test.ts` - LazyManager 延迟初始化测试
- `internal-inject-flags-coverage.test.ts` - 标志转换验证测试

## 构建

```bash
npm run build
```

## 开发文档

### 📁 项目结构

```
sker-di/
├── src/                              # 源代码目录
│   ├── index.ts                      # 主入口文件
│   ├── injector.ts                   # 核心注入器实现
│   ├── environment-injector.ts       # 环境注入器 (主要实现)
│   ├── environment-injector-utils.ts # 🆕 环境注入器工具类
│   ├── injection-token.ts            # 注入令牌
│   ├── provider.ts                   # 提供者类型定义
│   ├── injectable.ts                 # @Injectable 装饰器
│   ├── inject.ts                     # @Inject 装饰器
│   ├── inject-options.ts             # 注入选项
│   ├── lifecycle.ts                  # 生命周期管理
│   ├── forward-ref.ts                # 前向引用
│   ├── debug.ts                      # 调试工具
│   ├── debug-inspector.ts            # 调试检查器
│   ├── lazy-manager.ts               # 延迟加载管理
│   ├── null-injector.ts              # 空注入器
│   ├── injection-context.ts          # 注入上下文
│   ├── *.test.ts                     # 核心功能测试文件
│   └── *-coverage.test.ts            # 🆕 覆盖率专项测试文件
├── dist/                             # 构建输出目录
├── jest.config.js                    # Jest 测试配置
├── tsconfig.json                     # TypeScript 配置
├── tsup.config.ts                    # 构建配置
├── package.json                      # 项目配置
└── README.md                         # 项目文档
```

### 🛠️ 开发环境设置

#### 环境要求
- Node.js >= 14.0.0
- pnpm >= 7.0.0 (推荐) 或 npm >= 7.0.0
- TypeScript >= 4.5.0

#### 安装依赖
```bash
# 克隆项目
git clone https://github.com/imeepos/sker-di.git
cd sker-di

# 安装依赖
pnpm install
# 或
npm install
```

#### 开发脚本
```bash
# 开发模式 (监听文件变化)
npm run dev

# 构建项目
npm run build

# 构建监听模式
npm run build:watch

# TypeScript 类型检查
npm run build:tsc

# 运行测试
npm test

# 测试监听模式
npm run test:watch

# 测试覆盖率
npm run test:coverage
```

### 🧪 测试指南

#### 测试框架
- **Jest**: 单元测试框架
- **ts-jest**: TypeScript 支持
- **reflect-metadata**: 装饰器元数据支持

#### 测试结构
```typescript
// 测试文件命名: *.test.ts
describe('功能模块', () => {
  beforeEach(() => {
    // 测试前置设置
  });

  it('应该正确处理某个场景', () => {
    // 测试用例实现
    expect(result).toBe(expected);
  });

  describe('边界情况', () => {
    it('应该处理空值输入', () => {
      // 边界测试
    });
  });
});
```

#### 测试覆盖率要求
- **语句覆盖率**: >= 95% (当前: **98.03%** ✅)
- **分支覆盖率**: >= 90% (当前: **93.28%** ✅)
- **函数覆盖率**: >= 95% (当前: **98.15%** ✅)
- **行覆盖率**: >= 95% (当前: **98.16%** ✅)

**质量保证**:
- 🎯 所有覆盖率指标均超过目标要求
- 🧪 530个测试用例全部通过
- ⚡ 快速执行，平均16秒完成全部测试
- 🔍 深度覆盖边界情况和错误处理路径

#### 运行特定测试
```bash
# 运行特定文件的测试
npm test -- injector.test.ts

# 运行匹配模式的测试
npm test -- --testNamePattern="注入器"

# 调试模式运行测试
npm test -- --verbose
```

### 🏗️ 构建系统

#### 构建工具
- **tsup**: 现代 TypeScript 构建工具
- **TypeScript**: 类型检查和编译
- **支持格式**: CommonJS (CJS) + ES Modules (ESM)

#### 构建配置 (tsup.config.ts)
```typescript
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,              // 生成类型声明文件
  sourcemap: true,        // 生成源码映射
  clean: true,            // 清理输出目录
  target: 'node14',       // 目标环境
  external: ['reflect-metadata']
});
```

#### 输出文件
```
dist/
├── index.cjs           # CommonJS 格式
├── index.cjs.map       # CJS 源码映射
├── index.mjs           # ES Module 格式
├── index.mjs.map       # ESM 源码映射
├── index.d.ts          # CJS 类型声明
└── index.d.mts         # ESM 类型声明
```

### 📋 代码规范

#### TypeScript 配置
- **严格模式**: 启用所有严格类型检查
- **装饰器**: 启用实验性装饰器支持
- **目标版本**: ES2020
- **模块系统**: ESNext

#### 代码风格
- 使用 **简体中文** 编写注释和测试用例
- 函数和变量使用 **camelCase**
- 类名使用 **PascalCase**
- 常量使用 **UPPER_SNAKE_CASE**
- 接口名以 **I** 开头 (可选)

#### 提交规范
```bash
# 功能开发
git commit -m "feat: 添加新的注入器功能"

# 问题修复
git commit -m "fix: 修复循环依赖检测问题"

# 代码重构
git commit -m "refactor: 优化注入器性能"

# 测试相关
git commit -m "test: 添加注入选项测试用例"

# 文档更新
git commit -m "docs: 更新 API 文档"
```

### 🔧 开发工作流

#### TDD 开发流程 (严格遵循)
1. **🔴 红阶段**: 编写失败的测试用例
   - 先写测试，确保测试失败
   - 明确定义期望的行为
   - 测试用例要具体且可验证

2. **🟢 绿阶段**: 编写最小实现使测试通过
   - 只写刚好让测试通过的代码
   - 不过度设计，保持简单
   - 确保所有测试都通过

3. **🔄 重构阶段**: 优化代码质量和结构
   - 在绿灯状态下安全重构
   - 消除重复代码
   - 提高可读性和可维护性
   - 保持测试通过

**TDD 成果展示**:
- 📊 **98.03%** 语句覆盖率 - 证明代码质量
- 🎯 **530个** 测试用例 - 全面的功能验证
- 🔍 **边界测试** - 深入测试异常和边界情况
- ⚡ **快速反馈** - 16秒内完成全部测试

#### 功能开发步骤
```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 编写测试用例
# 创建 *.test.ts 文件

# 3. 运行测试确保失败
npm test

# 4. 实现功能代码
# 编写最小实现

# 5. 运行测试确保通过
npm test

# 6. 重构和优化
# 改进代码质量

# 7. 最终测试
npm test
npm run build

# 8. 提交代码
git add .
git commit -m "feat: 实现新功能"
```

### 🐛 调试指南

#### 启用调试模式
```typescript
import { enableDevMode, getDebugger } from '@sker/di';

// 启用详细调试
enableDevMode({
  level: 'verbose',
  trackMetrics: true,
  logInjections: true,
  enableStackTrace: true
});

// 使用调试器
const debugger = getDebugger();
debugger.printHierarchy(injector);
debugger.logProviders(injector);
```

#### 常见问题排查
1. **循环依赖**: 检查 `circular-dependency.test.ts` 中的示例
2. **类型错误**: 确保正确导入 `reflect-metadata`
3. **注入失败**: 检查提供者配置和令牌匹配
4. **性能问题**: 使用 `getInspector()` 进行性能分析

### 📊 性能监控

#### 使用检查器
```typescript
import { getInspector } from '@sker/di';

const inspector = getInspector();

// 健康检查
const health = inspector.healthCheck(injector);
console.log('注入器健康状态:', health);

// 性能报告
const report = inspector.generateReport(injector);
console.log('性能报告:', report);

// 内存使用情况
const memory = inspector.getMemoryUsage(injector);
console.log('内存使用:', memory);
```

### 🚀 发布流程

#### 版本发布步骤
```bash
# 1. 确保所有测试通过
npm test

# 2. 构建项目
npm run build

# 3. 更新版本号
npm version patch|minor|major

# 4. 推送到远程仓库
git push origin main --tags

# 5. 发布到 npm
npm publish
```

#### 版本管理
- **patch**: 修复 bug (1.0.0 -> 1.0.1)
- **minor**: 新增功能 (1.0.0 -> 1.1.0)
- **major**: 破坏性变更 (1.0.0 -> 2.0.0)

## 贡献指南

### 🤝 如何贡献

1. **Fork 项目**到你的 GitHub 账户
2. **创建功能分支**: `git checkout -b feature/amazing-feature`
3. **遵循 TDD**: 先写测试，再写实现
4. **确保测试通过**: `npm test`
5. **提交更改**: `git commit -m 'feat: 添加惊人的功能'`
6. **推送分支**: `git push origin feature/amazing-feature`
7. **创建 Pull Request**

### 📝 贡献要求

- ✅ 所有新功能必须包含测试用例
- ✅ 测试覆盖率不能降低
- ✅ 代码必须通过 TypeScript 类型检查
- ✅ 遵循现有的代码风格和命名规范
- ✅ 提交信息遵循约定式提交规范
- ✅ 更新相关文档

### 🐛 报告问题

在提交 Issue 时，请包含：
- 问题的详细描述
- 重现步骤
- 期望的行为
- 实际的行为
- 环境信息 (Node.js 版本、操作系统等)
- 相关的代码示例

## 许可证

ISC License

## 作者

imeepos
本文档展示如何在 Claude 环境中严格遵循 **测试驱动开发 (TDD)** 规范。

## 必须使用简体中文(严格遵守)
## 界面(pages/components等)不写测试
## 依赖网络请求、文件请求等外部环境不写测试(mock替代)

## 🎯 TDD 核心原则 (严格遵守)

### 🔴 红阶段：编写失败测试
```typescript
// ❌ 必须先写失败的测试
describe('Calculator', () => {
  it('should add two numbers', () => {
    const calc = new Calculator(); // 这里会失败 - 正确的！
    expect(calc.add(2, 3)).toBe(5);
  });
});
```

### 🟢 绿阶段：最小实现
```typescript
// ✅ 只写刚好让测试通过的代码
export class Calculator {
  add(a: number, b: number): number {
    return a + b; // 最简实现
  }
}
```

### 🔄 重构阶段：优化代码
```typescript
// ✅ 在绿灯状态下安全重构
export class Calculator {
  /**
   * 两数相加
   * @param a 第一个数
   * @param b 第二个数
   * @returns 和
   */
  add(a: number, b: number): number {
    return a + b;
  }
}
```

## 🚫 TDD 强制规则 (绝不违反)

### ❌ 禁止行为
- **绝对不允许**在没有测试的情况下编写生产代码
- **绝对不允许**跳过红阶段直接写实现
- **绝对不允许**在红灯状态下进行重构
- **绝对不允许**同时处理多个失败测试
- **绝对不允许**写example示例代码
- **绝对不允许**业务中写测试代码
- **绝对不允许**业务中写简化或mock代码

### ✅ 必须行为
- **必须切换新分支** 切换新的分支后开始新功能开发
- **必须确认**测试在功能实现前是失败的
- **必须编写**刚好让测试通过的最小代码
- **必须在**所有测试通过的绿灯状态下进行重构
- **必须保持**每个测试的独立性
- **必须遵守**单个文件代码行数不超过500行
- **必须遵守**环境依赖性测试（文件系统监控、网络连接、性能测试）,使用模拟对象(Mock)替代真实环境依赖，确保测试的稳定性

## 🛠️ Claude TDD 工作流程

### Step 1: 需求分析 → 测试设计
```bash
# 在 Claude 中的对话流程
用户: "我需要一个计算器功能"
Claude: "让我们从测试开始。首先写一个失败的测试..."
```

### Step 2: 🔴 红阶段执行
```typescript
// 1. 先创建测试文件
// src/calculator.test.ts
import { Calculator } from './calculator'; // ❌ 这会失败

describe('Calculator', () => {
  it('should add two positive numbers', () => {
    const calculator = new Calculator();
    expect(calculator.add(2, 3)).toBe(5);
  });
});
```

```bash
# 2. 运行测试确认失败
pnpm run test
# ❌ Cannot find module './calculator' - 正确的失败！
```

### Step 3: 🟢 绿阶段执行
```typescript
// 3. 创建最小实现
// src/calculator.ts
export class Calculator {
  add(a: number, b: number): number {
    return a + b; // 最简实现
  }
}
```

```bash
# 4. 运行测试确认通过
pnpm run test
# ✅ Tests: 1 passed, 1 total
```

### Step 4: 🔄 重构阶段执行
```typescript
// 5. 在绿灯状态下改进代码质量
export class Calculator {
  /**
   * 添加两个数字
   * @param a 第一个数字
   * @param b 第二个数字
   * @returns 两数之和
   */
  add(a: number, b: number): number {
    // 可以添加输入验证等
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Both arguments must be numbers');
    }
    return a + b;
  }
}
```

```bash
# 6. 确保重构后测试仍然通过
pnpm run test
# ✅ Tests: 1 passed, 1 total
```

## 📊 Claude TDD 质量检查清单

### 🔴 红阶段检查清单
- [ ] 测试用例清晰表达了期望的行为
- [ ] 测试失败的原因是功能未实现，而非测试错误
- [ ] 测试范围适中，只验证一个具体功能点
- [ ] 测试用例名称具有良好的可读性

### 🟢 绿阶段检查清单
- [ ] 所有测试都通过
- [ ] 实现代码尽可能简单
- [ ] 没有实现当前测试不需要的功能
- [ ] 代码能够正确处理测试用例的所有场景

### 🔄 重构阶段检查清单
- [ ] 消除了代码重复
- [ ] 提高了代码可读性
- [ ] 改善了代码结构
- [ ] 所有测试仍然通过
- [ ] 没有改变外部行为

## 🎓 Claude TDD 最佳实践

### 1. 对话驱动的 TDD
```
用户: "添加减法功能"
Claude: "让我们遵循 TDD 流程：
1. 🔴 先写减法的失败测试
2. 🟢 实现最小的减法功能
3. 🔄 重构优化代码"
```

### 2. 增量式开发
```typescript
// 第一个测试：基本功能
it('should subtract two positive numbers', () => {
  expect(calc.subtract(5, 3)).toBe(2);
});

// 第二个测试：边界情况
it('should handle negative results', () => {
  expect(calc.subtract(3, 5)).toBe(-2);
});

// 第三个测试：零值处理
it('should handle zero values', () => {
  expect(calc.subtract(5, 0)).toBe(5);
});
```

### 3. 测试即文档
```typescript
describe('Calculator', () => {
  describe('add method', () => {
    it('should add two positive integers correctly', () => {
      // 测试名称就是功能文档
    });

    it('should handle floating point numbers with precision', () => {
      // 清晰表达预期行为
    });
  });
});
```

## 🚀 Claude TDD 命令速查

### 快速启动 TDD 循环
```bash
# 1. 创建测试文件
touch src/feature.test.ts

# 2. 运行测试 (红阶段)
pnpm run test:watch

# 3. 创建实现文件
touch src/feature.ts

# 4. 运行构建 (绿阶段后)
pnpm run build

# 5. 查看覆盖率
pnpm run test:coverage
```

### TDD 开发节奏
```bash
# 保持快速的红-绿-重构循环
🔴 写测试 → ❌ 运行测试 → 🟢 写代码 → ✅ 运行测试 → 🔄 重构 → ✅ 运行测试
```

## 📈 成功的 TDD 指标

### 代码质量指标
- ✅ **测试覆盖率**: 95%+ (强制要求)
- ✅ **测试执行时间**: < 2 秒 (快速反馈)
- ✅ **测试独立性**: 100% (无依赖测试)
- ✅ **代码重复度**: 最小化

### TDD 流程指标
- ✅ **红-绿-重构循环**: 严格遵循
- ✅ **测试先行率**: 100% (无例外)
- ✅ **最小实现原则**: 始终遵守
- ✅ **重构安全性**: 测试保护下进行

## 🎯 下一步 TDD 开发

继续使用 Claude 进行 TDD 开发时：

1. **🔴 红阶段**: 告诉 Claude 你需要什么功能，让它先写失败测试
2. **🟢 绿阶段**: 让 Claude 实现最小代码使测试通过
3. **🔄 重构阶段**: 与 Claude 一起改进代码质量
4. **重复循环**: 为每个新功能重复此过程

**记住：在 Claude 环境中，TDD 不仅是开发方法，更是确保代码质量和设计优雅的严格纪律！** 🎉

## 💡 Claude TDD 实战示例

### 示例：添加乘法功能

#### 🔴 红阶段：用户请求
```
用户: "我需要添加乘法功能"
Claude: "好的，让我们严格遵循 TDD 流程。首先写一个失败的测试："
```

#### 测试代码 (先写)
```typescript
// src/calculator.test.ts
describe('Calculator', () => {
  // ... 现有测试 ...

  describe('multiply', () => {
    it('should multiply two positive numbers correctly', () => {
      const calculator = new Calculator();
      expect(calculator.multiply(3, 4)).toBe(12); // ❌ 这会失败
    });
  });
});
```

#### 🟢 绿阶段：最小实现
```typescript
// src/calculator.ts
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  multiply(a: number, b: number): number {
    return a * b; // 最简实现
  }
}
```

#### 🔄 重构阶段：优化代码
```typescript
export class Calculator {
  /**
   * 两数相加
   */
  add(a: number, b: number): number {
    return a + b;
  }

  /**
   * 两数相乘
   * @param a 被乘数
   * @param b 乘数
   * @returns 乘积
   */
  multiply(a: number, b: number): number {
    return a * b;
  }
}
```

## 🔧 Claude TDD 故障排除

### 常见问题与解决方案

#### 问题 1: 测试没有失败
```typescript
// ❌ 错误：测试一开始就通过了
it('should return true', () => {
  expect(true).toBe(true); // 这不是有效的 TDD 测试
});

// ✅ 正确：测试应该验证具体功能
it('should validate email format', () => {
  const validator = new EmailValidator();
  expect(validator.isValid('test@example.com')).toBe(true); // 会失败，因为类不存在
});
```

#### 问题 2: 实现过度复杂
```typescript
// ❌ 错误：过度实现
multiply(a: number, b: number): number {
  // 不需要的复杂逻辑
  if (a === 0 || b === 0) return 0;
  if (a === 1) return b;
  if (b === 1) return a;
  // ... 更多不必要的逻辑
  return a * b;
}

// ✅ 正确：最小实现
multiply(a: number, b: number): number {
  return a * b; // 简单直接
}
```

#### 问题 3: 在红灯状态下重构
```bash
# ❌ 错误流程
pnpm run test  # ❌ 测试失败
# 开始重构代码 <- 错误！应该先让测试通过

# ✅ 正确流程
pnpm run test  # ❌ 测试失败
# 写最小代码让测试通过
pnpm run test  # ✅ 测试通过
# 现在可以安全重构
```

### 关键文件说明
- `jest.config.js` - 测试框架配置
- `tsconfig.json` - TypeScript 严格模式配置
- `package.json` - TDD 相关脚本命令
- `src/*.test.ts` - 测试文件 (TDD 的核心)

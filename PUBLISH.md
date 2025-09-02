# 📦 发布指南

本文档说明如何使用 pnpm 发布 @sker/di 包到 npm 仓库。

## 🚀 发布前准备

### 1. 确保代码质量
```bash
# 运行所有测试
pnpm test

# 检查测试覆盖率
pnpm run test:coverage

# 构建项目
pnpm run build
```

### 2. 登录 npm
```bash
# 登录到 npm（如果还未登录）
npm login

# 验证登录状态
npm whoami
```

## 📋 发布命令

### 正式版本发布

#### Patch 版本（修复 bug）
```bash
# 自动升级 patch 版本并发布
pnpm run publish:patch

# 例如：1.0.0 → 1.0.1
```

#### Minor 版本（新功能）
```bash
# 自动升级 minor 版本并发布
pnpm run publish:minor

# 例如：1.0.0 → 1.1.0
```

#### Major 版本（破坏性更改）
```bash
# 自动升级 major 版本并发布
pnpm run publish:major

# 例如：1.0.0 → 2.0.0
```

### 预发布版本

#### Beta 版本
```bash
# 发布 beta 版本
pnpm run publish:beta

# 例如：1.0.0 → 1.0.1-beta.0
```

#### Alpha 版本
```bash
# 发布 alpha 版本
pnpm run publish:alpha

# 例如：1.0.0 → 1.0.1-alpha.0
```

## 🔧 手动发布流程

如果需要更精细的控制，可以手动执行：

```bash
# 1. 运行测试和构建（自动执行）
pnpm run prepublishOnly

# 2. 手动升级版本
pnpm version patch  # 或 minor, major

# 3. 发布到 npm
pnpm publish

# 4. 推送标签到 git
git push --follow-tags
```

## 📝 发布检查清单

发布前请确认：

- [ ] 所有测试通过 (`pnpm test`)
- [ ] 代码已构建成功 (`pnpm run build`)
- [ ] 版本号符合语义化版本规范
- [ ] CHANGELOG.md 已更新（如果有）
- [ ] README.md 文档是最新的
- [ ] 已登录正确的 npm 账户
- [ ] 包名 `@sker/di` 在 npm 上可用

## 🛠️ 配置说明

### package.json 配置
- `prepublishOnly`: 发布前自动运行测试和构建
- `publishConfig`: 发布配置，设置为公开包
- `files`: 指定发布时包含的文件（只包含 dist 目录）

### .npmrc 配置
- 设置 npm 仓库地址
- 配置访问级别为公开
- 设置标签前缀

## 🚨 注意事项

1. **首次发布**：确保包名 `@sker/di` 在 npm 上可用
2. **版本管理**：遵循语义化版本规范 (SemVer)
3. **测试覆盖**：发布前确保测试覆盖率达标
4. **文档更新**：重要更改需要更新相关文档
5. **Git 标签**：发布后记得推送版本标签到仓库

## 📊 发布后验证

```bash
# 检查包是否成功发布
npm view @sker/di

# 在新项目中测试安装
npm install @sker/di
```

---

**提示**：建议在发布重要版本前，先发布 beta 或 alpha 版本进行测试。
# 贡献指南

感谢对搭言的兴趣。欢迎提交 Issue 反馈问题，也欢迎提交 Pull Request 参与贡献。

## 开发环境

### 1. 克隆代码

```bash
git clone <仓库地址>
cd wechatrq
```

### 2. 安装依赖

```bash
cd desktop
pnpm install
```

如果在中国大陆遇到网络问题，推荐设置镜像：

```bash
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/
```

### 3. 启动开发

```bash
pnpm dev
```

### 4. 构建

```bash
pnpm build
```

## 开发规范

### 代码风格

- 前端使用 ESLint + Prettier，提交前确保无 lint 错误
- TypeScript 严格模式
- 组件采用 Composition API + `<script setup>`

### 分支策略

- `main` — 稳定发布分支
- `feature/` — 新功能开发
- `fix/` — Bug 修复

### Commit 信息

采用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: 新增xxx功能
fix: 修复xxx问题
docs: 更新文档
chore: 构建/工具变更
```

### Pull Request 流程

1. Fork 本仓库，创建功能分支
2. 在本地完成开发和测试
3. 确保 `pnpm build` 通过
4. 提交 PR，描述改动内容和动机
5. 等待 Code Review

## 本地测试

### 启动开发服务器

```bash
pnpm dev
```

### 打包验证

```bash
# macOS
pnpm build --mac

# Windows
pnpm build --win
```

打包产物在 `desktop/release/`。

## 遇到问题

- **依赖安装失败**：检查 Node.js 版本（需 18+），尝试删 `node_modules` 和 `pnpm-lock.yaml` 后重装
- **原生模块编译错误**：`pnpm exec electron-rebuild`
- **打包失败**：确认 `desktop/build/` 目录下有对应平台的图标文件

## 文档贡献

文档在 `docs/` 目录下，Markdown 格式。如有产品功能变更，请同步更新对应文档。

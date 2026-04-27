# 搭言 - 开发日志

> 项目启动：2026-04

---

## [v1.0.0-beta] - 2026-04-28

### ✨ 新增功能
- 完成 **军师分析** 模块UI全面升级
  - 卡片式布局设计，渐变+毛玻璃视觉效果
  - 胜率可视化进度条（支持动态颜色变化）
  - 意图分析列表（好/中/差 三级评级系统）
  - 策略建议分栏展示（应该做 / 不应该做）
  - 推荐回复卡片，支持一键复制/发送操作
  - 综合分析模态框：关系评估、性格标签、风险分析、下一步建议
  - 流畅的动画过渡和悬停交互效果

- 完善 **话术库导入** 功能
  - 隐藏式文件选择输入框设计
  - 支持多种JSON数据结构解析：
    - 直接数组格式：`[{category, keyword, content}, ...]`
    - items嵌套格式：`{items: [...]}`
    - data嵌套格式：`{data: [...]}`
  - 数据完整性校验：keyword + content 必填字段检查
  - 导入预览：显示前5条数据预览，帮助用户确认
  - 跳过重复项开关：自动检测并过滤重复条目
  - 批量导入执行：Dexie.js bulkAdd 高性能写入

- 数据存储方案重构
  - **废弃** better-sqlite3 原生模块（解决编译问题）
  - 迁移至 Dexie.js + IndexedDB 纯JS方案
  - 实现完整的数据库封装类：
    - `ChatHistoryDB` - 聊天历史管理
    - `KnowledgeDB` - 话术库管理
    - `ContactStorage` - 联系人及分析数据管理
  - 支持默认数据初始化（首次运行自动添加示例话术）

### 🔧 技术改进
- 移除所有原生模块依赖，消除跨平台编译风险
- 清理 package.json：删除 `better-sqlite3`、`electron-rebuild` 及相关脚本
- 更新 vite.config.ts：移除 rollup external 配置
- 添加 Vue 组件 TypeScript 类型声明文件 (env.d.ts)
- 修复品牌名称全局一致性：所有「嗒言」→「搭言」

### 🗑️ 代码清理
- 删除 `src/main/database.ts` - SQLite 初始化代码
- 删除 `src/main/database-ipc.ts` - SQLite IPC 处理
- 删除 `src/main/dao/` 目录 - SQLite DAO 层
- 删除 `src/main/ocr.ts` - 有问题的OCR实现（待重构）
- 删除 `src/renderer/utils/database-sqlite.ts` - SQLite 冗余封装

### 🐛 问题修复
- 解决了 Python 3.14 与 node-gyp 兼容性问题（通过移除原生依赖）
- 解决了 Electron ABI 版本不匹配问题
- 修复了主进程与渲染进程重复数据库初始化问题
- 修复了 OCR 模块 IPC 处理器注册失败问题

### 📝 文档
- 新增 TASK_PROGRESS.md - 任务进度跟踪表
- 新增 FEATURE_MATRIX.md - 功能开发矩阵清单
- 新增 CHANGELOG.md - 开发变更日志（本文件）

---

## [v0.2.0-alpha] - 2026-04-27

### ✨ 新增功能
- 全局快捷键系统：Ctrl+Shift+D 触发屏幕识别
- 剪贴板监听功能：自动检测剪贴板内容变化
- macOS 窗口吸附：自动吸附到微信侧边
- 日志系统：主进程日志记录与错误监控
- 授权验证：License 密钥验证框架

### 🔧 技术改进
- 主进程/渲染进程架构分离
- IPC 通信层完整封装
- Vite + Electron 构建流程调优
- Preload 脚本上下文隔离配置

---

## [v0.1.0-alpha] - 2026-04-26

### ✨ 项目初始化
- 搭建 Electron + Vue 3 + Vite 基础框架
- 配置 TypeScript 开发环境
- 实现基础路由系统（6个核心页面）
- 接入 Tesseract.js OCR 引擎
- 集成 better-sqlite3（后续废弃）
- 实现基础组件库（Modal、Toast等）

---

## 技术决策记录

### 2026-04-28 | 存储方案选型
**决策**：放弃 SQLite，采用 Dexie.js + IndexedDB
- **原因**：better-sqlite3 需要原生编译，Python 3.14 与 node-gyp 存在兼容性问题，跨平台维护成本高
- **影响**：彻底解决了依赖问题，开发体验大幅提升，性能满足需求
- **备选**：sql.js（纯JS SQLite），但 IndexedDB 更符合浏览器/Electron 生态

### 2026-04-28 | OCR 功能降级
**决策**：暂时禁用 OCR 功能，延后实现
- **原因**：主进程集成 Tesseract.js 存在模块加载不稳定、IPC 通信复杂等问题
- **后续方案**：考虑纯前端实现（渲染进程直接运行 Tesseract.js）或使用系统级截图 API

### 2026-04-27 | 品牌名称统一
**决策**：所有「嗒言」改为「搭言」
- **原因**：产品名称最终确定为「搭言」（有沟通、搭建对话的含义）
- **影响**：全局搜索替换所有出现的地方

---

## 已知问题

| 问题 | 优先级 | 状态 |
|------|--------|------|
| Linux 环境 Rollup 可选依赖缺失 | 低 | 仅影响 VM 环境，Windows/macOS 正常 |
| 部分 Vue 文件缺少类型声明 | 低 | tsc --noEmit 报错，但不影响 Vite 构建 |
| 部分未使用参数 TypeScript 告警 | 低 | 可通过配置关闭或添加类型修复 |
| 废弃文件无法删除（VM权限） | 低 | 不影响运行，可在本机手动删除 |

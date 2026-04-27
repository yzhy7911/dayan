# 搭言 - 懂你的智能聊天助手

> 基于 Electron + Vue 3 + AI 的智能聊天辅助工具

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.4+-green.svg)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-28.2+-blue.svg)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ 核心功能

### 🧠 军师分析
智能分析聊天上下文，提供深度洞察：
- **意图识别**：AI 分析对方深层想法和动机
- **策略建议**：告诉你「应该做」和「不应该做」的事
- **胜率评估**：可视化展示当前关系推进状态
- **推荐回复**：生成多条高质量回复候选
- **综合诊断**：性格标签、风险分析、下一步行动建议

### 📚 话术库
专业聊天话术知识库：
- **分类管理**：工作、情感、商务、日常等多分类
- **快速搜索**：关键词全文检索
- **批量导入**：支持 JSON 格式批量导入话术
- **默认模板**：内置常用优质话术模板

### ✍️ 文案润色
一键优化你的表达：
- 多种润色风格可选
- 原文/润色后对比展示
- 支持大段文本处理

### 💬 智能回复
快速生成高质量回复：
- 实时监听剪贴板内容
- 多种回复风格选择
- 一键复制使用
- 历史记录追溯

### 👥 联系人管理
（开发中）
- 联系人信息管理
- 聊天记录持久化
- 个性化智能分析

---

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm 或 pnpm

### 安装依赖
```bash
pnpm install
# 或
npm install
```

### 开发模式
```bash
pnpm dev
# 或
npm run dev
```

### 构建打包
```bash
pnpm build
# 或
npm run build
```

构建输出目录：`release/`

---

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **桌面容器** | Electron 28 | 跨平台桌面应用支持 |
| **前端框架** | Vue 3 Composition API | 现代化响应式开发 |
| **构建工具** | Vite 5 | 极速开发体验 |
| **路由管理** | Vue Router 4 | SPA 单页应用路由 |
| **本地存储** | Dexie.js | IndexedDB 封装，纯 JS 无原生依赖 |
| **AI 引擎** | OpenAI API | 兼容所有 OpenAI 格式接口 |
| **语言** | TypeScript | 类型安全 |
| **工具库** | Lodash ES / Day.js | 工具函数与日期处理 |
| **OCR** | Tesseract.js | 纯 JS 文字识别（待启用） |

---

## 📁 项目结构

```
desktop/
├── src/
│   ├── main/                 # 主进程代码
│   │   ├── index.ts          # 主进程入口
│   │   ├── window.ts         # 窗口管理
│   │   ├── clipboard.ts      # 剪贴板管理
│   │   ├── ai.ts             # AI 引擎封装
│   │   ├── license.ts        # 授权验证
│   │   ├── logger.ts         # 日志系统
│   │   ├── error-monitor.ts  # 错误监控
│   │   └── window-dock.ts    # 窗口吸附（macOS）
│   │
│   ├── preload/              # 预加载脚本
│   │   └── index.ts          # IPC 桥接
│   │
│   ├── renderer/             # 渲染进程（前端）
│   │   ├── pages/            # 页面组件
│   │   │   ├── ReplyPage.vue      # 智能回复
│   │   │   ├── CoachPage.vue      # 军师分析
│   │   │   ├── PolishPage.vue     # 文案润色
│   │   │   ├── KnowledgePage.vue  # 话术库
│   │   │   ├── ContactPage.vue    # 联系人
│   │   │   └── SettingsPage.vue   # 设置
│   │   ├── components/       # 公共组件
│   │   ├── composables/      # 组合式函数
│   │   ├── utils/            # 工具函数
│   │   │   ├── storage.ts    # 存储工具
│   │   │   ├── database.ts   # Dexie 数据库封装
│   │   │   └── contact-storage.ts  # 联系人数据
│   │   ├── router/           # 路由配置
│   │   ├── App.vue           # 根组件
│   │   └── main.ts           # 渲染进程入口
│   │
│   └── shared/               # 共享类型
│
├── build/                    # 构建资源（图标等）
├── release/                  # 构建输出
├── package.json
├── vite.config.ts
├── tsconfig.json
└── electron-builder 配置
```

---

## ⚙️ 配置说明

### AI 配置
在应用设置页面配置：
- **API Key**：你的 OpenAI 兼容接口密钥
- **Base URL**：API 端点地址（支持第三方兼容接口）
- **Model**：使用的模型名称（如 gpt-3.5-turbo）

### 全局快捷键
- `Ctrl + Shift + D`：触发屏幕识别（OCR 功能待启用）

---

## 📦 打包支持

| 平台 | 格式 | 状态 |
|------|------|------|
| Windows | NSIS 安装包 | ✅ 支持 |
| macOS | DMG 镜像 | ✅ 支持 |
| Linux | AppImage | ⏳ 可选 |

---

## 🎯 功能路线图

### ✅ v1.0 Beta（当前）
- [x] 核心 AI 功能（回复、润色、分析）
- [x] 军师分析完整 UI
- [x] 话术库及批量导入
- [x] Dexie.js 数据持久化
- [x] 跨平台构建配置

### 🚧 v1.0 正式版
- [ ] OCR 屏幕识别功能
- [ ] 联系人管理完善
- [ ] AI 流式响应输出
- [ ] 系统托盘支持
- [ ] 数据导出备份

### 🔮 v1.1
- [ ] 话术多级分类标签系统
- [ ] 快捷键自定义
- [ ] 暗黑模式
- [ ] 自动更新

---

## 🐛 已知问题

- Linux 构建环境 Rollup 可选依赖问题（不影响 Windows/macOS 构建）
- OCR 功能暂未启用，后续版本重构后开放

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 💡 技术亮点

1. **纯 JS 存储方案**：抛弃原生 SQLite，使用 Dexie.js，彻底解决跨平台编译问题
2. **现代化 UI**：渐变卡片、毛玻璃效果、流畅动画
3. **架构清晰**：主进程/渲染进程严格分离，IPC 通信封装完善
4. **扩展性强**：AI 引擎接口设计支持多种提供商扩展
5. **开发者友好**：Vite 热更新、TypeScript 类型安全

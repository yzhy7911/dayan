# 嗒言 - 懂你的智能聊天助手

一款基于 Electron + Vue3 的智能聊天助手，支持 AI 生成回复、聊天军师策略分析、多模态识别等功能。

## ✨ 核心特性

- 🤖 **AI 智能回复** - 多种风格可选，一键生成高质量回复
- 🧠 **聊天军师** - 深度分析对方意图，提供最佳回复策略（SVIP）
- ✍️ **文本润色** - AI 优化你的回复，更得体更专业
- 📚 **话术库** - 自定义常用话术，分类管理快速检索
- 🪟 **窗口吸附** - 自动吸附到微信窗口旁，无缝使用
- 🔒 **隐私优先** - 聊天内容不上传，纯本地处理
- 💾 **加密存储** - SQLite 本地数据库，AES 加密保护

## 🛠 技术栈

- **前端框架**：Vue 3 + TypeScript + Vite
- **桌面端**：Electron 28+
- **UI 组件库**：自定义组件（原生 CSS）
- **本地数据库**：better-sqlite3
- **状态管理**：Pinia
- **路由**：Vue Router

## 📁 项目结构

```
dayan/
├── desktop/                          # 桌面端 Electron 工程
│   ├── src/
│   │   ├── main/                    # 主进程（Node.js）
│   │   │   ├── index.ts             # 主进程入口
│   │   │   ├── window.ts            # 窗口管理 + 吸附功能
│   │   │   ├── clipboard.ts         # 剪贴板监听
│   │   │   ├── license.ts           # 授权激活系统
│   │   │   ├── database.ts          # SQLite 数据库操作
│   │   │   └── ai.ts                # AI 引擎 + Prompt 模板
│   │   ├── preload/                 # 预加载脚本
│   │   │   └── index.ts             # IPC 通信桥接
│   │   └── renderer/                # 渲染进程（Vue3）
│   │       ├── pages/               # 功能页面
│   │       ├── components/          # 公共组件
│   │       ├── router/              # 路由配置
│   │       ├── styles/              # 全局样式
│   │       ├── App.vue              # 根组件
│   │       └── main.ts              # 渲染进程入口
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── shared/                           # 跨平台共享逻辑（待实现）
├── 嗒言-产品需求文档.md
├── 嗒言-技术架构方案.md
├── 嗒言-品牌文案库.md
└── 嗒言-官方Logo.svg
```

## 🚀 开发启动

```bash
# 进入桌面端目录
cd desktop

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建打包
npm run build
```

## ⚙️ 配置说明

首次使用需要在「设置」页面配置：

1. **AI 服务商** - 选择 OpenAI / 智谱 AI / 通义千问
2. **API Key** - 输入你的 API 密钥
3. **API 地址** - 自定义接口地址（支持代理）
4. **模型名称** - 指定使用的模型

## 📱 功能模块

| 模块 | 说明 | 权限 |
|------|------|------|
| 智能回复 | AI 生成多种风格回复 | 免费 |
| 聊天军师 | 意图分析 + 策略建议 | SVIP |
| 文本润色 | 优化表达，更得体 | 免费 |
| 联系人画像 | 深度分析聊天记录 | SVIP |
| 话术库 | 自定义话术管理 | 免费 |

## 🔐 安全机制

- **零侵入** - 不注入微信进程，仅使用公开 Windows API
- **零上传** - 聊天内容 100% 本地处理，不上传任何服务器
- **本地加密** - SQLite 数据库采用 AES-256 加密存储
- **硬件绑定** - 激活码绑定机器硬件，防止盗用

## 📋 兼容性

- **Windows** - Windows 10 1809+ / Windows 11
- **macOS** - macOS 11.0+（后续支持）

## 📄 License

MIT License

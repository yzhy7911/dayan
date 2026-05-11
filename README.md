# 搭言（Desk）

一款面向销售、客服、关系沟通等场景的桌面 AI 沟通工作台。把"不会回、来不及回、回得不稳"变成可复制的工作流：**识别对话 → 理解局势 → 生成可发送回复 → 持续沉淀话术资产**。

支持 Windows / macOS / Linux。

## 核心功能

| 功能 | 说明 |
|------|------|
| **智能回复** | 粘贴聊天截图或文字，生成多风格（友好/正式/幽默/简洁/共情）候选回复，一键复制 |
| **聊天军师** | 分析对话意图、风险、策略，推荐话术；支持恋爱军师/金牌销售两种模式 |
| **本地语音听写** | 通话中边说边转文字，Vosk 离线识别，不走云端 |
| **话术本 + 知识库** | 话术本管标准口径，知识库管背景资料，互为补充 |
| **联系人画像** | 沉淀联系人标签、聊天记录、性格倾向，与军师联动 |
| **文本润色** | 已有文字的语气/表达优化 |
| **快慢机档位** | 快速 / 标准 / 深度三档，影响检索深度与模型参数 |

## 技术栈

| 层次 | 技术 |
|------|------|
| 桌面端 | Electron 28 |
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Vue Router |
| 本地存储 | Dexie.js (IndexedDB) |
| 语音听写 | Vosk（离线） |
| OCR | PaddleOCR（本地） |
| 打包 | electron-builder |

## 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm
- Windows 10+ / macOS 10.14+ / Linux

### 安装依赖

```bash
cd desktop
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
pnpm build        # 全平台
pnpm build --win  # 仅 Windows
pnpm build --mac  # 仅 macOS
```

打包产物输出到 `desktop/release/`。

### 配置模型服务

在应用内「设置」页配置：

1. 选择服务商（OpenAI 或兼容接口）
2. 填写 API Key
3. 填写 API Base URL（如有）
4. 选择模型名称

## 项目结构

```
wechatrq/
├── desktop/
│   ├── src/
│   │   ├── main/          # Electron 主进程
│   │   ├── preload/       # IPC 桥接
│   │   ├── renderer/      # Vue 前端
│   │   └── shared/        # 跨进程共享类型/工具
│   ├── package.json
│   └── electron-builder.json
├── docs/                   # 产品/开发文档
│   ├── BUILD.md           # 打包详细说明
│   ├── OCR_FEATURE.md     # OCR 功能说明
│   └── ...
└── README.md
```

## 架构设计

详见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 隐私与安全

- 聊天截图 OCR 在本地完成，不上传
- 语音听写使用本地离线模型（Vosk），不调用云端语音 API
- 联系人、历史、话术存储在本地 IndexedDB
- AI 回复调用用户配置的模型服务，数据由用户控制

## 贡献指南

欢迎提交 Issue 和 Pull Request。

**提交前请阅读**：[CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT — 详见 [LICENSE](LICENSE)

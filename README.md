# 搭言（Desk）

一款基于 Electron + Vue 3 的桌面 AI 沟通工作台。  
目标是把“不会回、来不及回、回得不稳”的聊天场景，变成可复制的工作流：**提取对话 → 理解局势 → 生成可发送回复 → 持续沉淀**。

## 功能概览

- **回复工作台**：文本输入/截图粘贴/剪贴板监听，多风格候选回复，一键复制或发送。
- **聊天军师**：意图、风险、策略、推荐话术分析，支持目标管理与历史复盘。
- **快慢机档位**：`快速 / 标准 / 深度` 三档，真实影响检索深度与模型参数。
- **通话军师（离线听写）**：本地语音转文字（Vosk），可将转写内容纳入分析上下文。
- **联系人画像**：联系人信息、聊天记录、基础画像分析，支持与军师对象联动。
- **知识库 + 话术本**：知识库提供依据，话术本提供标准回答，可逐步形成可复用口径。
- **文本润色**：对已有文本做语气和表达优化（与回复/军师角色分离）。

## 最近已完成（当前版本）

- 提升截图聊天提取纯净度，过滤语音时长、图片/视频提示、头像文字等干扰项。
- 军师历史面板支持展开/收起切换，便于小窗口使用。
- 新增军师通话区“复制当前建议”，并可将复制内容写入历史用于整体分析。
- 联系人与军师建立基础联动：
  - 联系人页可一键进入军师分析；
  - 军师场景可围绕同一对象持续沉淀；
  - 新建对象可进入联系人体系。
- 回复链路支持更强上下文检索与多条候选。

## 技术栈

- **桌面端**：Electron
- **前端**：Vue 3 + TypeScript + Vite + Pinia + Vue Router
- **本地存储**：SQLite（better-sqlite3）
- **语音听写**：Vosk（离线）

## 目录结构

```text
wechatrq/
├── desktop/                         # Electron 应用
│   ├── src/main/                    # 主进程
│   ├── src/preload/                 # IPC 桥接
│   └── src/renderer/                # Vue 前端（页面/组件/工具）
├── docs/                            # 产品/功能/迁移文档
└── README.md
```

## 快速开始

```bash
cd /Volumes/data/develop/wechatrq/desktop
pnpm install
pnpm run dev
```

构建：

```bash
pnpm run build
```

## 使用前配置

在「设置」页配置模型服务：

1. 服务商（OpenAI / 兼容接口等）
2. API Key
3. API Base URL（可选）
4. 模型名称

## 语音识别（离线）

通话军师使用本地 Vosk 模型，不依赖云端语音服务。  
请按项目内指引放置模型后再启用听写，模型越贴近业务词汇，识别效果越好。

相关文档：
- [OCR 功能说明](/Volumes/data/develop/wechatrq/docs/OCR_FEATURE.md)
- [OCR 安装说明](/Volumes/data/develop/wechatrq/docs/OCR_INSTALL.md)

## 数据与隐私

- 聊天内容与联系人数据优先本地存储。
- 发送给大模型的内容取决于用户主动触发的“生成/分析”行为。
- 离线听写默认不走云端语音识别。

## 文档索引

- [当前版本功能描述](/Volumes/data/develop/wechatrq/docs/当前版本功能描述.md)
- [产品亮点沉淀](/Volumes/data/develop/wechatrq/docs/PRODUCT_HIGHLIGHTS.md)
- [SQLite 迁移说明](/Volumes/data/develop/wechatrq/docs/SQLITE_MIGRATION.md)

## License

MIT

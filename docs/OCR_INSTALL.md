# OCR 功能本地安装指南

## 📦 安装依赖

在 `desktop` 目录下执行：

```bash
cd desktop

# 安装 tesseract.js（纯 JS，无原生依赖
npm install tesseract.js
```

或使用 pnpm：

```bash
pnpm add tesseract.js
```

---

## ⚡ 首次启动

### Tesseract.js 特性

| 项 | 说明 |
|-----|------|
| **体积** | 首次运行自动下载语言包 (~15MB 中文模型 |
| **速度** | 全屏识别 ~1-2 秒/张 |
| **准确率** | 标准字体 > 90% |
| **平台** | Windows / Mac / Linux 全平台支持 |
| **隐私** | 100% 本地运行，不上网 |

---

## 🔧 可选优化：使用更快的引擎

如果觉得 Tesseract 太慢，后续可以换成 RapidOCR（需要本地有 Python 环境或 ONNX Runtime），速度提升 5-10 倍。

---

## ✅ 验证安装完成后测试

1. `npm run dev` 启动应用
2. 按 `Ctrl+Shift+D` 触发识别
3. 首次运行会自动下载中文模型
4. 查看控制台日志确认 OCR 正常工作

---

## 🚀 性能优化配置

在 `src/main/ocr.ts` 中可以调整：

```typescript
// 调整识别语言：
// 1. 只下载中文：'chi_sim'
// 2. 同时识别模式：
await createWorker('chi_sim', 1, { ... })
```

---

## ⚠️ 常见问题

### 问题：首次启动下载慢

解决：手动下载语言包放到 `${osd 放到 `TEMP` 目录：
https://github.com/naptha/tessdata/blob/gh-pages/4.0.0/chi_sim.traineddata.gz

---

### 问题：识别率太低

解决：截图时尽量让文字清晰，分辨率高一点，对比度明显

### 问题：Mac 截图黑屏

解决：在「系统设置 → 隐私与安全性 → 屏幕录制」中授权

---

## 📌 下一步

OCR 基础版跑通后，可以优化方向

### 1. 区域框选（本周内速度提升 10 倍

### 2. LLM 后处理修复（修复 OCR 错别字准确率 > 100%

### 3. RapidOCR ONNX（速度 50ms

# 搭言 - 打包说明文档

## 环境准备

### 必需工具
- Node.js 18+ 
- npm 或 pnpm
- Windows 10+ / macOS 10.14+

### 安装依赖

```bash
cd desktop
pnpm install
```

## 开发模式

```bash
pnpm dev
```

这将启动 Vite 开发服务器和 Electron 窗口。

## 打包构建

### 构建所有平台

```bash
pnpm build
```

这将执行：
1. Vite 构建前端代码
2. Electron-builder 打包应用

### 平台特定打包

#### Windows
```bash
# 仅打包 Windows 版本
pnpm build --win
```

#### macOS
```bash
# 仅打包 macOS 版本
pnpm build --mac
```

#### Linux
```bash
# 仅打包 Linux 版本
pnpm build --linux
```

## 打包输出

打包后的文件将生成在 `desktop/release` 目录：

```
release/
├── 搭言 Setup 1.0.0.exe   # Windows 安装包
├── 搭言-1.0.0.dmg         # macOS 安装包
└── 搭言-1.0.0.AppImage    # Linux 安装包
```

## 配置说明

### electron-builder 配置

在 `desktop/package.json` 中的 `build` 字段：

```json
{
  "appId": "com.dayan.app",
  "productName": "搭言",
  "directories": {
    "output": "release"
  },
  "files": ["dist"],
  "win": {
    "target": "nsis",
    "icon": "build/icon.ico"
  },
  "mac": {
    "target": "dmg",
    "icon": "build/icon.icns"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

### 图标准备

在 `desktop/build` 目录中放置应用图标：
- Windows: `icon.ico` (256x256)
- macOS: `icon.icns` (512x512)
- Linux: `icon.png` (512x512)

## 代码签名 (可选)

### Windows 签名

如需代码签名以避免 SmartScreen 警告：

```json
{
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "your-password"
  }
}
```

### macOS 签名

```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name"
  }
}
```

## 常见问题

### 1. 打包时网络问题

使用国内镜像：

```bash
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/
```

### 2. 模块重新编译

如果有原生模块需要重新编译：

```bash
pnpm exec electron-rebuild
```

### 3. 清理缓存

```bash
# 清理 node_modules
rm -rf node_modules pnpm-lock.yaml

# 清理打包缓存
rm -rf release dist
```

## 发布流程

1. 更新版本号
2. 运行完整测试
3. 执行打包命令
4. 测试安装包
5. 发布到分发渠道

## 下一步

- 添加自动更新功能
- 集成应用商店发布流程
- 完善代码签名

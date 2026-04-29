import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { windowManager } from './window'
import { clipboardManager } from './clipboard'
import { licenseManager } from './license'
import { aiEngine } from './ai'
import { logger } from './logger'
import { errorMonitor } from './error-monitor'
import { windowDockManager } from './window-dock'
import { ocrManager } from './ocr'
import { shortcutManager } from './shortcuts'

let mainWindow: BrowserWindow | null = null

function safeHandle(channel: string, handler: Parameters<typeof ipcMain.handle>[1]) {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, handler)
}

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// 延迟初始化错误监控
setImmediate(() => {
  errorMonitor.init()
})

function createWindow() {
  logger.info('Main', '🚀 创建主窗口...')

  mainWindow = new BrowserWindow({
    width: 420,
    height: 800,
    minWidth: 400,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#ffffff',
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
      allowRunningInsecureContent: false
    }
  })

  // 开发模式加载逻辑
  const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:33445'

  if (!app.isPackaged) {
    logger.info('Main', '🧪 开发模式 - 加载:', { url: VITE_DEV_SERVER_URL })
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    logger.info('Main', '📦 生产模式')
    mainWindow.loadFile(join(__dirname, '../index.html'))
  }

  // 页面准备好后再显示窗口，避免白屏闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    logger.info('Main', '✅ 窗口已显示')
  })

  // 调试：页面加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('Main', '✅ 页面加载完成')

    // 延迟初始化非关键模块，避免阻塞首屏
    setImmediate(() => {
      windowManager.init(mainWindow!)
      clipboardManager.init(mainWindow!)
      aiEngine.init()
      shortcutManager.init(mainWindow!)

      // macOS 窗口吸附到微信
      if (process.platform === 'darwin') {
        windowDockManager.init(mainWindow!)
      }
    })

    // OCR 管理器最晚初始化（低优先级）
    setTimeout(() => {
      ocrManager.init()
    }, 2000)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    logger.error('Main', '❌ 页面加载失败:', { errorCode, errorDesc })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
    // 🔴 全局 try-catch：任何错误都不会导致整个回调崩溃
    try {
      logger.info('Main', '✅ Electron 已就绪')

      // ==================================================
      // 第一优先级：先注册 OCR handler
      // ==================================================
      console.log('[OCR] 🚀 正在注册 OCR handler...')
      // OCR 功能暂禁用，后续优化后再开启
      // ipcMain.handle('ocr:captureAndRecognize', async () => {
      //   console.log('[OCR] 🔥 收到识别请求')
      //   const rawText = ['张三 14:32', '你好，最近怎么样？', '李四 14:35', '挺好的，下周有空一起吃饭吗？'].join('\n')
      //   const messages = rawText.split('\n').filter(l => l.trim()).map(l => ({ speaker: '未知', content: l }))
      //   return { success: true, rawText, lines: [], messages, imagePath: '' }
      // })
      ipcMain.handle('ocr:parseChat', async (_event, text: string) => {
        const messages = text.split('\n').filter(l => l.trim()).map(l => ({ speaker: '未知', content: l }))
        return { success: true, messages }
      })
      console.log('[OCR] ✅✅✅ OCR handler 全部注册成功！')

      // 数据存储使用 Dexie.js（IndexedDB），无需主进程处理

      createWindow()

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow()
        }
      })

    } catch (err) {
      console.error('[Main] ❌ whenReady 回调崩溃:', err)
      logger.error('Main', 'whenReady 回调崩溃', String(err))
    }
  })

app.on('window-all-closed', () => {
  // 注销全局快捷键
  globalShortcut.unregisterAll()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// === Window IPC ===
safeHandle('window:minimize', () => {
  mainWindow?.minimize()
})

safeHandle('window:close', () => {
  mainWindow?.close()
})

safeHandle('window:setAlwaysOnTop', (_, alwaysOnTop: boolean) => {
  mainWindow?.setAlwaysOnTop(alwaysOnTop)
})

safeHandle('window:toggleDock', () => {
  if (process.platform === 'darwin') {
    return windowDockManager.toggleDock()
  }

  return windowManager.toggleDock()
})

safeHandle('window:checkWeChat', async () => {
  if (process.platform === 'darwin') {
    return windowDockManager.checkWeChat()
  }

  return windowManager.checkWeChat()
})

safeHandle('window:getDockStatus', async () => {
  if (process.platform === 'darwin') {
    return {
      platform: process.platform,
      ...windowDockManager.getDockStatus(),
      wechatFound: await windowDockManager.checkWeChat()
    }
  }

  return {
    platform: process.platform,
    ...windowManager.getDockStatus(),
    wechatFound: windowManager.checkWeChat()
  }
})

// === Clipboard IPC 已在 clipboard.ts 中注册 ===

// === License IPC ===
safeHandle('license:verify', (_, key: string) => {
  return licenseManager.verifyLicense(key)
})

safeHandle('license:getMachineId', () => {
  return licenseManager.getMachineId()
})

safeHandle('license:isActivated', () => {
  return licenseManager.isActivated()
})

// === AI IPC ===
safeHandle('ai:generateReply', (_, context, style) => {
  return aiEngine.generateReply(context, style)
})

safeHandle('ai:polishText', (_, text, style) => {
  return aiEngine.polishText(text, style)
})

safeHandle('ai:analyzeIntent', (_, chatHistory, goal) => {
  return aiEngine.analyzeIntent(chatHistory, goal)
})

safeHandle('ai:analyzeOverall', (_, chatHistory, goal) => {
  return aiEngine.analyzeOverall(chatHistory, goal)
})

safeHandle('ai:setConfig', (_, config) => {
  aiEngine.setConfig(config)
  return true
})

safeHandle('ai:initConfig', (_, config) => {
  aiEngine.setConfig(config)
  return true
})

safeHandle('ai:testConnection', () => {
  return aiEngine.testConnection()
})

// === Logger & Error Monitor IPC ===
safeHandle('logger:getLogFile', () => {
  return logger.getLogFile()
})

safeHandle('logger:getErrorHistory', () => {
  return errorMonitor.getErrorHistory()
})

safeHandle('logger:clearErrorHistory', () => {
  errorMonitor.clearErrorHistory()
  return true
})

logger.info('Main', '✅ 主进程启动脚本执行完毕')

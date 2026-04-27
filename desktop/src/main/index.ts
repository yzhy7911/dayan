import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { windowManager } from './window'
import { clipboardManager } from './clipboard'
import { licenseManager } from './license'
import { aiEngine } from './ai'
import { logger } from './logger'
import { errorMonitor } from './error-monitor'
import { windowDockManager } from './window-dock'

let mainWindow: BrowserWindow | null = null

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// 初始化错误监控和日志
errorMonitor.init()

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
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false,
      allowRunningInsecureContent: true
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

  // 调试：页面加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('Main', '✅ 页面加载完成')
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    logger.error('Main', '❌ 页面加载失败:', { errorCode, errorDesc })
  })

  windowManager.init(mainWindow)
  clipboardManager.init(mainWindow)
  aiEngine.init()
  // macOS 窗口吸附到微信
  if (process.platform === 'darwin') {
    windowDockManager.init(mainWindow)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  logger.info('Main', '✅ Electron 已就绪')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// === Window IPC ===
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:close', () => {
  mainWindow?.close()
})

ipcMain.handle('window:toggleDock', () => {
  return windowManager.toggleDock()
})

ipcMain.handle('window:setAlwaysOnTop', (_, alwaysOnTop: boolean) => {
  mainWindow?.setAlwaysOnTop(alwaysOnTop)
})

// === Clipboard IPC ===
ipcMain.handle('clipboard:getText', () => {
  return clipboardManager.getText()
})

// === License IPC ===
ipcMain.handle('license:verify', (_, key: string) => {
  return licenseManager.verifyLicense(key)
})

ipcMain.handle('license:getMachineId', () => {
  return licenseManager.getMachineId()
})

ipcMain.handle('license:isActivated', () => {
  return licenseManager.isActivated()
})

// === AI IPC ===
ipcMain.handle('ai:generateReply', (_, context, style) => {
  return aiEngine.generateReply(context, style)
})

ipcMain.handle('ai:polishText', (_, text, style) => {
  return aiEngine.polishText(text, style)
})

ipcMain.handle('ai:analyzeIntent', (_, chatHistory, goal) => {
  return aiEngine.analyzeIntent(chatHistory, goal)
})

ipcMain.handle('ai:analyzeOverall', (_, chatHistory, goal) => {
  return aiEngine.analyzeOverall(chatHistory, goal)
})

ipcMain.handle('ai:setConfig', (_, config) => {
  aiEngine.setConfig(config)
  return true
})

ipcMain.handle('ai:initConfig', (_, config) => {
  aiEngine.setConfig(config)
  return true
})

ipcMain.handle('ai:testConnection', () => {
  return aiEngine.testConnection()
})

// === Logger & Error Monitor IPC ===
ipcMain.handle('logger:getLogFile', () => {
  return logger.getLogFile()
})

ipcMain.handle('logger:getErrorHistory', () => {
  return errorMonitor.getErrorHistory()
})

ipcMain.handle('logger:clearErrorHistory', () => {
  errorMonitor.clearErrorHistory()
  return true
})

logger.info('Main', '✅ 主进程启动脚本执行完毕')

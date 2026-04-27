import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { windowManager } from './window'
import { clipboardManager } from './clipboard'
import { licenseManager } from './license'
import { aiEngine } from './ai'

let mainWindow: BrowserWindow | null = null

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

function createWindow() {
  console.log('[Main] 🚀 创建主窗口...')

  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 400,
    minHeight: 600,
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
    console.log('[Main] 🧪 开发模式 - 加载:', VITE_DEV_SERVER_URL)
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    console.log('[Main] 📦 生产模式')
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 调试：页面加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] ✅ 页面加载完成')
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDesc) => {
    console.error('[Main] ❌ 页面加载失败:', errorCode, errorDesc)
  })

  windowManager.init(mainWindow)
  clipboardManager.init(mainWindow)
  aiEngine.init()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  console.log('[Main] ✅ Electron 已就绪')
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

ipcMain.handle('ai:analyzeIntent', (_, chatHistory) => {
  return aiEngine.analyzeIntent(chatHistory)
})

ipcMain.handle('ai:testConnection', () => {
  return aiEngine.testConnection()
})

console.log('[Main] ✅ 主进程启动脚本执行完毕')

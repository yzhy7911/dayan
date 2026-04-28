import { BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { logger } from './logger'

interface ShortcutConfig {
  toggleWindow: string
  quickReply: string
  quickPolish: string
}

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  toggleWindow: 'CommandOrControl+Shift+S',
  quickReply: 'CommandOrControl+Shift+R',
  quickPolish: 'CommandOrControl+Shift+P'
}

class ShortcutManager {
  private mainWindow: BrowserWindow | null = null
  private shortcuts: ShortcutConfig = { ...DEFAULT_SHORTCUTS }

  init(window: BrowserWindow) {
    this.mainWindow = window
    this.registerDefaultShortcuts()
    this.setupIpcHandlers()
    logger.info('Shortcuts', '✅ 全局快捷键管理器初始化完成')
  }

  private setupIpcHandlers() {
    ipcMain.handle('shortcuts:getConfig', () => {
      return this.shortcuts
    })

    ipcMain.handle('shortcuts:setConfig', (_event, config: Partial<ShortcutConfig>) => {
      this.shortcuts = { ...this.shortcuts, ...config }
      this.registerDefaultShortcuts()
      logger.info('Shortcuts', '快捷键配置已更新', config)
      return true
    })

    ipcMain.handle('shortcuts:register', (_event, accelerator: string, action: string) => {
      return this.registerDynamicShortcut(accelerator, action)
    })

    ipcMain.handle('shortcuts:unregister', (_event, accelerator: string) => {
      globalShortcut.unregister(accelerator)
      logger.info('Shortcuts', '已注销快捷键', accelerator)
      return true
    })

    ipcMain.handle('shortcuts:reset', () => {
      this.shortcuts = { ...DEFAULT_SHORTCUTS }
      this.registerDefaultShortcuts()
      logger.info('Shortcuts', '快捷键已重置为默认值')
      return this.shortcuts
    })
  }

  private registerDefaultShortcuts() {
    // 先注销所有已注册的快捷键
    globalShortcut.unregisterAll()

    // 注册显示/隐藏窗口快捷键
    if (this.shortcuts.toggleWindow) {
      const success = globalShortcut.register(this.shortcuts.toggleWindow, () => {
        this.toggleWindow()
      })
      if (success) {
        logger.info('Shortcuts', `已注册窗口切换快捷键: ${this.shortcuts.toggleWindow}`)
      } else {
        logger.error('Shortcuts', `注册快捷键失败: ${this.shortcuts.toggleWindow}`)
      }
    }

    // 注册快速回复快捷键
    if (this.shortcuts.quickReply) {
      const success = globalShortcut.register(this.shortcuts.quickReply, () => {
        this.triggerQuickReply()
      })
      if (success) {
        logger.info('Shortcuts', `已注册快速回复快捷键: ${this.shortcuts.quickReply}`)
      }
    }

    // 注册快速润色快捷键
    if (this.shortcuts.quickPolish) {
      const success = globalShortcut.register(this.shortcuts.quickPolish, () => {
        this.triggerQuickPolish()
      })
      if (success) {
        logger.info('Shortcuts', `已注册快速润色快捷键: ${this.shortcuts.quickPolish}`)
      }
    }
  }

  private registerDynamicShortcut(accelerator: string, action: string): boolean {
    try {
      const success = globalShortcut.register(accelerator, () => {
        this.handleDynamicAction(action)
      })
      if (success) {
        logger.info('Shortcuts', `已注册动态快捷键: ${accelerator} -> ${action}`)
      }
      return success
    } catch (e) {
      logger.error('Shortcuts', `注册动态快捷键失败: ${accelerator}`, String(e))
      return false
    }
  }

  private toggleWindow() {
    if (!this.mainWindow) return

    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide()
      logger.info('Shortcuts', '窗口已隐藏')
    } else {
      this.mainWindow.show()
      this.mainWindow.focus()
      logger.info('Shortcuts', '窗口已显示')
    }
  }

  private triggerQuickReply() {
    if (!this.mainWindow) return

    this.mainWindow.show()
    this.mainWindow.focus()
    this.mainWindow.webContents.send('shortcut:quickReply')
    logger.info('Shortcuts', '触发快速回复')
  }

  private triggerQuickPolish() {
    if (!this.mainWindow) return

    this.mainWindow.show()
    this.mainWindow.focus()
    this.mainWindow.webContents.send('shortcut:quickPolish')
    logger.info('Shortcuts', '触发快速润色')
  }

  private handleDynamicAction(action: string) {
    if (!this.mainWindow) return

    switch (action) {
      case 'showReplyPage':
        this.mainWindow.webContents.send('navigate', '/reply')
        break
      case 'showPolishPage':
        this.mainWindow.webContents.send('navigate', '/polish')
        break
      case 'showCoachPage':
        this.mainWindow.webContents.send('navigate', '/coach')
        break
      default:
        this.mainWindow.webContents.send('shortcut:custom', action)
    }
  }
}

export const shortcutManager = new ShortcutManager()

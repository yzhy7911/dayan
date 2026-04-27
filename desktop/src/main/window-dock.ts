import { BrowserWindow, ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger'

const execAsync = promisify(exec)

// 吸附距离阈值（像素）- 增大阈值，更容易触发
const DOCK_THRESHOLD = 60
// 防抖延迟（毫秒）
const DEBOUNCE_MS = 150

interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 使用 AppleScript 获取微信窗口位置
 */
async function getWeChatWindow(): Promise<WindowRect | null> {
  try {
    // 简化版 AppleScript，增加错误处理
    const script = `
      try
        tell application "System Events"
          set processList to every process whose name is "WeChat" or name is "微信"
          if (count of processList) > 0 then
            set weChatProcess to first item of processList
            tell weChatProcess
              if (count of windows) > 0 then
                set winRect to position of window 1
                set winSize to size of window 1
                return item 1 of winRect & "," & item 2 of winRect & "," & item 1 of winSize & "," & item 2 of winSize
              end if
            end tell
          end if
        end tell
      on error errMsg
        return "error:" & errMsg
      end try
    `

    const { stdout, stderr } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)

    if (stderr) {
      logger.warn('Dock', 'AppleScript stderr:', stderr)
      return null
    }

    const output = stdout.trim()

    if (output.startsWith('error:')) {
      logger.warn('Dock', 'AppleScript 错误:', output)
      return null
    }

    if (!output) {
      logger.warn('Dock', '未找到微信窗口')
      return null
    }

    const parts = output.split(',').map(Number)

    if (parts.length === 4 && !parts.some(isNaN)) {
      logger.info('Dock', '微信窗口位置:', { x: parts[0], y: parts[1], w: parts[2], h: parts[3] })
      return {
        x: parts[0],
        y: parts[1],
        width: parts[2],
        height: parts[3]
      }
    }
  } catch (e: any) {
    logger.warn('Dock', '获取微信窗口失败:', e.message)
  }
  return null
}

/**
 * 计算两个窗口之间的吸附位置
 */
function calculateDockPosition(
  appRect: WindowRect,
  wechatRect: WindowRect
): { x: number; y: number } | null {
  const appRight = appRect.x + appRect.width
  const appBottom = appRect.y + appRect.height
  const wechatRight = wechatRect.x + wechatRect.width
  const wechatBottom = wechatRect.y + wechatRect.height

  // 水平中心对齐
  const appCenterX = appRect.x + appRect.width / 2
  const wechatCenterX = wechatRect.x + wechatRect.width / 2

  // 左边吸附
  if (
    Math.abs(appRight - wechatRect.x) < DOCK_THRESHOLD &&
    Math.abs(appCenterX - wechatCenterX) < 150
  ) {
    return { x: wechatRect.x - appRect.width, y: wechatRect.y }
  }

  // 右边吸附
  if (
    Math.abs(appRect.x - wechatRight) < DOCK_THRESHOLD &&
    Math.abs(appCenterX - wechatCenterX) < 150
  ) {
    return { x: wechatRight, y: wechatRect.y }
  }

  // 上边吸附
  if (
    Math.abs(appBottom - wechatRect.y) < DOCK_THRESHOLD &&
    Math.abs(appCenterX - wechatCenterX) < 150
  ) {
    return { x: wechatRect.x, y: wechatRect.y - appRect.height }
  }

  // 下边吸附
  if (
    Math.abs(appRect.y - wechatBottom) < DOCK_THRESHOLD &&
    Math.abs(appCenterX - wechatCenterX) < 150
  ) {
    return { x: wechatRect.x, y: wechatBottom }
  }

  return null
}

/**
 * 窗口吸附管理器
 */
class WindowDockManager {
  private mainWindow: BrowserWindow | null = null
  private isDockingEnabled = true
  private isMoving = false
  private dockTimer: NodeJS.Timeout | null = null
  private lastDockTime = 0
  private hasPermissionsChecked = false

  init(window: BrowserWindow) {
    this.mainWindow = window

    // 启动时检查权限
    this.checkPermissions()

    // 监听窗口移动 - 使用防抖
    window.on('move', () => {
      if (!this.isDockingEnabled || this.isMoving) return

      // 防抖处理
      if (this.dockTimer) {
        clearTimeout(this.dockTimer)
      }

      this.dockTimer = setTimeout(() => {
        this.tryDockToWeChat()
      }, DEBOUNCE_MS)
    })

    // 监听窗口移动结束（用户停止拖动后
    window.on('moved', () => {
      if (!this.isDockingEnabled || this.isMoving) return
      // 停止移动后再检查一次
      setTimeout(() => {
        this.tryDockToWeChat()
      }, 100)
    })

    // 注册 IPC 控制
    ipcMain.handle('window:toggleDock', () => {
      this.isDockingEnabled = !this.isDockingEnabled
      logger.info('Dock', `窗口吸附 ${this.isDockingEnabled ? '已开启' : '已关闭'}`)
      return this.isDockingEnabled
    })

    ipcMain.handle('window:checkWeChat', async () => {
      const wechat = await getWeChatWindow()
      return wechat != null
    })

    logger.info('Dock', '✅ 窗口吸附管理器已初始化，吸附阈值:', DOCK_THRESHOLD)
  }

  private async checkPermissions() {
    if (this.hasPermissionsChecked) return
    this.hasPermissionsChecked = true

    try {
      // 简单测试 AppleScript 权限
      const testScript = 'tell application "System Events" to return "OK"'
      const { stdout } = await execAsync(`osascript -e '${testScript}'`)
      if (stdout.trim() === 'OK') {
        logger.info('Dock', '✅ AppleScript 权限正常')
      } else {
        logger.warn('Dock', '⚠️ AppleScript 可能需要权限，请在 系统设置 -> 隐私与安全性 -> 辅助功能 中允许当前应用')
      }
    } catch (e: any) {
      logger.warn('Dock', '⚠️ AppleScript 权限检查失败:', e.message)
      logger.warn('Dock', '请在 系统设置 -> 隐私与安全性 -> 辅助功能 中允许当前应用')
    }
  }

  private async tryDockToWeChat() {
    if (!this.mainWindow) return

    // 限制频率，避免太频繁
    const now = Date.now()
    if (now - this.lastDockTime < 500) return
    this.lastDockTime = now

    try {
      const wechatRect = await getWeChatWindow()
      if (!wechatRect) return

      const [x, y] = this.mainWindow.getPosition()
      const [width, height] = this.mainWindow.getSize()

      logger.info('Dock', '当前窗口位置:', { x, y, w: width, h: height })

      const dockPosition = calculateDockPosition(
        { x, y, width, height },
        wechatRect
      )

      if (dockPosition) {
        this.isMoving = true
        logger.info('Dock', '🎯 吸附到:', dockPosition)
        this.mainWindow.setPosition(dockPosition.x, dockPosition.y)
        logger.info('Dock', '✅ 已吸附到微信窗口')
        setTimeout(() => {
          this.isMoving = false
        }, 500)
      }
    } catch (e: any) {
      logger.error('Dock', '吸附失败:', e.message)
    }
  }
}

export const windowDockManager = new WindowDockManager()

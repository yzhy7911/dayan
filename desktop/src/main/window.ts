import { BrowserWindow } from 'electron'
import { platform } from 'os'
import { execSync } from 'child_process'

class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private isDocked: boolean = false
  private dockInterval: NodeJS.Timeout | null = null

  init(window: BrowserWindow) {
    this.mainWindow = window
    this.setupWindowEvents()
  }

  private setupWindowEvents() {
    if (platform() === 'win32') {
      this.startWechatTracking()
    }
  }

  private startWechatTracking() {
    this.dockInterval = setInterval(() => {
      if (this.isDocked) {
        this.trackWechatWindow()
      }
    }, 100)
  }

  private trackWechatWindow() {
    try {
      const wechatRect = this.getWechatWindowRect()
      if (wechatRect && this.mainWindow) {
        const [wechatLeft, wechatTop, wechatWidth, wechatHeight] = wechatRect
        const appWidth = this.mainWindow.getSize()[0]

        const newX = wechatLeft + wechatWidth
        const newY = wechatTop

        const [currentX, currentY] = this.mainWindow.getPosition()
        if (Math.abs(currentX - newX) > 5 || Math.abs(currentY - newY) > 5) {
          this.mainWindow.setPosition(newX, newY, true)
          this.mainWindow.setSize(appWidth, wechatHeight, true)
        }
      }
    } catch (e) {
      console.error('Track wechat window failed:', e)
    }
  }

  private getWechatWindowRect(): [number, number, number, number] | null {
    if (platform() !== 'win32') return null

    try {
      const result = execSync(`
        Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
            [DllImport("user32.dll", CharSet = CharSet.Unicode)]
            public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

            [StructLayout(LayoutKind.Sequential)]
            public struct RECT {
                public int Left;
                public int Top;
                public int Right;
                public int Bottom;
            }
        }
"@

        $hWnd = [Win32]::FindWindow("WeChatMainWndForPC", [NullString]::Value)
        if ($hWnd -ne [IntPtr]::Zero) {
            $rect = New-Object Win32+RECT
            if ([Win32]::GetWindowRect($hWnd, [ref]$rect)) {
                Write-Output "$($rect.Left),$($rect.Top),$($rect.Right - $rect.Left),$($rect.Bottom - $rect.Top)"
            }
        }
      `, { shell: 'powershell.exe', encoding: 'utf8' }).toString().trim()

      if (result) {
        const [left, top, width, height] = result.split(',').map(Number)
        return [left, top, width, height]
      }
    } catch (e) {
      console.error('Get wechat window rect failed:', e)
    }
    return null
  }

  toggleDock(): boolean {
    this.isDocked = !this.isDocked

    if (this.isDocked) {
      this.trackWechatWindow()
    }

    return this.isDocked
  }

  isWindowDocked(): boolean {
    return this.isDocked
  }

  destroy() {
    if (this.dockInterval) {
      clearInterval(this.dockInterval)
    }
  }
}

export const windowManager = new WindowManager()

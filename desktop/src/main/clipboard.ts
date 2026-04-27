import { BrowserWindow, clipboard, ipcMain } from 'electron'

class ClipboardManager {
  private mainWindow: BrowserWindow | null = null
  private lastText: string = ''
  private isListening: boolean = false
  private checkInterval: NodeJS.Timeout | null = null

  init(window: BrowserWindow) {
    this.mainWindow = window
    this.setupIpcHandlers()
  }

  private setupIpcHandlers() {
    // Remove existing handler before registering to avoid duplicate
    const safeHandle = (channel: string, handler: any) => {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, handler)
    }

    safeHandle('clipboard:startListen', () => {
      return this.startListening()
    })

    safeHandle('clipboard:stopListen', () => {
      return this.stopListening()
    })

    safeHandle('clipboard:getText', () => {
      return this.getText()
    })

    safeHandle('clipboard:setText', (_, text: string) => {
      return this.setText(text)
    })

    safeHandle('clipboard:paste', () => {
      return this.simulatePaste()
    })
  }

  startListening(): boolean {
    if (this.isListening) return true

    this.isListening = true
    this.lastText = clipboard.readText()

    this.checkInterval = setInterval(() => {
      this.checkClipboardChange()
    }, 200)

    return true
  }

  stopListening(): boolean {
    this.isListening = false

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    return true
  }

  private checkClipboardChange() {
    if (!this.isListening || !this.mainWindow) return

    const currentText = clipboard.readText()
    if (currentText && currentText !== this.lastText) {
      this.lastText = currentText
      this.mainWindow.webContents.send('clipboard:changed', currentText)
    }
  }

  getText(): string {
    return clipboard.readText()
  }

  setText(text: string): boolean {
    clipboard.writeText(text)
    return true
  }

  simulatePaste(): boolean {
    try {
      const { execSync } = require('child_process')
      if (process.platform === 'win32') {
        execSync(`
          Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
              [DllImport("user32.dll")]
              public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);
          }
"@
          [Win32]::keybd_event(0x11, 0, 0, 0)
          [Win32]::keybd_event(0x56, 0, 0, 0)
          [Win32]::keybd_event(0x56, 0, 2, 0)
          [Win32]::keybd_event(0x11, 0, 2, 0)
        `, { shell: 'powershell.exe' })
      }
      return true
    } catch (e) {
      console.error('Simulate paste failed:', e)
      return false
    }
  }

  destroy() {
    this.stopListening()
  }
}

export const clipboardManager = new ClipboardManager()

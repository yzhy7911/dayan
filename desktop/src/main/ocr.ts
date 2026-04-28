import { BrowserWindow, clipboard, ipcMain, IpcMainInvokeEvent, nativeImage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

class OCRManager {
  private mainWindow: BrowserWindow | null = null

  init(window: BrowserWindow) {
    this.mainWindow = window
    this.setupIpcHandlers()
  }

  private setupIpcHandlers() {
    const safeHandle = (channel: string, handler: any) => {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, handler)
    }

    safeHandle('ocr:hasImage', () => {
      return this.hasImage()
    })

    safeHandle('ocr:getImage', () => {
      return this.getImage()
    })

    safeHandle('ocr:recognize', async (_event: IpcMainInvokeEvent, imageData?: string) => {
      return this.recognize(imageData)
    })
  }

  hasImage(): boolean {
    const image = clipboard.readImage()
    return !image.isEmpty()
  }

  getImage(): string | null {
    const image = clipboard.readImage()
    if (image.isEmpty()) return null

    // 转换为 base64
    const dataUrl = image.toDataURL()
    return dataUrl
  }

  async recognize(imageData?: string): Promise<{ success: boolean; text: string; error?: string }> {
    try {
      // TODO: 未来可以集成本地 OCR 库（如 PaddleOCR、Tesseract）
      // 当前方案：通过 AI 引擎的多模态能力识别
      // 先保存图片到临时文件
      let imageToUse: string | null = imageData || null

      if (!imageToUse) {
        const image = clipboard.readImage()
        if (image.isEmpty()) {
          return { success: false, text: '', error: '剪贴板中没有图片' }
        }
        imageToUse = image.toDataURL()
      }

      // 对于 MVP 版本，我们直接返回提示，让 AI 引擎处理
      // 实际上，识别逻辑应该在 AI 引擎中使用 vision 模型
      return {
        success: true,
        text: '', // 留空，让 AI 引擎直接处理图片
        error: undefined
      }
    } catch (e) {
      console.error('OCR recognize failed:', e)
      return {
        success: false,
        text: '',
        error: e instanceof Error ? e.message : '识别失败'
      }
    }
  }

  // 保存图片到临时文件（备用）
  private saveImageToTemp(image: Electron.NativeImage): string {
    const tempDir = app.getPath('temp')
    const tempPath = path.join(tempDir, `ocr_temp_${Date.now()}.png`)
    fs.writeFileSync(tempPath, image.toPNG())
    return tempPath
  }
}

export const ocrManager = new OCRManager()
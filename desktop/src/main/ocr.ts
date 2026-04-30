import { ipcMain, IpcMainInvokeEvent, app } from 'electron'
import { logger } from './logger'
import * as path from 'path'
import * as fs from 'fs'

interface OCRLine {
  text: string
  confidence?: number
  box?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface OCRRecognizeResult {
  text: string
  lines: OCRLine[]
  width: number
  height: number
}

class OCRService {
  private ocrService: any = null
  private isInitialized = false
  private sharp: any = null

  private findModelPath(modelName: string): string | null {
    const possiblePaths = [
      path.join(process.resourcesPath || '', 'models', modelName),
      path.join(__dirname, '../../models', modelName),
      path.join(app.getAppPath(), 'models', modelName),
      path.join(process.cwd(), 'models', modelName),
      `/Volumes/data/develop/wechatrq/desktop/models/${modelName}`
    ]
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p
      }
    }
    return null
  }

  private async loadModelBuffer(modelPath: string): Promise<ArrayBuffer> {
    const buffer = fs.readFileSync(modelPath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }

  private async loadDictionary(dictPath: string): Promise<string[]> {
    const content = fs.readFileSync(dictPath, 'utf-8')
    const chars = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    if (chars.length > 0 && chars[0] !== ' ') {
      return [' ', ...chars]
    }
    return chars
  }

  private hasModelFiles(): boolean {
    return Boolean(
      this.findModelPath('ch_PP-OCRv4_det_infer.onnx') &&
      this.findModelPath('ch_PP-OCRv4_rec_infer.onnx') &&
      this.findModelPath('ppocr_keys_v1.txt')
    )
  }

  async init(): Promise<void> {
    this.registerIPC()
    return this.initialize()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized && this.ocrService) {
      return
    }

    logger.info('OCR', '开始初始化 PaddleOCR...')

    try {
      const detPath = this.findModelPath('ch_PP-OCRv4_det_infer.onnx')
      const recPath = this.findModelPath('ch_PP-OCRv4_rec_infer.onnx')
      const dictPath = this.findModelPath('ppocr_keys_v1.txt')

      if (!detPath || !recPath || !dictPath) {
        logger.error('OCR', '未能找到所有必要的模型文件')
        return
      }

      logger.info('OCR', `检测模型: ${detPath}`)
      logger.info('OCR', `识别模型: ${recPath}`)
      logger.info('OCR', `字符字典: ${dictPath}`)

      const detBuffer = await this.loadModelBuffer(detPath)
      const recBuffer = await this.loadModelBuffer(recPath)
      const dictionary = await this.loadDictionary(dictPath)
      const [{ PaddleOcrService }, ort] = await Promise.all([
        import('paddleocr'),
        import('onnxruntime-node')
      ])

      logger.info('OCR', `字符字典加载成功，共 ${dictionary.length} 个字符`)

      this.ocrService = await PaddleOcrService.createInstance({
        ort,
        detection: {
          modelBuffer: detBuffer,
          minimumAreaThreshold: 24,
          textPixelThreshold: 0.55,
          paddingBoxVertical: 0.3,
          paddingBoxHorizontal: 0.5,
        },
        recognition: {
          modelBuffer: recBuffer,
          charactersDictionary: dictionary,
          imageHeight: 48,
        },
      })

      this.isInitialized = true
      logger.info('OCR', 'PaddleOCR 初始化完成')
    } catch (e) {
      logger.error('OCR', `初始化失败: ${e}`)
      throw e
    }
  }

  async recognizeImage(buffer: Buffer): Promise<OCRRecognizeResult> {
    if (!this.isInitialized || !this.ocrService) {
      await this.initialize()
    }

    if (!this.ocrService) {
      logger.error('OCR', 'OCR服务未初始化')
      return { text: '', lines: [], width: 0, height: 0 }
    }

    try {
      logger.info('OCR', `开始识别图片... 数据大小: ${buffer.length} 字节`)

      let rawBuffer = buffer
      
      const bufferStr = buffer.toString('utf-8')
      if (bufferStr.startsWith('data:image/')) {
        logger.info('OCR', '检测到 Data URL 格式，需要解码')
        
        const match = bufferStr.match(/^data:image\/[^;]+;base64,(.+)$/)
        if (match) {
          rawBuffer = Buffer.from(match[1], 'base64')
          logger.info('OCR', `Base64 解码完成，原始图片大小: ${rawBuffer.length} 字节`)
        } else {
          throw new Error('无效的 Data URL 格式')
        }
      }

      let image: Buffer
      let metadata: any
      const sharp = await this.loadSharp()

      try {
        metadata = await sharp(rawBuffer).metadata()
        logger.info('OCR', `图片格式: ${metadata.format}, 尺寸: ${metadata.width}x${metadata.height}`)
        image = await sharp(rawBuffer)
          .removeAlpha()
          .raw()
          .toBuffer()
      } catch (formatError) {
        logger.warn('OCR', `sharp无法识别图片格式: ${formatError}`)
        
        const header = rawBuffer.slice(0, 16).toString('hex')
        logger.info('OCR', `图片头部十六进制: ${header}`)
        
        throw new Error(`不支持的图片格式: ${formatError}`)
      }

      const input = {
        data: new Uint8Array(image),
        width: metadata.width || 0,
        height: metadata.height || 0,
      }

      logger.info('OCR', `输入数据: ${input.width}x${input.height}, 数据长度: ${input.data.length}`)

      const result = await this.ocrService.recognize(input)
      
      let text = ''
      const lines: OCRLine[] = []
      for (const item of result) {
        if (item.text) {
          const cleanText = item.text.trim()
          text += cleanText + '\n'
          lines.push({
            text: cleanText,
            confidence: item.confidence,
            box: item.box
          })
        }
      }

      text = text.trim()
      logger.info('OCR', `识别完成: "${text}"`)
      return {
        text,
        lines,
        width: metadata.width || 0,
        height: metadata.height || 0
      }
    } catch (e) {
      logger.error('OCR', `识别失败: ${e}`)
      return { text: '', lines: [], width: 0, height: 0 }
    }
  }

  registerIPC(): void {
    ipcMain.removeHandler('ocr:recognize')
    ipcMain.handle('ocr:recognize', async (_event: IpcMainInvokeEvent, buffer: Buffer) => {
      try {
        const result = await this.recognizeImage(buffer)
        return { success: true, ...result }
      } catch (e) {
        return { success: false, text: '', lines: [], width: 0, height: 0, error: String(e) }
      }
    })

    ipcMain.removeHandler('ocr:hasImage')
    ipcMain.handle('ocr:hasImage', async () => {
      return this.isInitialized || this.hasModelFiles()
    })

    ipcMain.removeHandler('ocr:getImage')
    ipcMain.handle('ocr:getImage', async () => {
      return null
    })
  }

  private async loadSharp() {
    if (this.sharp) return this.sharp
    const sharpModule = await import('sharp')
    this.sharp = sharpModule.default || sharpModule
    return this.sharp
  }
}

export const ocrManager = new OCRService()

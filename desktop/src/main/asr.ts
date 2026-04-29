import { app, ipcMain } from 'electron'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { createRequire } from 'module'
import { logger } from './logger'

type AsrSession = {
  recognizer: any
  sampleRate: number
}

type AsrStatus = {
  available: boolean
  modelReady: boolean
  runtimeReady: boolean
  modelPath: string
  modelName: string
  error?: string
}

const require = createRequire(import.meta.url)

class AsrManager {
  private model: any = null
  private vosk: any = null
  private runtimeError = ''
  private sessions = new Map<string, AsrSession>()

  registerIpc() {
    this.safeHandle('asr:status', () => this.getStatus())
    this.safeHandle('asr:start', (_event, sampleRate = 16000) => this.startSession(sampleRate))
    this.safeHandle('asr:pushAudio', (_event, sessionId: string, audioData: ArrayBuffer | Uint8Array) => {
      return this.pushAudio(sessionId, audioData)
    })
    this.safeHandle('asr:stop', (_event, sessionId: string) => this.stopSession(sessionId))
  }

  getStatus(): AsrStatus {
    const modelPath = this.getModelPath()
    const modelReady = existsSync(modelPath)
    const runtimeReady = this.ensureRuntime()

    return {
      available: modelReady && runtimeReady,
      modelReady,
      runtimeReady,
      modelPath,
      modelName: modelPath.split(/[\\/]/).pop() || '',
      error: modelReady ? this.runtimeError || undefined : '未找到本地语音模型'
    }
  }

  startSession(sampleRate = 16000) {
    const status = this.getStatus()
    if (!status.available) {
      return { success: false, ...status }
    }

    const model = this.ensureModel()
    if (!model) {
      return { success: false, ...this.getStatus() }
    }

    try {
      const recognizer = this.createRecognizer(model, sampleRate)
      const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      this.sessions.set(sessionId, { recognizer, sampleRate })
      return { success: true, sessionId, sampleRate }
    } catch (e: any) {
      logger.error('ASR', '创建识别会话失败', e?.message || String(e))
      return { success: false, error: e?.message || '创建识别会话失败' }
    }
  }

  pushAudio(sessionId: string, audioData: ArrayBuffer | Uint8Array) {
    const session = this.sessions.get(sessionId)
    if (!session) return { success: false, error: '语音会话已结束' }

    try {
      const buffer = Buffer.from(audioData instanceof Uint8Array ? audioData : new Uint8Array(audioData))
      const isFinal = Boolean(session.recognizer.acceptWaveform(buffer))
      const result = this.readRecognizerResult(session.recognizer, isFinal)
      return { success: true, isFinal, ...result }
    } catch (e: any) {
      logger.error('ASR', '识别音频失败', e?.message || String(e))
      return { success: false, error: e?.message || '识别音频失败' }
    }
  }

  stopSession(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return { success: true, text: '' }

    try {
      const finalResult = this.parseJson(session.recognizer.finalResult?.())
      session.recognizer.free?.()
      return { success: true, text: this.pickText(finalResult) }
    } catch (e: any) {
      return { success: false, error: e?.message || '结束语音会话失败' }
    } finally {
      this.sessions.delete(sessionId)
    }
  }

  stopAllSessions() {
    for (const sessionId of Array.from(this.sessions.keys())) {
      this.stopSession(sessionId)
    }
  }

  private getModelPath() {
    const basePath = app.isPackaged
      ? join(process.resourcesPath, 'models', 'asr')
      : join(process.cwd(), 'models', 'asr')
    return this.pickBestModelPath(basePath)
  }

  private pickBestModelPath(basePath: string) {
    try {
      const candidates = readdirSync(basePath, { withFileTypes: true })
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .filter(name => existsSync(join(basePath, name, 'conf')) && existsSync(join(basePath, name, 'am')))
        .sort((a, b) => this.scoreModelName(b) - this.scoreModelName(a))

      if (candidates.length) {
        return join(basePath, candidates[0])
      }
    } catch {}

    return join(basePath, 'vosk-cn-small')
  }

  private scoreModelName(name: string) {
    const normalized = name.toLowerCase()
    let score = 0
    if (normalized.includes('cn') || normalized.includes('zh')) score += 20
    if (normalized.includes('small')) score -= 10
    if (normalized.includes('lite')) score -= 8
    if (normalized.includes('0.22')) score += 8
    if (normalized.includes('big') || normalized.includes('large')) score += 6
    return score
  }

  private ensureRuntime() {
    if (this.vosk) return true
    try {
      this.vosk = require('vosk-koffi')
      this.vosk.setLogLevel?.(-1)
      this.runtimeError = ''
      return true
    } catch (e: any) {
      this.runtimeError = `未安装本地识别运行库 vosk-koffi：${e?.message || String(e)}`
      return false
    }
  }

  private ensureModel() {
    if (this.model) return this.model
    if (!this.ensureRuntime()) return null

    try {
      this.model = new this.vosk.Model(this.getModelPath())
      return this.model
    } catch (e: any) {
      this.runtimeError = `本地语音模型加载失败：${e?.message || String(e)}`
      logger.error('ASR', this.runtimeError)
      return null
    }
  }

  private createRecognizer(model: any, sampleRate: number) {
    if (this.vosk.Recognizer) {
      return new this.vosk.Recognizer({ model, sampleRate })
    }
    return new this.vosk.KaldiRecognizer(model, sampleRate)
  }

  private readRecognizerResult(recognizer: any, isFinal: boolean) {
    if (isFinal) {
      const result = this.parseJson(recognizer.result?.())
      return { text: this.pickText(result), partial: '' }
    }
    const partial = this.parseJson(recognizer.partialResult?.())
    return { text: '', partial: partial.partial || '' }
  }

  private pickText(result: Record<string, any>) {
    if (typeof result.text === 'string') return result.text
    const alternative = result.alternatives?.find((item: any) => typeof item?.text === 'string')
    return alternative?.text || ''
  }

  private parseJson(value: unknown) {
    if (!value) return {}
    if (typeof value === 'object') return value as Record<string, any>
    try {
      return JSON.parse(String(value))
    } catch {
      return {}
    }
  }

  private safeHandle(channel: string, handler: Parameters<typeof ipcMain.handle>[1]) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, handler)
  }
}

export const asrManager = new AsrManager()

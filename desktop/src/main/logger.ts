import { app } from 'electron'
import { join } from 'path'
import { appendFileSync, existsSync, mkdirSync, statSync, truncateSync } from 'fs'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: any
}

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

class Logger {
  private logDir: string
  private logFile: string
  private currentLevel: LogLevel = 'info'
  private maxFileSize = 5 * 1024 * 1024 // 5MB

  constructor() {
    this.logDir = join(app.getPath('userData'), 'logs')
    this.logFile = join(this.logDir, 'app.log')
    this.ensureLogDir()
  }

  private ensureLogDir() {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.currentLevel]
  }

  private formatLog(entry: LogEntry): string {
    const logStr = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`
    return entry.data ? `${logStr} ${JSON.stringify(entry.data)}\n` : `${logStr}\n`
  }

  private checkFileSize() {
    try {
      const stats = statSync(this.logFile)
      if (stats.size > this.maxFileSize) {
        truncateSync(this.logFile, 0)
        this.info('Logger', '日志文件已轮转（超过大小限制）')
      }
    } catch {
      // 文件不存在或其他错误，忽略
    }
  }

  private write(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return

    try {
      this.checkFileSize()
      appendFileSync(this.logFile, this.formatLog(entry), 'utf8')
    } catch (e) {
      console.error('Failed to write log:', e)
    }

    // 同时输出到控制台
    const consoleMethod = entry.level === 'error' ? console.error :
                          entry.level === 'warn' ? console.warn :
                          console.log

    consoleMethod(`[${entry.module}] ${entry.message}`, entry.data || '')
  }

  error(module: string, message: string, data?: any) {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'error',
      module,
      message,
      data
    })
  }

  warn(module: string, message: string, data?: any) {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'warn',
      module,
      message,
      data
    })
  }

  info(module: string, message: string, data?: any) {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'info',
      module,
      message,
      data
    })
  }

  debug(module: string, message: string, data?: any) {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'debug',
      module,
      message,
      data
    })
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level
    this.info('Logger', `日志级别已设置为: ${level}`)
  }

  getLogFile(): string {
    return this.logFile
  }

  getLogDir(): string {
    return this.logDir
  }
}

export const logger = new Logger()

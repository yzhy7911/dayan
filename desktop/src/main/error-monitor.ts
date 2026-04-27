import { app, ipcMain } from 'electron'
import { logger } from './logger'

interface ErrorReport {
  type: 'uncaughtException' | 'unhandledRejection' | 'rendererError'
  message: string
  stack?: string
  timestamp: string
  details?: any
}

class ErrorMonitor {
  private errorHistory: ErrorReport[] = []
  private maxHistorySize = 100

  init() {
    this.setupProcessHandlers()
    this.setupIpcHandlers()
    logger.info('ErrorMonitor', '错误监控系统已初始化')
  }

  private setupProcessHandlers() {
    process.on('uncaughtException', (error) => {
      this.handleError({
        type: 'uncaughtException',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    })

    process.on('unhandledRejection', (reason: any) => {
      this.handleError({
        type: 'unhandledRejection',
        message: reason?.message || String(reason),
        stack: reason?.stack,
        timestamp: new Date().toISOString(),
        details: { reason }
      })
    })

    app.on('child-process-gone', (_, details) => {
      this.handleError({
        type: 'uncaughtException',
        message: `子进程异常退出: ${details.type}`,
        timestamp: new Date().toISOString(),
        details
      })
    })
  }

  private setupIpcHandlers() {
    ipcMain.handle('error:report', (_, error) => {
      this.handleError({
        type: 'rendererError',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        details: error.details
      })
      return true
    })

    ipcMain.handle('error:getHistory', () => {
      return this.getErrorHistory()
    })

    ipcMain.handle('error:clearHistory', () => {
      this.clearErrorHistory()
      return true
    })
  }

  private handleError(report: ErrorReport) {
    // 记录到日志
    logger.error('ErrorMonitor', `${report.type}: ${report.message}`, {
      stack: report.stack,
      details: report.details
    })

    // 保存到历史记录
    this.errorHistory.unshift(report)
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.pop()
    }

    // TODO: 可以在这里添加错误上报（如 Sentry）
  }

  getErrorHistory(): ErrorReport[] {
    return [...this.errorHistory]
  }

  clearErrorHistory() {
    this.errorHistory = []
    logger.info('ErrorMonitor', '错误历史已清空')
  }

  getErrorCountByType(type: ErrorReport['type']): number {
    return this.errorHistory.filter(e => e.type === type).length
  }
}

export const errorMonitor = new ErrorMonitor()

/**
 * 内存管理工具
 * 定期清理过期数据，防止内存泄漏
 */

import { ChatHistoryDB } from './database'

// 定时器ID
let cleanupTimer: ReturnType<typeof setInterval> | null = null

// 清理间隔：30分钟
const CLEANUP_INTERVAL = 30 * 60 * 1000

export class MemoryManager {
  /**
   * 启动定期清理任务
   */
  static startCleanup(): void {
    if (cleanupTimer) return

    cleanupTimer = setInterval(() => {
      this.performCleanup()
    }, CLEANUP_INTERVAL)

    console.log('[Memory] 🧹 内存管理已启动，每30分钟清理一次')
  }

  /**
   * 停止定期清理任务
   */
  static stopCleanup(): void {
    if (cleanupTimer) {
      clearInterval(cleanupTimer)
      cleanupTimer = null
      console.log('[Memory] 🧹 内存管理已停止')
    }
  }

  /**
   * 执行一次清理
   */
  static async performCleanup(): Promise<void> {
    try {
      // 1. 清理过期的聊天历史（保留最近100条）
      await ChatHistoryDB.deleteOldest(100)

      // 2. 清理图片数据（历史记录中的图片base64占用大量内存）
      await this.cleanupImageCache()

      console.log('[Memory] 🧹 定期清理完成')
    } catch (e) {
      console.warn('[Memory] ⚠️ 清理过程中出错:', e)
    }
  }

  /**
   * 清理图片缓存
   */
  private static async cleanupImageCache(): Promise<void> {
    try {
      // 清理超过7天的包含图片的历史记录中的图片数据
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const { historyDB } = await import('./history-storage')
      const oldRecords = await historyDB.replyHistory
        .filter(h => Boolean(h.inputImage) && h.createdAt < sevenDaysAgo)
        .toArray()

      for (const record of oldRecords) {
        if (record.id && record.inputImage) {
          await historyDB.replyHistory.update(record.id, {
            inputImage: undefined,
            updatedAt: Date.now()
          })
        }
      }

      if (oldRecords.length > 0) {
        console.log(`[Memory] 🧹 已清理 ${oldRecords.length} 条旧图片数据`)
      }
    } catch (e) {
      // 图片清理失败不影响使用
    }
  }

  /**
   * 获取当前内存使用情况
   */
  static getMemoryUsage(): { usedJSHeapSize?: number; totalJSHeapSize?: number } {
    if ((performance as any).memory) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize
      }
    }
    return {}
  }
}

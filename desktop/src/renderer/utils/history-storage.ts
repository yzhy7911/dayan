import Dexie, { Table } from 'dexie'

export interface ReplyHistory {
  id?: number
  inputText: string
  inputImage?: string
  selectedStyle: string
  replies: { style: string; reply: string }[]
  isFavorite: boolean
  createdAt: number
  updatedAt: number
}

// 最大保存记录数，防止数据无限增长
const MAX_HISTORY_COUNT = 500
// 清理阈值：超过此数量时自动清理
const CLEANUP_THRESHOLD = 600

class HistoryDatabase extends Dexie {
  replyHistory!: Table<ReplyHistory>

  constructor() {
    super('history-db')

    this.version(2).stores({
      replyHistory: '++id, createdAt, updatedAt'
    })
  }
}

export const historyDB = new HistoryDatabase()

export class HistoryStorage {
  static async saveReply(
    inputText: string,
    replies: { style: string; reply: string }[],
    selectedStyle: string,
    inputImage?: string
  ): Promise<number> {
    const history: ReplyHistory = {
      inputText,
      inputImage,
      selectedStyle,
      replies,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    const id = await historyDB.replyHistory.add(history)

    // 异步清理超出限制的旧记录
    this.autoCleanup()

    return id
  }

  static async getHistory(limit: number = 50): Promise<ReplyHistory[]> {
    const allHistory = await historyDB.replyHistory.toArray()
    allHistory.sort((a, b) => b.createdAt - a.createdAt)
    return allHistory.slice(0, limit)
  }

  static async getFavorites(limit: number = 50): Promise<ReplyHistory[]> {
    const allHistory = await historyDB.replyHistory
      .filter(h => h.isFavorite)
      .reverse()
      .sortBy('createdAt')
    return allHistory.slice(0, limit)
  }

  static async toggleFavorite(id: number): Promise<void> {
    const history = await historyDB.replyHistory.get(id)
    if (history) {
      await historyDB.replyHistory.update(id, {
        isFavorite: !history.isFavorite,
        updatedAt: Date.now()
      })
    }
  }

  static async deleteHistory(id: number): Promise<void> {
    await historyDB.replyHistory.delete(id)
  }

  static async clearAll(): Promise<void> {
    await historyDB.replyHistory.clear()
  }

  static async searchHistory(keyword: string): Promise<ReplyHistory[]> {
    const allHistory = await historyDB.replyHistory.toArray()
    const lowerKeyword = keyword.toLowerCase()
    return allHistory
      .filter(h =>
        h.inputText.toLowerCase().includes(lowerKeyword) ||
        h.replies.some(r => r.reply.toLowerCase().includes(lowerKeyword))
      )
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * 自动清理：保留收藏的记录，删除最旧的非收藏记录
   */
  private static autoCleanup(): void {
    // 不阻塞主流程，异步执行
    historyDB.replyHistory.count().then(count => {
      if (count < CLEANUP_THRESHOLD) return

      historyDB.replyHistory
        .filter(h => !h.isFavorite)
        .sortBy('createdAt')
        .then(nonFavorites => {
          const deleteCount = nonFavorites.length - (MAX_HISTORY_COUNT - (count - nonFavorites.length))
          if (deleteCount > 0) {
            const toDelete = nonFavorites.slice(0, deleteCount)
            const ids = toDelete.map(h => h.id).filter((id): id is number => id !== undefined)
            historyDB.replyHistory.bulkDelete(ids)
            console.log(`[HistoryDB] 🧹 已清理 ${ids.length} 条旧记录`)
          }
        })
        .catch(() => {
          // 清理失败不影响使用
        })
    })
  }

  static async init(): Promise<void> {
    try {
      await historyDB.open()
      console.log('[HistoryDB] ✅ 历史记录数据库初始化成功')
    } catch (error) {
      console.error('[HistoryDB] ❌ 数据库初始化失败:', error)
      // 如果打开失败，尝试删除后重新打开
      try {
        indexedDB.deleteDatabase('history-db')
        await historyDB.open()
        console.log('[HistoryDB] ✅ 数据库重置后初始化成功')
      } catch (retryError) {
        console.error('[HistoryDB] ❌ 数据库重置后仍然失败:', retryError)
        throw retryError
      }
    }
  }
}

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
    return await historyDB.replyHistory.add(history)
  }

  static async getHistory(limit: number = 50): Promise<ReplyHistory[]> {
    const allHistory = await historyDB.replyHistory.toArray()
    allHistory.sort((a, b) => b.createdAt - a.createdAt)
    return allHistory.slice(0, limit)
  }

  static async getFavorites(limit: number = 50): Promise<ReplyHistory[]> {
    const allHistory = await historyDB.replyHistory.toArray()
    const allFavorites = allHistory.filter(h => h.isFavorite)
    allFavorites.sort((a, b) => b.createdAt - a.createdAt)
    return allFavorites.slice(0, limit)
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

  static async init(): Promise<void> {
    try {
      // 如果有旧版本数据库，先删除它
      const oldDBs = await indexedDB.databases()
      if (oldDBs.some(db => db.name === 'history-db' && (db.version || 1) < 2)) {
        console.log('[HistoryDB] 检测到旧版本数据库，正在删除...')
        indexedDB.deleteDatabase('history-db')
      }

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

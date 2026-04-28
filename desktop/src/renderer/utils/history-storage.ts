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

    this.version(1).stores({
      replyHistory: '++id, isFavorite, createdAt, updatedAt'
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
    const allFavorites = await historyDB.replyHistory.where('isFavorite').equals(true).toArray()
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
      await historyDB.open()
      console.log('[HistoryDB] ✅ 历史记录数据库初始化成功')
    } catch (error) {
      console.error('[HistoryDB] ❌ 数据库初始化失败:', error)
      throw error
    }
  }
}

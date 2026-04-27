import Dexie, { Table } from 'dexie'

export interface ChatHistory {
  id?: number
  content: string
  role: 'user' | 'assistant'
  style: string
  timestamp: number
}

export interface KnowledgeItem {
  id?: number
  category: string
  keyword: string
  content: string
  createdAt: number
}

class DayanDatabase extends Dexie {
  chatHistory!: Table<ChatHistory>
  knowledgeBase!: Table<KnowledgeItem>

  constructor() {
    super('dayan-db')
    
    this.version(1).stores({
      chatHistory: '++id, timestamp, role, style',
      knowledgeBase: '++id, category, keyword, createdAt'
    })
  }
}

export const db = new DayanDatabase()

export class ChatHistoryDB {
  static async add(chat: Omit<ChatHistory, 'id'>): Promise<number> {
    return await db.chatHistory.add(chat as ChatHistory)
  }

  static async getAll(limit = 50): Promise<ChatHistory[]> {
    return await db.chatHistory
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray()
  }

  static async clear(): Promise<void> {
    await db.chatHistory.clear()
  }

  static async count(): Promise<number> {
    return await db.chatHistory.count()
  }

  static async deleteOldest(keepCount = 100): Promise<void> {
    const all = await db.chatHistory
      .orderBy('timestamp')
      .reverse()
      .toArray()
    
    if (all.length > keepCount) {
      const toDelete = all.slice(keepCount)
      const ids = toDelete.map(item => item.id).filter(id => id !== undefined) as number[]
      await db.chatHistory.bulkDelete(ids)
    }
  }
}

export class KnowledgeDB {
  static async add(item: Omit<KnowledgeItem, 'id' | 'createdAt'>): Promise<number> {
    const newItem: KnowledgeItem = {
      ...item,
      createdAt: Date.now()
    }
    return await db.knowledgeBase.add(newItem)
  }

  static async getAll(): Promise<KnowledgeItem[]> {
    return await db.knowledgeBase
      .orderBy('createdAt')
      .reverse()
      .toArray()
  }

  static async search(keyword: string, limit = 10): Promise<KnowledgeItem[]> {
    const keywordLower = keyword.toLowerCase()
    return await db.knowledgeBase
      .filter(item => 
        item.keyword.toLowerCase().includes(keywordLower) ||
        item.content.toLowerCase().includes(keywordLower)
      )
      .limit(limit)
      .toArray()
  }

  static async getByCategory(category: string): Promise<KnowledgeItem[]> {
    if (category === '全部') {
      return await this.getAll()
    }
    return await db.knowledgeBase
      .where('category')
      .equals(category)
      .toArray()
  }

  static async update(id: number, updates: Partial<KnowledgeItem>): Promise<number> {
    return await db.knowledgeBase.update(id, updates)
  }

  static async delete(id: number): Promise<void> {
    await db.knowledgeBase.delete(id)
  }

  static async count(): Promise<number> {
    return await db.knowledgeBase.count()
  }
}

export class DatabaseInitializer {
  static async init(): Promise<void> {
    try {
      await db.open()
      console.log('[Database] ✅ Dexie.js 数据库初始化成功')
      
      const knowledgeCount = await KnowledgeDB.count()
      if (knowledgeCount === 0) {
        await this.initDefaultKnowledge()
      }
      
    } catch (error) {
      console.error('[Database] ❌ 数据库初始化失败:', error)
      throw error
    }
  }

  private static async initDefaultKnowledge(): Promise<void> {
    const defaultKnowledge = [
      { category: '工作', keyword: '加班回复', content: '好的领导，我今天处理完这个再走，保证按时交付。' },
      { category: '情感', keyword: '安慰人', content: '我知道你现在很难受，没关系的，有我陪着你呢。' },
      { category: '商务', keyword: '砍价', content: '这个价格确实有点超出预算了，您看能不能再优惠一些？' },
      { category: '日常', keyword: '谢谢回复', content: '太感谢啦！下次有需要我再找你帮忙~' }
    ]

    for (const item of defaultKnowledge) {
      await KnowledgeDB.add(item)
    }
    
    console.log('[Database] ✅ 默认话术库初始化完成')
  }
}

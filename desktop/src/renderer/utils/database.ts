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

export interface KnowledgeDocument {
  id?: number
  title: string
  content: string
  scene: string
  type: string
  tags: string[]
  source?: string
  enabled: boolean
  createdAt: number
  updatedAt: number
}

class DayanDatabase extends Dexie {
  chatHistory!: Table<ChatHistory>
  knowledgeBase!: Table<KnowledgeItem>
  knowledgeLibrary!: Table<KnowledgeDocument>

  constructor() {
    super('dayan-db')
    
    this.version(1).stores({
      chatHistory: '++id, timestamp, role, style',
      knowledgeBase: '++id, category, keyword, createdAt'
    })

    this.version(2).stores({
      chatHistory: '++id, timestamp, role, style',
      knowledgeBase: '++id, category, keyword, createdAt',
      knowledgeLibrary: '++id, scene, type, enabled, updatedAt'
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

  static async bulkAdd(items: Array<{ category: string; keyword: string; content: string }>): Promise<number[]> {
    const newItems = items.map(item => ({
      ...item,
      createdAt: Date.now()
    }))
    return await db.knowledgeBase.bulkAdd(newItems)
  }

  static async getAllCategories(): Promise<string[]> {
    const items = await this.getAll()
    const categories = new Set(items.map(item => item.category))
    return Array.from(categories)
  }
}

export class KnowledgeLibraryDB {
  private static async ensureOpen(): Promise<void> {
    if (!db.isOpen()) {
      await db.open()
    }
  }

  static async add(item: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    await this.ensureOpen()
    const now = Date.now()
    return await db.knowledgeLibrary.add({
      ...item,
      createdAt: now,
      updatedAt: now
    })
  }

  static async getAll(): Promise<KnowledgeDocument[]> {
    await this.ensureOpen()
    return await db.knowledgeLibrary
      .orderBy('updatedAt')
      .reverse()
      .toArray()
  }

  static async getEnabled(): Promise<KnowledgeDocument[]> {
    await this.ensureOpen()
    const items = await this.getAll()
    return items.filter(item => item.enabled)
  }

  static async search(keyword: string, limit = 8, scene = '全部'): Promise<KnowledgeDocument[]> {
    await this.ensureOpen()
    
    const keywords = keyword
      .toLowerCase()
      .split(/[\s,，。！？!?、\n]+/)
      .map(item => item.trim())
      .filter(item => item.length >= 2)

    if (!keywords.length) return []

    const items = await this.getEnabled()
    return items
      .filter(item => scene === '全部' || item.scene === scene || item.scene === '通用')
      .map(item => {
        const haystack = [
          item.title,
          item.content,
          item.scene,
          item.type,
          ...(item.tags || [])
        ].join(' ').toLowerCase()
        const score = keywords.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0)
        return { item, score }
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || b.item.updatedAt - a.item.updatedAt)
      .slice(0, limit)
      .map(result => result.item)
  }

  static async update(id: number, updates: Partial<KnowledgeDocument>): Promise<number> {
    await this.ensureOpen()
    return await db.knowledgeLibrary.update(id, {
      ...updates,
      updatedAt: Date.now()
    })
  }

  static async delete(id: number): Promise<void> {
    await this.ensureOpen()
    await db.knowledgeLibrary.delete(id)
  }

  static async count(): Promise<number> {
    await this.ensureOpen()
    return await db.knowledgeLibrary.count()
  }

  static async bulkAdd(items: Array<Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number[]> {
    await this.ensureOpen()
    const now = Date.now()
    return await db.knowledgeLibrary.bulkAdd(items.map(item => ({
      ...item,
      createdAt: now,
      updatedAt: now
    })))
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

      const knowledgeLibraryCount = await KnowledgeLibraryDB.count()
      if (knowledgeLibraryCount === 0) {
        await this.initDefaultKnowledgeLibrary()
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

  private static async initDefaultKnowledgeLibrary(): Promise<void> {
    await KnowledgeLibraryDB.bulkAdd([
      {
        title: '销售价格回答边界',
        content: '回答价格、优惠、赠品、退款等问题时，必须以当前正式政策为准。没有明确政策依据时，不承诺额外折扣、赠品、退款或服务期限，可以表达“我帮您确认最新方案”。',
        scene: '销售',
        type: '禁止承诺',
        tags: ['价格', '优惠', '退款', '承诺'],
        source: '内置销售范本',
        enabled: true
      },
      {
        title: '销售异议处理原则',
        content: '客户质疑价格或效果时，先承认顾虑合理，再回到需求、价值和案例。不要急着压单，也不要用绝对化承诺证明效果。',
        scene: '销售',
        type: '异议处理',
        tags: ['异议', '价格', '效果', '成交'],
        source: '内置销售范本',
        enabled: true
      },
      {
        title: '恋爱沟通雷区',
        content: '关系紧张或对方回复冷淡时，避免连续追问、情绪审判和要求立刻解释。优先承接情绪，降低压迫感，再轻轻表达自己的感受。',
        scene: '恋爱',
        type: '关系笔记',
        tags: ['冷淡', '情绪', '追问', '推进'],
        source: '内置恋爱范本',
        enabled: true
      },
      {
        title: '恋爱推进原则',
        content: '对方态度不明确时，不要一次性抛出过重的问题。可以用轻松、具体、低压力的邀约或表达，给对方留回应空间。',
        scene: '恋爱',
        type: '沟通策略',
        tags: ['邀约', '推进', '低压力', '关系'],
        source: '内置恋爱范本',
        enabled: true
      }
    ])

    console.log('[Database] ✅ 默认知识库初始化完成')
  }
}

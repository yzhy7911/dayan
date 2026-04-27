import Dexie, { Table } from 'dexie'

export interface Contact {
  id?: number
  name: string
  avatar?: string
  remark?: string
  tags: string[]
  chatCount: number
  lastChatTime?: number
  createdAt: number
  updatedAt: number
}

export interface ContactAnalysis {
  id?: number
  contactId: number
  personality: string
  communicationStyle: string
  commonTopics: string[]
  emotionalTendency: string
  bestResponseTime: string
  tabooTopics: string[]
  suggestions: string[]
  analyzedAt: number
}

export interface ChatRecord {
  id?: number
  contactId: number
  content: string
  sender: 'me' | 'contact'
  timestamp: number
}

class ContactDatabase extends Dexie {
  contacts!: Table<Contact>
  analysis!: Table<ContactAnalysis>
  chatRecords!: Table<ChatRecord>

  constructor() {
    super('contact-db')

    this.version(1).stores({
      contacts: '++id, name, tags, createdAt, updatedAt',
      analysis: '++id, contactId, analyzedAt',
      chatRecords: '++id, contactId, timestamp, sender'
    })
  }
}

export const contactDB = new ContactDatabase()

export class ContactStorage {
  static async createContact(name: string, remark?: string): Promise<number> {
    const contact: Contact = {
      name,
      remark: remark || '',
      tags: [],
      chatCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    return await contactDB.contacts.add(contact)
  }

  static async getContacts(): Promise<Contact[]> {
    return await contactDB.contacts
      .orderBy('updatedAt')
      .reverse()
      .toArray()
  }

  static async getContact(id: number): Promise<Contact | undefined> {
    return await contactDB.contacts.get(id)
  }

  static async updateContact(id: number, updates: Partial<Contact>): Promise<number> {
    return await contactDB.contacts.update(id, {
      ...updates,
      updatedAt: Date.now()
    })
  }

  static async deleteContact(id: number): Promise<void> {
    await contactDB.transaction('rw', [contactDB.contacts, contactDB.analysis, contactDB.chatRecords], async () => {
      await contactDB.contacts.delete(id)
      await contactDB.analysis.where('contactId').equals(id).delete()
      await contactDB.chatRecords.where('contactId').equals(id).delete()
    })
  }

  static async addChatRecord(contactId: number, content: string, sender: 'me' | 'contact'): Promise<number> {
    const record: ChatRecord = {
      contactId,
      content,
      sender,
      timestamp: Date.now()
    }

    const id = await contactDB.chatRecords.add(record)

    // 更新联系人聊天计数和时间
    await contactDB.contacts.update(contactId, {
      chatCount: (await contactDB.chatRecords.where('contactId').equals(contactId).count()),
      lastChatTime: Date.now(),
      updatedAt: Date.now()
    })

    return id
  }

  static async getChatRecords(contactId: number, limit: number = 100): Promise<ChatRecord[]> {
    return await contactDB.chatRecords
      .where('contactId')
      .equals(contactId)
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray()
  }

  static async saveAnalysis(analysis: Omit<ContactAnalysis, 'id' | 'analyzedAt'>): Promise<number> {
    const analysisRecord: ContactAnalysis = {
      ...analysis,
      analyzedAt: Date.now()
    }
    return await contactDB.analysis.add(analysisRecord)
  }

  static async getLatestAnalysis(contactId: number): Promise<ContactAnalysis | undefined> {
    return await contactDB.analysis
      .where('contactId')
      .equals(contactId)
      .orderBy('analyzedAt')
      .reverse()
      .first()
  }

  static async initDefaultData(): Promise<void> {
    const count = await contactDB.contacts.count()
    if (count === 0) {
      await this.createContact('张三', '客户')
      await this.createContact('李四', '朋友')
    }
  }

  static async init(): Promise<void> {
    try {
      await contactDB.open()
      console.log('[ContactDB] ✅ 联系人数据库初始化成功')
      await this.initDefaultData()
    } catch (error) {
      console.error('[ContactDB] ❌ 数据库初始化失败:', error)
      throw error
    }
  }
}

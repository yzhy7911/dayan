// 本地存储工具 - 配置文件使用 localStorage，数据使用 Dexie.js (IndexedDB)
import {
  ChatHistoryDB,
  KnowledgeDB,
  KnowledgeLibraryDB,
  DatabaseInitializer
} from './database'

const STORAGE_PREFIX = 'dayan_'

export const CONFIG_KEYS = {
  AI_PROVIDER: 'ai_provider',
  AI_API_KEY: 'ai_api_key',
  AI_BASE_URL: 'ai_base_url',
  AI_MODEL: 'ai_model',
  CLIPBOARD_LISTEN: 'clipboard_listen',
  DOCK_ENABLED: 'dock_enabled'
} as const

export const DEFAULT_CONFIG = {
  [CONFIG_KEYS.AI_PROVIDER]: 'openai',
  [CONFIG_KEYS.AI_API_KEY]: '',
  [CONFIG_KEYS.AI_BASE_URL]: 'https://api.openai.com/v1',
  [CONFIG_KEYS.AI_MODEL]: 'gpt-3.5-turbo',
  [CONFIG_KEYS.CLIPBOARD_LISTEN]: 'true',
  [CONFIG_KEYS.DOCK_ENABLED]: 'false'
}

// === 配置文件存储（使用 localStorage）===
export function getConfig(key: string): string {
  const value = localStorage.getItem(STORAGE_PREFIX + key)
  return value ?? DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG] ?? ''
}

export function setConfig(key: string, value: string): void {
  localStorage.setItem(STORAGE_PREFIX + key, value)
}

export function getAllConfig(): Record<string, string> {
  const config: Record<string, string> = {}
  for (const key of Object.values(CONFIG_KEYS)) {
    config[key] = getConfig(key)
  }
  return config
}

export function deleteConfig(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

// === AI 配置快捷方法 ===
export function getAIConfig() {
  return {
    provider: getConfig(CONFIG_KEYS.AI_PROVIDER),
    apiKey: getConfig(CONFIG_KEYS.AI_API_KEY),
    baseUrl: getConfig(CONFIG_KEYS.AI_BASE_URL),
    model: getConfig(CONFIG_KEYS.AI_MODEL)
  }
}

export function saveAIConfig(config: {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}): void {
  setConfig(CONFIG_KEYS.AI_PROVIDER, config.provider)
  setConfig(CONFIG_KEYS.AI_API_KEY, config.apiKey)
  setConfig(CONFIG_KEYS.AI_BASE_URL, config.baseUrl)
  setConfig(CONFIG_KEYS.AI_MODEL, config.model)
}

export function hasAPIKey(): boolean {
  return getConfig(CONFIG_KEYS.AI_API_KEY).length > 0
}

// === 聊天历史管理（使用 Dexie.js）===
export async function initDatabase(): Promise<void> {
  await DatabaseInitializer.init()
}

export const getChatHistory = (limit?: number) => ChatHistoryDB.getAll(limit)
export const addChatHistory = (chat: Parameters<typeof ChatHistoryDB.add>[0]) => ChatHistoryDB.add(chat)
export const clearChatHistory = () => ChatHistoryDB.clear()

// === 话术库管理（使用 Dexie.js）===
export const getKnowledgeBase = () => KnowledgeDB.getAll()
export const addKnowledge = (item: Parameters<typeof KnowledgeDB.add>[0]) => KnowledgeDB.add(item)
export const searchKnowledge = (keyword: string, limit?: number) => KnowledgeDB.search(keyword, limit)
export const getKnowledgeByCategory = (category: string) => KnowledgeDB.getByCategory(category)
export const updateKnowledge = (id: number, updates: Parameters<typeof KnowledgeDB.update>[1]) => KnowledgeDB.update(id, updates)
export const deleteKnowledge = (id: number) => KnowledgeDB.delete(id)
export const bulkAddKnowledge = (items: Parameters<typeof KnowledgeDB.bulkAdd>[0]) => KnowledgeDB.bulkAdd(items)
export const getKnowledgeCategories = () => KnowledgeDB.getAllCategories()

// === 知识库管理（资料依据，不等同于可直接发送的话术）===
export const getKnowledgeDocuments = () => KnowledgeLibraryDB.getAll()
export const getEnabledKnowledgeDocuments = () => KnowledgeLibraryDB.getEnabled()
export const addKnowledgeDocument = (item: Parameters<typeof KnowledgeLibraryDB.add>[0]) => KnowledgeLibraryDB.add(item)
export const searchKnowledgeDocuments = (keyword: string, limit?: number, scene?: string) => KnowledgeLibraryDB.search(keyword, limit, scene)
export const updateKnowledgeDocument = (id: number, updates: Parameters<typeof KnowledgeLibraryDB.update>[1]) => KnowledgeLibraryDB.update(id, updates)
export const deleteKnowledgeDocument = (id: number) => KnowledgeLibraryDB.delete(id)
export const bulkAddKnowledgeDocuments = (items: Parameters<typeof KnowledgeLibraryDB.bulkAdd>[0]) => KnowledgeLibraryDB.bulkAdd(items)

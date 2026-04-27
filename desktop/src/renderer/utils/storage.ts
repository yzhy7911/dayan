// 本地存储工具 - 配置文件使用 localStorage，数据使用 Dexie.js (IndexedDB)
import { 
  ChatHistoryDB, 
  KnowledgeDB, 
  DatabaseInitializer,
  ChatHistory,
  KnowledgeItem
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

export const getChatHistory = ChatHistoryDB.getAll
export const addChatHistory = ChatHistoryDB.add
export const clearChatHistory = ChatHistoryDB.clear

// === 话术库管理（使用 Dexie.js）===
export const getKnowledgeBase = KnowledgeDB.getAll
export const addKnowledge = KnowledgeDB.add
export const searchKnowledge = KnowledgeDB.search
export const getKnowledgeByCategory = KnowledgeDB.getByCategory
export const updateKnowledge = KnowledgeDB.update
export const deleteKnowledge = KnowledgeDB.delete

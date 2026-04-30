import {
  getKnowledgeBase,
  searchKnowledgeDocuments,
  initDatabase
} from './storage'
import type { KnowledgeDocument, KnowledgeItem } from './database'

export interface PhrasebookMatch {
  id?: number
  category: string
  keyword: string
  content: string
  score: number
}

export interface KnowledgeMatch {
  id?: number
  title: string
  content: string
  scene: string
  type: string
  tags: string[]
  source?: string
  score: number
}

export interface CommunicationContextMatches {
  phrasebook: PhrasebookMatch[]
  knowledge: KnowledgeMatch[]
}

export type ResponseMode = 'fast' | 'balanced' | 'deep'

let isInitialized = false

async function ensureInitialized(): Promise<void> {
  if (isInitialized) return
  try {
    await initDatabase()
    isInitialized = true
    console.log('[ContextRetrieval] 数据库初始化完成')
  } catch (e) {
    console.warn('[ContextRetrieval] 数据库初始化失败:', e)
  }
}

const splitKeywords = (query: string) => {
  return Array.from(new Set(
    query
      .toLowerCase()
      .split(/[\s,，。！？!?、；;：:\n\r"'""''()[\]【】]+/)
      .map(item => item.trim())
      .filter(item => item.length >= 2)
  ))
}

const scoreText = (query: string, fields: string[]) => {
  const normalizedQuery = query.toLowerCase()
  const keywords = splitKeywords(query)
  const haystack = fields.join(' ').toLowerCase()

  let score = 0
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) score += 10
  }

  for (const field of fields) {
    const value = field.toLowerCase()
    if (value && normalizedQuery.includes(value)) score += 16
  }

  return score
}

const toPhrasebookMatch = (query: string, item: KnowledgeItem): PhrasebookMatch => ({
  id: item.id,
  category: item.category,
  keyword: item.keyword,
  content: item.content,
  score: scoreText(query, [item.keyword, item.category, item.content])
})

const toKnowledgeMatch = (query: string, item: KnowledgeDocument): KnowledgeMatch => ({
  id: item.id,
  title: item.title,
  content: item.content,
  scene: item.scene,
  type: item.type,
  tags: item.tags || [],
  source: item.source,
  score: scoreText(query, [item.title, item.content, item.scene, item.type, ...(item.tags || [])])
})

export async function retrieveCommunicationContext(
  query: string,
  options: { scene?: string; phraseLimit?: number; knowledgeLimit?: number; mode?: ResponseMode } = {}
): Promise<CommunicationContextMatches> {
  const cleanQuery = query.trim()
  if (!cleanQuery) return { phrasebook: [], knowledge: [] }

  await ensureInitialized()

  const mode = options.mode ?? 'balanced'
  const defaultLimits = mode === 'fast'
    ? { phrase: 1, knowledge: 2 }
    : mode === 'deep'
      ? { phrase: 4, knowledge: 6 }
      : { phrase: 3, knowledge: 4 }
  const phraseLimit = options.phraseLimit ?? defaultLimits.phrase
  const knowledgeLimit = options.knowledgeLimit ?? defaultLimits.knowledge
  const scene = options.scene || '全部'

  const [phrasebookItems, knowledgeItems] = await Promise.all([
    getKnowledgeBase(),
    searchKnowledgeDocuments(cleanQuery, Math.max(knowledgeLimit * 2, 8), scene)
  ])

  const phrasebook = phrasebookItems
    .map(item => toPhrasebookMatch(cleanQuery, item))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, phraseLimit)

  const knowledge = knowledgeItems
    .map(item => toKnowledgeMatch(cleanQuery, item))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, knowledgeLimit)

  return { phrasebook, knowledge }
}

export function formatMatchesForPrompt(matches: CommunicationContextMatches) {
  const sections: string[] = []

  if (matches.phrasebook.length) {
    sections.push([
      '【可直接使用的话术本】',
      ...matches.phrasebook.map((item, index) =>
        `${index + 1}. ${item.keyword}（${item.category}，匹配度${item.score}）：${item.content}`
      )
    ].join('\n'))
  }

  if (matches.knowledge.length) {
    sections.push([
      '【可参考的知识库资料】',
      ...matches.knowledge.map((item, index) =>
        `${index + 1}. ${item.title}（${item.scene}/${item.type}，匹配度${item.score}）：${item.content}`
      )
    ].join('\n'))
  }

  if (!sections.length) return ''

  return `${sections.join('\n\n')}\n\n请优先遵守以上资料。话术本内容可以直接采用或轻微改写；知识库内容只能作为事实依据，不要编造资料里没有的价格、优惠、承诺或关系事实。`
}

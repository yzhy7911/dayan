/**
 * 数据同步工具
 * 支持导出/导入全量数据，用于备份和跨设备迁移
 */

import { db } from './database'
import { historyDB } from './history-storage'
import { contactDB } from './contact-storage'
import { setConfig, CONFIG_KEYS, getAllConfig, getAIConfig } from './storage'
import { StyleLearner } from './style-learning'

export interface ExportData {
  version: string
  exportDate: string
  appVersion: string
  data: {
    config: Record<string, string>
    styleLearning: any[]
    knowledgeBase: any[]
    chatHistory: any[]
    replyHistory: any[]
    contacts: any[]
    contactAnalysis: any[]
    chatRecords: any[]
  }
}

export class DataSync {
  static readonly CURRENT_VERSION = '1.0'

  private static createEmptyDetails(): ImportDetails {
    return {
      config: 0,
      knowledgeBase: 0,
      chatHistory: 0,
      replyHistory: 0,
      contacts: 0,
      contactAnalysis: 0,
      chatRecords: 0,
      styleLearning: false
    }
  }

  /**
   * 导出所有数据
   */
  static async exportAll(): Promise<ExportData> {
    const data: ExportData = {
      version: this.CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      data: {
        config: getAllConfig(),
        styleLearning: StyleLearner.getStyleStats() as any[],
        knowledgeBase: await db.knowledgeBase.toArray(),
        chatHistory: await db.chatHistory.toArray(),
        replyHistory: await historyDB.replyHistory.toArray(),
        contacts: await contactDB.contacts.toArray(),
        contactAnalysis: await contactDB.analysis.toArray(),
        chatRecords: await contactDB.chatRecords.toArray()
      }
    }

    return data
  }

  /**
   * 导出数据为 JSON 文件并下载
   */
  static async exportToFile(): Promise<void> {
    const data = await this.exportAll()
    const jsonStr = JSON.stringify(data, null, 2)

    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const date = new Date().toISOString().slice(0, 10)
    link.setAttribute('download', `搭言数据备份_${date}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * 从 JSON 文件导入数据
   */
  static async importFromFile(file: File): Promise<ImportResult> {
    try {
      const text = await file.text()
      let data: ExportData

      try {
        data = JSON.parse(text)
      } catch (e) {
        return {
          success: false,
          message: 'JSON 格式错误，请检查文件内容',
          details: this.createEmptyDetails()
        }
      }

      if (!data.version || !data.data) {
        return {
          success: false,
          message: '无效的备份文件格式',
          details: this.createEmptyDetails()
        }
      }

      return await this.importData(data)
    } catch (e) {
      console.error('[DataSync] ❌ 导入失败:', e)
      return {
        success: false,
        message: `导入失败: ${(e as Error).message}`,
        details: this.createEmptyDetails()
      }
    }
  }

  /**
   * 导入数据到数据库
   */
  static async importData(data: ExportData): Promise<ImportResult> {
    const details = this.createEmptyDetails()

    const result: ImportResult = {
      success: true,
      message: '数据导入成功',
      details
    }

    try {
      const d = data.data

      // 1. 导入配置
      if (d.config) {
        for (const [key, value] of Object.entries(d.config)) {
          if (Object.values(CONFIG_KEYS).includes(key as any)) {
            setConfig(key, value as string)
            details.config++
          }
        }
        // 同步 AI 配置到主进程
        const aiConfig = getAIConfig()
        if (aiConfig.apiKey) {
          window.electronAPI?.ai?.initConfig?.(aiConfig)
        }
      }

      // 2. 导入风格学习数据
      if (d.styleLearning && Array.isArray(d.styleLearning)) {
        try {
          const learningData = {
            preferences: d.styleLearning,
            totalUsage: d.styleLearning.reduce((sum: number, p: any) => sum + (p.count || 0), 0),
            lastUpdated: Date.now()
          }
          localStorage.setItem('dayan-style-preferences', JSON.stringify(learningData))
          StyleLearner.init()
          details.styleLearning = true
        } catch (e) {
          console.warn('[DataSync] 风格学习数据导入失败:', e)
        }
      }

      // 3. 导入话术库
      if (d.knowledgeBase && Array.isArray(d.knowledgeBase)) {
        const validItems = d.knowledgeBase.filter(
          (item: any) => item && item.keyword && item.content
        ).map((item: any) => ({
          category: item.category || '日常',
          keyword: item.keyword,
          content: item.content,
          createdAt: item.createdAt || Date.now()
        }))

        if (validItems.length > 0) {
          await db.knowledgeBase.bulkAdd(validItems)
          details.knowledgeBase = validItems.length
        }
      }

      // 4. 导入聊天历史
      if (d.chatHistory && Array.isArray(d.chatHistory)) {
        const validItems = d.chatHistory.filter(
          (item: any) => item && item.content
        ).map((item: any) => ({
          content: item.content,
          role: item.role || 'user',
          style: item.style || '',
          timestamp: item.timestamp || Date.now()
        }))

        if (validItems.length > 0) {
          await db.chatHistory.bulkAdd(validItems)
          details.chatHistory = validItems.length
        }
      }

      // 5. 导入回复历史
      if (d.replyHistory && Array.isArray(d.replyHistory)) {
        const validItems = d.replyHistory.filter(
          (item: any) => item && item.inputText && item.replies
        ).map((item: any) => ({
          inputText: item.inputText,
          inputImage: item.inputImage,
          selectedStyle: item.selectedStyle || 'all',
          replies: item.replies,
          isFavorite: item.isFavorite || false,
          createdAt: item.createdAt || Date.now(),
          updatedAt: item.updatedAt || Date.now()
        }))

        if (validItems.length > 0) {
          await historyDB.replyHistory.bulkAdd(validItems)
          details.replyHistory = validItems.length
        }
      }

      // 6. 导入联系人
      if (d.contacts && Array.isArray(d.contacts)) {
        const validItems = d.contacts
          .filter((item: any) => item && item.name)
          .map((item: any) => ({
            name: item.name,
            avatar: item.avatar,
            remark: item.remark || '',
            tags: item.tags || [],
            chatCount: item.chatCount || 0,
            lastChatTime: item.lastChatTime,
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || Date.now()
          }))

        if (validItems.length > 0) {
          await contactDB.contacts.bulkAdd(validItems)
          details.contacts = validItems.length
        }
      }

      // 7. 导入联系人分析
      // 联系人使用自增主键，旧备份里的 contactId 无法可靠映射，直接丢弃关联数据。
      if (d.contactAnalysis && Array.isArray(d.contactAnalysis) && d.contactAnalysis.length > 0) {
        console.warn('[DataSync] 跳过联系人分析导入：旧 contactId 无法安全恢复')
      }

      // 8. 导入聊天记录
      if (d.chatRecords && Array.isArray(d.chatRecords) && d.chatRecords.length > 0) {
        console.warn('[DataSync] 跳过聊天记录导入：旧 contactId 无法安全恢复')
      }

      const totalImported = Object.values(details).reduce(
        (sum, val) => sum + (typeof val === 'number' ? val : 0), 0
      )

      result.message = `数据导入成功，共导入 ${totalImported} 条记录`
      console.log('[DataSync] ✅ 数据导入完成:', result.details)

    } catch (e) {
      console.error('[DataSync] ❌ 导入过程中出错:', e)
      result.success = false
      result.message = `导入过程中出错: ${(e as Error).message}`
    }

    return result
  }

  /**
   * 获取导出数据的大小估算
   */
  static async getExportSizeEstimate(): Promise<string> {
    const data = await this.exportAll()
    const jsonStr = JSON.stringify(data)
    const bytes = new Blob([jsonStr]).size

    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  /**
   * 获取各模块的数据量统计
   */
  static async getDataStats(): Promise<DataStats> {
    return {
      knowledgeBase: await db.knowledgeBase.count(),
      chatHistory: await db.chatHistory.count(),
      replyHistory: await historyDB.replyHistory.count(),
      contacts: await contactDB.contacts.count(),
      contactAnalysis: await contactDB.analysis.count(),
      chatRecords: await contactDB.chatRecords.count()
    }
  }
}

export interface ImportResult {
  success: boolean
  message: string
  details: ImportDetails
}

export interface ImportDetails {
  config: number
  knowledgeBase: number
  chatHistory: number
  replyHistory: number
  contacts: number
  contactAnalysis: number
  chatRecords: number
  styleLearning: boolean
}

export interface DataStats {
  knowledgeBase: number
  chatHistory: number
  replyHistory: number
  contacts: number
  contactAnalysis: number
  chatRecords: number
}

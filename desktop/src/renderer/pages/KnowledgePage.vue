<template>
  <div class="knowledge-page">
    <section class="knowledge-hero surface-panel">
      <div class="hero-copy">
        <p class="hero-kicker">Knowledge Atelier</p>
        <h1 class="hero-title">把高频表达沉淀成一套可检索、可复用、可批量维护的话术资产。</h1>
        <p class="hero-desc">
          这里更像一间安静的内容库。搜索、分类、导入和新增都被收进同一张工作台里，减少来回切换。
        </p>
      </div>

      <div class="hero-stats">
        <div class="hero-stat-card">
          <span class="stat-label">全部话术</span>
          <strong class="stat-value">{{ totalKnowledgeCount }}</strong>
        </div>
        <div class="hero-stat-card">
          <span class="stat-label">当前筛选</span>
          <strong class="stat-value">{{ filteredKnowledge.length }}</strong>
        </div>
        <div class="hero-stat-card">
          <span class="stat-label">当前分类</span>
          <strong class="stat-value">{{ selectedCategory }}</strong>
        </div>
        <div class="hero-stat-card">
          <span class="stat-label">导入策略</span>
          <strong class="stat-value">{{ skipDuplicates ? '跳过重复' : '允许覆盖' }}</strong>
        </div>
      </div>
    </section>

    <section class="control-panel surface-panel">
      <div class="control-head">
        <div>
          <p class="section-kicker">Browse & Curate</p>
          <h2 class="section-title">内容检索与管理</h2>
        </div>
        <div class="action-group">
          <button class="btn btn-secondary" @click="triggerFileImport">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 3v9" />
              <path d="M6.5 8.5 10 12l3.5-3.5" />
              <path d="M3.5 15.5h13" />
            </svg>
            导入话术
          </button>
          <button class="btn btn-secondary" @click="exportKnowledge">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 12V3" />
              <path d="M6.5 6.5 10 3l3.5 3.5" />
              <path d="M3.5 15.5h13" />
            </svg>
            导出资产
          </button>
          <button class="btn btn-primary" @click="openAddModal">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M10 4.5v11" />
              <path d="M4.5 10h11" />
            </svg>
            新建话术
          </button>
        </div>
      </div>

      <div class="search-row">
        <label class="search-field">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m14 14 3 3" />
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索关键词、内容或场景"
            @input="searchKnowledge"
          />
        </label>

        <div class="search-meta">
          <span class="result-chip">{{ filteredKnowledge.length }} 条结果</span>
          <span v-if="searchKeyword" class="result-tip">匹配 “{{ searchKeyword }}”</span>
        </div>
      </div>

      <div class="category-cluster">
        <button
          v-for="cat in categories"
          :key="cat"
          class="category-chip"
          :class="{ active: selectedCategory === cat }"
          @click="handleCategoryChange(cat)"
        >
          <span>{{ cat }}</span>
          <strong>{{ getCategoryCount(cat) }}</strong>
        </button>
      </div>
    </section>

    <section class="library-layout">
      <div class="library-panel surface-panel">
        <div class="panel-head">
          <div>
            <p class="section-kicker">Library</p>
            <h3 class="section-title">话术列表</h3>
          </div>
          <span class="panel-meta">{{ selectedCategory === '全部' ? '全量视图' : `${selectedCategory} 分类` }}</span>
        </div>

        <div v-if="filteredKnowledge.length" class="knowledge-grid">
          <article v-for="item in filteredKnowledge" :key="item.id" class="knowledge-card">
            <div class="knowledge-card-head">
              <div class="keyword-wrap">
                <span class="knowledge-category">{{ item.category }}</span>
                <h4 class="knowledge-keyword">{{ item.keyword }}</h4>
              </div>
              <button class="icon-action danger" @click="handleDeleteKnowledge(item.id!)" title="删除">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4.5 5.5h11" />
                  <path d="M7.5 5.5V4.4c0-.5.4-.9.9-.9h3.2c.5 0 .9.4.9.9v1.1" />
                  <path d="M6.5 7.5v7" />
                  <path d="M10 7.5v7" />
                  <path d="M13.5 7.5v7" />
                  <path d="M5.5 5.5v9.2c0 1 .8 1.8 1.8 1.8h5.4c1 0 1.8-.8 1.8-1.8V5.5" />
                </svg>
              </button>
            </div>

            <p class="knowledge-content">{{ item.content }}</p>

            <div class="knowledge-card-foot">
              <span class="asset-note">适合快速调用的稳定表达</span>
              <button class="card-copy-btn" @click="copyKnowledge(item.content)">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="7" y="7" width="9" height="9" rx="2" />
                  <path d="M5.5 12V6.8c0-1 .8-1.8 1.8-1.8h5.2" />
                </svg>
                复制使用
              </button>
            </div>
          </article>
        </div>

        <div v-else-if="!isLoading" class="empty-state">
          <div class="empty-mark">
            <svg viewBox="0 0 64 64" fill="none">
              <rect x="10" y="12" width="44" height="40" rx="14" fill="rgba(15,118,110,0.12)" />
              <path d="M22 24h20" stroke="#0f766e" stroke-width="2.6" stroke-linecap="round" />
              <path d="M22 32h14" stroke="#0f766e" stroke-width="2.6" stroke-linecap="round" opacity="0.65" />
              <path d="M22 40h10" stroke="#0f766e" stroke-width="2.6" stroke-linecap="round" opacity="0.4" />
            </svg>
          </div>
          <h4 class="empty-title">还没有可展示的话术</h4>
          <p class="empty-text">可以先新建一条，或者通过导入把已有表达整理进来。</p>
          <button class="btn btn-primary" @click="openAddModal">立即添加</button>
        </div>
      </div>

      <aside class="insight-panel surface-panel">
        <div class="panel-head">
          <div>
            <p class="section-kicker">Overview</p>
            <h3 class="section-title">分类概览</h3>
          </div>
        </div>

        <div class="insight-stack">
          <div v-for="item in categoryStats" :key="item.name" class="insight-card">
            <div class="insight-line">
              <span class="insight-name">{{ item.name }}</span>
              <strong class="insight-count">{{ item.count }}</strong>
            </div>
            <div class="insight-bar">
              <span class="insight-fill" :style="{ width: `${getCategoryRatio(item.count)}%` }"></span>
            </div>
          </div>
        </div>

        <div class="insight-note">
          <p class="note-title">维护建议</p>
          <p class="note-text">
            让每条话术只表达一个明确意图，后续检索会更快，也更容易组合成自然回复。
          </p>
        </div>
      </aside>
    </section>

    <input
      ref="fileInputRef"
      type="file"
      accept=".json,.csv,.txt"
      class="hidden-input"
      @change="handleFileImport"
    />

    <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
      <div class="modal-shell surface-panel" @click.stop>
        <div class="modal-header">
          <div>
            <p class="section-kicker">Create Entry</p>
            <h3 class="modal-title">新建话术</h3>
          </div>
          <button class="icon-action" @click="showAddModal = false" title="关闭">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="m5 5 10 10" />
              <path d="M15 5 5 15" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">关键词</label>
            <input
              v-model="newKnowledge.keyword"
              class="form-input"
              placeholder="例如：加班回复"
              type="text"
            />
          </div>

          <div class="form-group">
            <label class="form-label">分类</label>
            <select v-model="newKnowledge.category" class="form-select">
              <option v-for="cat in categories.filter(c => c !== '全部')" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">话术内容</label>
            <textarea
              v-model="newKnowledge.content"
              class="form-textarea"
              placeholder="输入这条表达的完整内容"
              rows="5"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddModal = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!isFormValid"
            @click="handleAddKnowledge"
          >
            确认添加
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-shell modal-compact surface-panel" @click.stop>
        <div class="modal-header">
          <div>
            <p class="section-kicker">Confirm</p>
            <h3 class="modal-title">删除这条话术</h3>
          </div>
          <button class="icon-action" @click="showDeleteModal = false" title="关闭">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="m5 5 10 10" />
              <path d="M15 5 5 15" />
            </svg>
          </button>
        </div>
        <p class="delete-text">删除后不可恢复。如果这条话术仍可能复用，建议先导出再清理。</p>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal-shell modal-wide surface-panel" @click.stop>
        <div class="modal-header">
          <div>
            <p class="section-kicker">Import Assets</p>
            <h3 class="modal-title">导入话术资产</h3>
          </div>
          <button class="icon-action" @click="showImportModal = false" title="关闭">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="m5 5 10 10" />
              <path d="M15 5 5 15" />
            </svg>
          </button>
        </div>

        <div v-if="importPreview.length === 0" class="import-empty">
          <div class="import-empty-card">
            <p class="empty-title small">选择 JSON 或 CSV 文件导入现有话术。</p>
            <p class="empty-text compact">如果你还没有模板，可以先下载 CSV 示例再整理内容。</p>
            <div class="modal-footer left">
              <button class="btn btn-secondary" @click="downloadTemplate">下载 CSV 模板</button>
              <button class="btn btn-primary" @click="triggerFileImport">选择文件</button>
            </div>
          </div>

          <div class="format-grid">
            <div class="format-card">
              <span class="format-title">JSON 示例</span>
              <pre class="import-format">{
  "items": [
    {
      "category": "工作",
      "keyword": "关键词",
      "content": "话术内容"
    }
  ]
}</pre>
            </div>
            <div class="format-card">
              <span class="format-title">CSV 示例</span>
              <pre class="import-format">category,keyword,content
工作,加班回复,今天晚上有点事，可能需要加一会儿班
日常,问候,你好呀！最近怎么样？</pre>
            </div>
          </div>
        </div>

        <div v-else class="import-preview">
          <div class="preview-head">
            <div>
              <span class="preview-count">检测到 {{ importPreview.length }} 条可导入话术</span>
              <p class="preview-tip">导入前会保留分类信息，并按你的策略处理重复关键词。</p>
            </div>
            <label class="check-line">
              <input v-model="skipDuplicates" type="checkbox" />
              <span>跳过重复关键词</span>
            </label>
          </div>

          <div class="preview-list">
            <div v-for="(item, index) in importPreview.slice(0, 8)" :key="index" class="preview-item">
              <span class="knowledge-category">{{ item.category }}</span>
              <strong class="preview-keyword">{{ item.keyword }}</strong>
              <p class="preview-content">{{ item.content }}</p>
            </div>
          </div>

          <p v-if="importPreview.length > 8" class="preview-more">
            还有 {{ importPreview.length - 8 }} 条内容将在确认后一并导入。
          </p>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
            <button class="btn btn-primary" @click="confirmImport">确认导入</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

// 组件名称，用于 keep-alive 缓存
defineOptions({ name: 'Knowledge' })

import {
  addKnowledge as addKnowledgeDB,
  bulkAddKnowledge,
  deleteKnowledge as deleteKnowledgeDB,
  getKnowledgeBase,
  initDatabase,
  searchKnowledge as searchKnowledgeDB
} from '../utils/storage'
import { useToast } from '../composables/useToast'

interface KnowledgeItem {
  id?: number
  category: string
  keyword: string
  content: string
  createdAt: number
}

const toast = useToast()
const searchKeyword = ref('')
const selectedCategory = ref('全部')
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const showImportModal = ref(false)
const deletingId = ref<number | null>(null)
const knowledge = ref<KnowledgeItem[]>([])
const isLoading = ref(true)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importPreview = ref<Array<{ category: string; keyword: string; content: string }>>([])
const skipDuplicates = ref(true)

const newKnowledge = ref({
  keyword: '',
  category: '工作',
  content: ''
})

const categories = ['全部', '工作', '情感', '商务', '日常']

const filteredKnowledge = computed(() => {
  let result = knowledge.value

  if (selectedCategory.value !== '全部') {
    result = result.filter(item => item.category === selectedCategory.value)
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item =>
      item.keyword.toLowerCase().includes(keyword) ||
      item.content.toLowerCase().includes(keyword)
    )
  }

  return result
})

const totalKnowledgeCount = computed(() => knowledge.value.length)

const categoryStats = computed(() =>
  categories
    .filter(category => category !== '全部')
    .map(category => ({
      name: category,
      count: knowledge.value.filter(item => item.category === category).length
    }))
)

const isFormValid = computed(() => {
  return newKnowledge.value.keyword.trim() && newKnowledge.value.content.trim()
})

const getCategoryCount = (category: string) => {
  if (category === '全部') {
    return knowledge.value.length
  }

  return knowledge.value.filter(item => item.category === category).length
}

const getCategoryRatio = (count: number) => {
  if (!knowledge.value.length) {
    return 0
  }

  return Math.max(10, Math.round((count / knowledge.value.length) * 100))
}

onMounted(async () => {
  try {
    await initDatabase()
    const data = await getKnowledgeBase()
    knowledge.value = data
    console.log('[Knowledge] ✅ 话术库加载完成，共', data.length, '条')
  } catch (error) {
    console.error('[Knowledge] ❌ 话术库加载失败:', error)
    toast.error('话术库加载失败')
  } finally {
    isLoading.value = false
  }
})

const searchKnowledge = async () => {
  if (!searchKeyword.value.trim()) {
    const data = await getKnowledgeBase()
    knowledge.value = data
    return
  }

  const results = await searchKnowledgeDB(searchKeyword.value)
  knowledge.value = results
}

const handleCategoryChange = async (category: string) => {
  selectedCategory.value = category
  searchKeyword.value = ''

  const data = await getKnowledgeBase()
  if (category === '全部') {
    knowledge.value = data
  } else {
    knowledge.value = data.filter(item => item.category === category)
  }
}

const copyKnowledge = async (content: string) => {
  await window.electronAPI?.clipboard?.setText?.(content)
  toast.success('已复制到剪贴板')
}

const openAddModal = () => {
  newKnowledge.value = { keyword: '', category: '工作', content: '' }
  showAddModal.value = true
}

const handleAddKnowledge = async () => {
  if (!isFormValid.value) return

  try {
    await addKnowledgeDB(newKnowledge.value)
    const data = await getKnowledgeBase()
    knowledge.value = data
    showAddModal.value = false
    toast.success('话术添加成功')
    console.log('[Knowledge] ✅ 添加话术成功')
  } catch (error) {
    console.error('[Knowledge] ❌ 添加话术失败:', error)
    toast.error('添加失败，请重试')
  }
}

const handleDeleteKnowledge = (id: number) => {
  deletingId.value = id
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!deletingId.value) return

  try {
    await deleteKnowledgeDB(deletingId.value)
    knowledge.value = knowledge.value.filter(item => item.id !== deletingId.value)
    toast.success('话术已删除')
    console.log('[Knowledge] ✅ 删除话术成功')
  } catch (error) {
    console.error('[Knowledge] ❌ 删除话术失败:', error)
    toast.error('删除失败，请重试')
  } finally {
    showDeleteModal.value = false
    deletingId.value = null
  }
}

const triggerFileImport = () => {
  showImportModal.value = true
  importPreview.value = []
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const parseCSV = (text: string): Array<{ category: string; keyword: string; content: string }> => {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase())
  const categoryIndex = headers.indexOf('category')
  const keywordIndex = headers.indexOf('keyword')
  const contentIndex = headers.indexOf('content')

  if (categoryIndex === -1 || keywordIndex === -1 || contentIndex === -1) {
    const items: Array<{ category: string; keyword: string; content: string }> = []
    for (const line of lines) {
      const parts = line.split(',')
      if (parts.length >= 3) {
        items.push({
          category: parts[0].trim(),
          keyword: parts[1].trim(),
          content: parts.slice(2).join(',').trim()
        })
      }
    }
    return items
  }

  const items: Array<{ category: string; keyword: string; content: string }> = []
  for (let index = 1; index < lines.length; index++) {
    const parts = lines[index].split(',')
    if (parts.length > Math.max(categoryIndex, keywordIndex, contentIndex)) {
      items.push({
        category: parts[categoryIndex]?.trim() || '',
        keyword: parts[keywordIndex]?.trim() || '',
        content: parts.slice(contentIndex).join(',').trim()
      })
    }
  }

  return items
}

const downloadTemplate = () => {
  const csvContent = `category,keyword,content
工作,加班回复,今天晚上有点事，可能需要加一会儿班
日常,问候,你好呀！最近怎么样？
情感,安慰,别难过，一切都会好起来的
商务,感谢,非常感谢您的帮助！`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '话术导入模板.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  toast.success('模板已下载')
}

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    let items: Array<{ category: string; keyword: string; content: string }> = []
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.csv')) {
      items = parseCSV(text)
    } else {
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        toast.error('JSON 格式错误，请检查文件内容')
        return
      }

      if (Array.isArray(data)) {
        items = data
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data
      } else {
        toast.error('未找到可导入的话术数据')
        return
      }
    }

    const validItems = items.filter(item =>
      item && typeof item === 'object' &&
      typeof item.keyword === 'string' &&
      typeof item.content === 'string' &&
      item.keyword.trim() &&
      item.content.trim()
    )

    if (validItems.length === 0) {
      toast.error('没有找到有效的话术数据')
      return
    }

    validItems.forEach(item => {
      if (!item.category || !categories.includes(item.category)) {
        item.category = '日常'
      }
    })

    importPreview.value = validItems
    toast.success(`检测到 ${validItems.length} 条有效话术`)
  } catch (error) {
    console.error('[Knowledge] ❌ 解析导入文件失败:', error)
    toast.error('文件解析失败，请重试')
  } finally {
    target.value = ''
  }
}

const confirmImport = async () => {
  if (importPreview.value.length === 0) return

  try {
    let itemsToImport = [...importPreview.value]

    if (skipDuplicates.value) {
      const existingKeywords = new Set(knowledge.value.map(item => item.keyword))
      const originalLength = itemsToImport.length
      itemsToImport = itemsToImport.filter(item => !existingKeywords.has(item.keyword))
      const skippedCount = originalLength - itemsToImport.length
      if (skippedCount > 0) {
        toast.info(`已跳过 ${skippedCount} 条重复话术`)
      }
    }

    if (itemsToImport.length === 0) {
      toast.warning('没有可导入的话术')
      showImportModal.value = false
      return
    }

    await bulkAddKnowledge(itemsToImport)
    const data = await getKnowledgeBase()
    knowledge.value = data
    toast.success(`成功导入 ${itemsToImport.length} 条话术`)
    console.log('[Knowledge] ✅ 批量导入话术成功，共', itemsToImport.length, '条')
  } catch (error) {
    console.error('[Knowledge] ❌ 批量导入失败:', error)
    toast.error('导入失败，请重试')
  } finally {
    showImportModal.value = false
    importPreview.value = []
  }
}

const exportKnowledge = () => {
  if (knowledge.value.length === 0) {
    toast.warning('没有可导出的话术')
    return
  }

  try {
    const exportData = knowledge.value.map(item => ({
      category: item.category,
      keyword: item.keyword,
      content: item.content
    }))

    const jsonStr = JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      count: exportData.length,
      items: exportData
    }, null, 2)

    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `话术库_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`成功导出 ${exportData.length} 条话术`)
    console.log('[Knowledge] ✅ 导出话术成功，共', exportData.length, '条')
  } catch (error) {
    console.error('[Knowledge] ❌ 导出话术失败:', error)
    toast.error('导出失败，请重试')
  }
}
</script>

<style scoped>
.knowledge-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeIn 0.28s ease;
}

.knowledge-hero,
.control-panel,
.library-panel,
.insight-panel {
  padding: var(--space-5);
}

.knowledge-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.95fr);
  gap: var(--space-4);
  background:
    radial-gradient(circle at top right, rgba(47, 107, 102, 0.14), transparent 30%),
    radial-gradient(circle at bottom left, rgba(179, 138, 99, 0.14), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 243, 237, 0.9) 100%);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hero-kicker,
.section-kicker {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.hero-title,
.section-title,
.modal-title {
  font-size: var(--font-xl);
  line-height: 1.32;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-desc {
  max-width: 560px;
  font-size: var(--font-md);
  line-height: 1.7;
  color: var(--text-secondary);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.hero-stat-card,
.insight-card {
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.58);
}

.stat-label,
.asset-note,
.preview-tip,
.empty-text,
.note-text {
  font-size: var(--font-sm);
  line-height: 1.55;
  color: var(--text-secondary);
}

.stat-value {
  display: block;
  margin-top: 6px;
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.control-head,
.panel-head,
.modal-header,
.knowledge-card-head,
.knowledge-card-foot,
.preview-head,
.insight-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.action-group .btn {
  min-width: 116px;
}

.search-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.search-field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 46px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}

.search-field:focus-within {
  border-color: rgba(47, 107, 102, 0.3);
  box-shadow: 0 0 0 4px rgba(47, 107, 102, 0.12);
  background: rgba(255, 255, 255, 0.9);
}

.search-field svg {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-field input {
  width: 100%;
  background: transparent;
  font-size: var(--font-md);
  color: var(--text-primary);
}

.search-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.result-chip,
.panel-meta {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-secondary);
}

.result-tip {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.category-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 0 14px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(72, 57, 41, 0.1);
  color: var(--text-secondary);
  transition: all var(--transition);
}

.category-chip strong {
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.category-chip:hover {
  border-color: rgba(47, 107, 102, 0.24);
  color: var(--text-primary);
}

.category-chip.active {
  background: linear-gradient(135deg, rgba(47, 107, 102, 0.94) 0%, rgba(34, 77, 89, 0.94) 100%);
  border-color: transparent;
  color: var(--text-inverse);
  box-shadow: 0 18px 36px rgba(15, 118, 110, 0.18);
}

.category-chip.active strong {
  color: var(--text-inverse);
}

.library-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.82fr);
  gap: var(--space-4);
  min-height: 0;
}

.library-panel,
.insight-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.knowledge-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.knowledge-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 220px;
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(248, 242, 234, 0.72) 100%);
  border: 1px solid rgba(255, 255, 255, 0.58);
  transition: transform var(--transition), box-shadow var(--transition);
}

.knowledge-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.keyword-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.knowledge-category {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: 24px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  background: var(--primary-bg);
  color: var(--primary-dark);
  font-size: var(--font-xs);
  font-weight: 700;
}

.knowledge-keyword {
  font-size: var(--font-lg);
  line-height: 1.35;
  font-weight: 700;
  color: var(--text-primary);
}

.knowledge-content {
  flex: 1;
  font-size: var(--font-md);
  line-height: 1.72;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.knowledge-card-foot {
  align-items: center;
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-light);
}

.card-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
  width: auto;
  min-width: 0;
  min-height: 32px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: all var(--transition);
}

.card-copy-btn:hover {
  color: var(--text-primary);
  background: var(--surface-control);
  border-color: var(--border-strong);
}

.card-copy-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.icon-action {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(72, 57, 41, 0.1);
  color: var(--text-tertiary);
  transition: all var(--transition);
  flex-shrink: 0;
}

.icon-action svg {
  width: 16px;
  height: 16px;
}

.icon-action:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
  background: rgba(255, 255, 255, 0.94);
}

.icon-action.danger:hover {
  color: var(--error);
  border-color: rgba(180, 35, 24, 0.18);
  background: rgba(180, 35, 24, 0.08);
}

.insight-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.insight-name,
.insight-count,
.note-title,
.preview-keyword {
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--text-primary);
}

.insight-bar {
  width: 100%;
  height: 8px;
  margin-top: var(--space-3);
  border-radius: var(--radius-full);
  overflow: hidden;
  background: rgba(72, 57, 41, 0.08);
}

.insight-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
}

.insight-note {
  margin-top: auto;
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.54);
}

.note-title {
  margin-bottom: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-5);
}

.empty-mark {
  width: 80px;
  height: 80px;
}

.empty-mark svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.empty-title.small {
  font-size: var(--font-md);
}

.empty-text.compact {
  max-width: 420px;
}

.hidden-input {
  display: none;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: rgba(17, 14, 12, 0.36);
  backdrop-filter: blur(8px);
  z-index: 1100;
  animation: fadeIn 0.22s ease;
}

.modal-shell {
  width: min(560px, 100%);
  max-height: min(84vh, 820px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  overflow-y: auto;
}

.modal-shell.modal-wide {
  width: min(760px, 100%);
}

.modal-shell.modal-compact {
  width: min(420px, 100%);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: var(--font-md);
  transition: all var(--transition);
}

.form-textarea {
  min-height: 132px;
  resize: vertical;
  line-height: 1.7;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: rgba(47, 107, 102, 0.3);
  box-shadow: 0 0 0 4px rgba(47, 107, 102, 0.12);
  background: rgba(255, 255, 255, 0.92);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.modal-footer.left {
  justify-content: flex-start;
}

.btn-danger {
  background: linear-gradient(135deg, #c25a4f 0%, #9d3c34 100%);
  color: var(--text-inverse);
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 32px rgba(157, 60, 52, 0.22);
}

.delete-text {
  font-size: var(--font-md);
  line-height: 1.7;
  color: var(--text-secondary);
}

.import-empty,
.import-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.import-empty-card {
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.52);
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.format-card {
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.52);
}

.format-title,
.preview-count {
  display: block;
  margin-bottom: var(--space-3);
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--text-primary);
}

.import-format {
  margin: 0;
  white-space: pre-wrap;
  font-size: var(--font-sm);
  line-height: 1.7;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', monospace;
}

.check-line {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 34px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(72, 57, 41, 0.08);
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

.check-line input {
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
}

.preview-list {
  display: grid;
  gap: var(--space-3);
}

.preview-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.54);
}

.preview-content,
.preview-more {
  font-size: var(--font-sm);
  line-height: 1.6;
  color: var(--text-secondary);
}

:global(.dark-theme) .knowledge-hero {
  background:
    radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 30%),
    radial-gradient(circle at bottom left, rgba(179, 138, 99, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(39, 32, 27, 0.96) 0%, rgba(25, 20, 17, 0.94) 100%);
}

:global(.dark-theme) .hero-stat-card,
:global(.dark-theme) .search-field,
:global(.dark-theme) .category-chip,
:global(.dark-theme) .knowledge-card,
:global(.dark-theme) .insight-card,
:global(.dark-theme) .insight-note,
:global(.dark-theme) .icon-action,
:global(.dark-theme) .modal-shell,
:global(.dark-theme) .form-input,
:global(.dark-theme) .form-select,
:global(.dark-theme) .form-textarea,
:global(.dark-theme) .format-card,
:global(.dark-theme) .import-empty-card,
:global(.dark-theme) .preview-item,
:global(.dark-theme) .check-line,
:global(.dark-theme) .result-chip,
:global(.dark-theme) .panel-meta {
  background: rgba(255, 255, 255, 0.05);
}

:global(.dark-theme) .knowledge-category {
  background: rgba(45, 212, 191, 0.12);
}

:global(.dark-theme) .category-chip.active {
  background: linear-gradient(135deg, rgba(45, 212, 191, 0.9) 0%, rgba(26, 71, 84, 0.96) 100%);
}

@media (max-width: 1180px) {
  .knowledge-hero,
  .library-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .insight-panel {
    order: -1;
  }
}

@media (max-width: 860px) {
  .hero-stats,
  .knowledge-grid,
  .format-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .search-row,
  .control-head,
  .preview-head {
    flex-direction: column;
    align-items: stretch;
  }

  .knowledge-card-foot {
    flex-direction: row;
    align-items: center;
  }

  .action-group,
  .modal-footer {
    width: 100%;
  }

  .action-group .btn,
  .modal-footer .btn {
    flex: 1;
  }

  .card-copy-btn {
    flex: 0 0 auto;
    width: auto;
  }
}
</style>

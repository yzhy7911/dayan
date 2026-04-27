<template>
  <div class="knowledge-page">
    <div class="search-section">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索话术..."
          @input="searchKnowledge"
        />
      </div>
      <button class="import-btn" @click="triggerFileImport">
        📥 导入话术
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json,.txt"
        style="display: none"
        @change="handleFileImport"
      />
    </div>

    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat"
        class="category-tab"
        :class="{ active: selectedCategory === cat }"
        @click="handleCategoryChange(cat)"
      >
        {{ cat }}
      </button>
    </div>

    <div class="knowledge-list">
      <div v-for="item in filteredKnowledge" :key="item.id" class="knowledge-card">
        <div class="knowledge-header">
          <span class="knowledge-keyword">{{ item.keyword }}</span>
          <div class="header-actions">
            <span class="knowledge-category">{{ item.category }}</span>
            <button class="delete-btn" @click="handleDeleteKnowledge(item.id!)" title="删除">
              🗑️
            </button>
          </div>
        </div>
        <div class="knowledge-content">{{ item.content }}</div>
        <button class="copy-btn" @click="copyKnowledge(item.content)">📋 复制使用</button>
      </div>

      <div v-if="filteredKnowledge.length === 0 && !isLoading" class="empty-state">
        <div class="empty-icon">📚</div>
        <p class="empty-text">暂无话术，点击右下角添加</p>
      </div>
    </div>

    <button class="add-btn" @click="openAddModal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>

    <!-- 添加话术弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">✨ 添加话术</h3>
          <button class="close-btn" @click="showAddModal = false">✕</button>
        </div>

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
            placeholder="输入话术内容..."
            rows="4"
          ></textarea>
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

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-content modal-small" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">⚠️ 确认删除</h3>
          <button class="close-btn" @click="showDeleteModal = false">✕</button>
        </div>
        <p class="delete-text">确定要删除这条话术吗？此操作无法撤销。</p>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 导入确认弹窗 -->
    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">📥 导入话术</h3>
          <button class="close-btn" @click="showImportModal = false">✕</button>
        </div>

        <div v-if="importPreview.length === 0" class="import-empty">
          <p>请选择 JSON 文件导入话术</p>
          <p class="import-hint">格式示例：</p>
          <pre class="import-format">
{
  "items": [
    {
      "category": "工作",
      "keyword": "关键词",
      "content": "话术内容"
    }
  ]
}</pre>
        </div>

        <div v-else class="import-preview">
          <p class="import-count">检测到 {{ importPreview.length }} 条话术</p>
          <div class="import-list">
            <div v-for="(item, index) in importPreview.slice(0, 5)" :key="index" class="import-item">
              <span class="import-category">{{ item.category }}</span>
              <span class="import-keyword">{{ item.keyword }}</span>
            </div>
            <p v-if="importPreview.length > 5" class="import-more">还有 {{ importPreview.length - 5 }} 条...</p>
          </div>

          <div class="import-options">
            <label class="import-option-label">
              <input v-model="skipDuplicates" type="checkbox" />
              跳过重复的关键词
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
          <button
            v-if="importPreview.length > 0"
            class="btn btn-primary"
            @click="confirmImport"
          >
            确认导入
          </button>
          <button
            v-else
            class="btn btn-primary"
            @click="triggerFileImport"
          >
            选择文件
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getKnowledgeBase,
  searchKnowledge as searchKnowledgeDB,
  addKnowledge as addKnowledgeDB,
  deleteKnowledge as deleteKnowledgeDB,
  bulkAddKnowledge,
  initDatabase
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

const isFormValid = computed(() => {
  return newKnowledge.value.keyword.trim() && newKnowledge.value.content.trim()
})

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

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    let data: any

    try {
      data = JSON.parse(text)
    } catch (e) {
      toast.error('JSON 格式错误，请检查文件内容')
      return
    }

    let items: Array<{ category: string; keyword: string; content: string }> = []

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

    // 验证每条数据格式
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

    // 设置默认分类
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
    if (target) {
      target.value = ''
    }
  }
}

const confirmImport = async () => {
  if (importPreview.value.length === 0) return

  try {
    let itemsToImport = [...importPreview.value]

    // 如果需要跳过重复
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
</script>

<style scoped>
.knowledge-page {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-4);
}

/* 搜索区域 */
.search-section {
  margin-bottom: var(--space-4);
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.search-box:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.search-box svg {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  background: transparent;
  font-size: var(--font-md);
  color: var(--text-primary);
  border: none;
  outline: none;
}

.search-box input::placeholder {
  color: var(--text-placeholder);
}

.import-btn {
  padding: var(--space-2) var(--space-3);
  background: var(--secondary-bg);
  color: var(--secondary-dark);
  border: 1px solid var(--secondary);
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition);
}

.import-btn:hover {
  background: var(--secondary);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  overflow-x: auto;
  padding-bottom: 4px;
}

.category-tab {
  padding: 6px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  transition: all var(--transition);
  cursor: pointer;
  font-weight: 500;
}

.category-tab:hover:not(.active) {
  border-color: var(--primary);
  color: var(--primary);
}

.category-tab.active {
  background: var(--primary-gradient);
  border-color: transparent;
  color: white;
  box-shadow: var(--shadow-sm);
}

/* 话术列表 */
.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: 80px;
}

.knowledge-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-slow);
}

.knowledge-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.knowledge-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.knowledge-keyword {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.knowledge-category {
  padding: 2px 10px;
  background: var(--primary-bg);
  color: var(--primary-dark);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 500;
}

.delete-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--error-bg);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  cursor: pointer;
  transition: all var(--transition);
}

.delete-btn:hover {
  background: var(--error);
  color: white;
  transform: scale(1.1);
}

.knowledge-content {
  font-size: var(--font-sm);
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--primary-bg);
  color: var(--primary-dark);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.copy-btn:hover {
  background: var(--primary-gradient);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* 添加按钮 */
.add-btn {
  position: fixed;
  right: 24px;
  bottom: 80px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 50%;
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  transition: all var(--transition);
  z-index: 10;
}

.add-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.add-btn svg {
  width: 24px;
  height: 24px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-3);
  opacity: 0.6;
}

.empty-text {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
  margin: 0;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  width: 90%;
  max-width: 360px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.modal-small {
  max-width: 300px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}

.modal-title {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 50%;
  font-size: var(--font-sm);
  cursor: pointer;
  transition: all var(--transition);
}

.close-btn:hover {
  background: var(--border-color);
  transform: rotate(90deg);
}

/* 表单 */
.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  color: var(--text-primary);
  outline: none;
  box-sizing: border-box;
  transition: all var(--transition);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
  background: var(--bg-primary);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--text-placeholder);
}

.form-textarea {
  resize: none;
  min-height: 100px;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.btn {
  flex: 1;
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-danger {
  background: var(--error);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
  box-shadow: var(--shadow-md);
}

.delete-text {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 var(--space-5);
  line-height: 1.6;
}

/* 导入弹窗 */
.import-empty {
  text-align: center;
  padding: var(--space-4) 0;
}

.import-empty p {
  margin: 0 0 var(--space-3);
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

.import-hint {
  font-size: var(--font-xs) !important;
  color: var(--text-tertiary) !important;
}

.import-format {
  text-align: left;
  background: var(--bg-tertiary);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  color: var(--text-secondary);
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  font-family: 'SF Mono', 'Monaco', monospace;
}

.import-preview {
  padding: var(--space-2) 0;
}

.import-count {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 var(--space-4);
}

.import-list {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  max-height: 200px;
  overflow-y: auto;
}

.import-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 0;
  font-size: var(--font-sm);
}

.import-category {
  padding: 2px 10px;
  background: var(--primary-bg);
  color: var(--primary-dark);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 500;
}

.import-keyword {
  color: var(--text-primary);
  flex: 1;
}

.import-more {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin: var(--space-2) 0 0;
  text-align: center;
}

.import-options {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-light);
}

.import-option-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.import-option-label input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
}
</style>

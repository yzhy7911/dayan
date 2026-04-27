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
    </div>

    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat"
        class="category-tab"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <div class="knowledge-list">
      <div v-for="item in filteredKnowledge" :key="item.id" class="knowledge-card">
        <div class="knowledge-header">
          <span class="knowledge-keyword">{{ item.keyword }}</span>
          <span class="knowledge-category">{{ item.category }}</span>
        </div>
        <div class="knowledge-content">{{ item.content }}</div>
        <button class="copy-btn" @click="copyKnowledge(item.content)">复制使用</button>
      </div>
    </div>

    <button class="add-btn" @click="showAddModal = true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      添加话术
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  getKnowledgeBase, 
  searchKnowledge as searchKnowledgeDB,
  addKnowledge as addKnowledgeDB,
  deleteKnowledge as deleteKnowledgeDB,
  initDatabase
} from '../utils/storage'

interface KnowledgeItem {
  id?: number
  category: string
  keyword: string
  content: string
  createdAt: number
}

const searchKeyword = ref('')
const selectedCategory = ref('全部')
const showAddModal = ref(false)
const knowledge = ref<KnowledgeItem[]>([])
const isLoading = ref(true)

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

onMounted(async () => {
  try {
    await initDatabase()
    const data = await getKnowledgeBase()
    knowledge.value = data
    console.log('[Knowledge] ✅ 话术库加载完成，共', data.length, '条')
  } catch (error) {
    console.error('[Knowledge] ❌ 话术库加载失败:', error)
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
}

const handleAddKnowledge = async (item: Omit<KnowledgeItem, 'id' | 'createdAt'>) => {
  try {
    await addKnowledgeDB(item)
    const data = await getKnowledgeBase()
    knowledge.value = data
    showAddModal.value = false
    console.log('[Knowledge] ✅ 添加话术成功')
  } catch (error) {
    console.error('[Knowledge] ❌ 添加话术失败:', error)
  }
}

const handleDeleteKnowledge = async (id: number) => {
  try {
    await deleteKnowledgeDB(id)
    knowledge.value = knowledge.value.filter(item => item.id !== id)
    console.log('[Knowledge] ✅ 删除话术成功')
  } catch (error) {
    console.error('[Knowledge] ❌ 删除话术失败:', error)
  }
}
</script>

<style scoped>
.knowledge-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.search-section {
  margin-bottom: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
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
  font-size: 14px;
  color: var(--text-primary);
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.category-tab {
  padding: 6px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: var(--transition);
}

.category-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 80px;
}

.knowledge-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 14px;
}

.knowledge-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.knowledge-keyword {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.knowledge-category {
  padding: 2px 8px;
  background: var(--primary-bg);
  color: var(--primary);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.knowledge-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.copy-btn {
  padding: 6px 12px;
  background: var(--primary-bg);
  color: var(--primary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
}

.add-btn {
  position: fixed;
  right: 24px;
  bottom: 80px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  border-radius: 50%;
  box-shadow: var(--shadow-lg);
}

.add-btn svg {
  width: 24px;
  height: 24px;
}
</style>

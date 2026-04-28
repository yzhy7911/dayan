<template>
  <div class="history-page">
    <div class="section header-section">
      <div class="header-left">
        <h3 class="section-title">📜 历史记录</h3>
      </div>
      <div class="header-right">
        <button
          class="filter-btn"
          :class="{ active: showFavorites }"
          @click="toggleShowFavorites"
        >
          ⭐ 收藏
        </button>
        <input
          v-model="searchKeyword"
          type="text"
          class="search-input"
          placeholder="搜索历史记录..."
        />
        <button class="clear-btn" @click="clearAllHistory" v-if="!showFavorites">
          🗑️ 清空
        </button>
      </div>
    </div>

    <div v-if="historyList.length === 0" class="section empty-section">
      <div class="empty-tip">
        <span class="tip-icon">📭</span>
        <p class="tip-text">{{ showFavorites ? '还没有收藏任何回复' : '还没有历史记录' }}</p>
      </div>
    </div>

    <div v-else class="history-list">
      <div
        v-for="item in historyList"
        :key="item.id"
        class="section history-item"
      >
        <div class="history-header">
          <div class="header-left">
            <span class="history-time">{{ formatTime(item.createdAt) }}</span>
            <span class="style-tag">{{ getStyleLabel(item.selectedStyle) }}</span>
          </div>
          <div class="header-right">
            <button
              class="icon-btn"
              :class="{ active: item.isFavorite }"
              @click="toggleFavorite(item.id!)"
              :title="item.isFavorite ? '取消收藏' : '收藏'"
            >
              {{ item.isFavorite ? '⭐' : '☆' }}
            </button>
            <button
              class="icon-btn delete-btn"
              @click="deleteHistory(item.id!)"
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>

        <div v-if="item.inputText" class="history-input">
          <span class="input-label">输入:</span>
          <p class="input-text">{{ item.inputText }}</p>
        </div>

        <div v-if="item.inputImage" class="image-preview">
          <img :src="item.inputImage" class="preview-image" alt="历史图片" />
        </div>

        <div class="history-replies">
          <div
            v-for="(reply, idx) in item.replies"
            :key="idx"
            class="reply-item"
          >
            <div class="reply-top">
              <span class="reply-style">{{ getStyleLabel(reply.style) }}</span>
            </div>
            <p class="reply-text">{{ reply.reply }}</p>
            <div class="reply-actions">
              <button class="small-btn" @click="copyReply(reply.reply)">
                📋 复制
              </button>
              <button class="small-btn primary" @click="useReply(reply.reply)">
                🚀 复用
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { HistoryStorage, ReplyHistory } from '../utils/history-storage'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()

const allHistory = ref<ReplyHistory[]>([])
const showFavorites = ref(false)
const searchKeyword = ref('')

const historyList = computed(() => {
  let list = showFavorites.value
    ? allHistory.value.filter(h => h.isFavorite)
    : allHistory.value

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter(h =>
      h.inputText.toLowerCase().includes(keyword) ||
      h.replies.some(r => r.reply.toLowerCase().includes(keyword))
    )
  }

  return list
})

const styles = [
  { value: 'all', label: '✨ 全部风格' },
  { value: 'friendly', label: '💬 友好' },
  { value: 'formal', label: '💼 正式' },
  { value: 'humorous', label: '😄 幽默' },
  { value: 'concise', label: '⚡ 简洁' },
  { value: 'empathetic', label: '💝 共情' }
]

const getStyleLabel = (style: string): string => {
  const styleMap: Record<string, string> = {
    all: '✨ 全部风格',
    friendly: '💬 友好',
    formal: '💼 正式',
    humorous: '😄 幽默',
    concise: '⚡ 简洁',
    empathetic: '💝 共情'
  }
  return styleMap[style] || '✨ 默认'
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadHistory = async () => {
  try {
    if (showFavorites.value) {
      allHistory.value = await HistoryStorage.getFavorites(100)
    } else {
      allHistory.value = await HistoryStorage.getHistory(100)
    }
  } catch (e) {
    console.error('[History] 加载历史记录失败:', e)
  }
}

const toggleShowFavorites = () => {
  showFavorites.value = !showFavorites.value
  loadHistory()
}

const toggleFavorite = async (id: number) => {
  try {
    await HistoryStorage.toggleFavorite(id)
    toast.success('已更新收藏状态')
    await loadHistory()
  } catch (e) {
    console.error('[History] 收藏失败:', e)
    toast.error('操作失败')
  }
}

const deleteHistory = async (id: number) => {
  if (!confirm('确定要删除这条记录吗？')) return

  try {
    await HistoryStorage.deleteHistory(id)
    toast.success('已删除')
    await loadHistory()
  } catch (e) {
    console.error('[History] 删除失败:', e)
    toast.error('删除失败')
  }
}

const clearAllHistory = async () => {
  if (!confirm('确定要清空所有历史记录吗？此操作不可恢复。')) return

  try {
    await HistoryStorage.clearAll()
    toast.success('已清空所有历史记录')
    await loadHistory()
  } catch (e) {
    console.error('[History] 清空失败:', e)
    toast.error('清空失败')
  }
}

const copyReply = async (reply: string) => {
  try {
    await window.electronAPI?.clipboard?.setText?.(reply)
    toast.success('已复制到剪贴板')
  } catch (e) {
    console.error('[History] 复制失败:', e)
    toast.error('复制失败')
  }
}

const useReply = (reply: string) => {
  // 将回复传递给回复页面，或者直接复制使用
  copyReply(reply)
  toast.success('已复制，可直接粘贴到微信')
}

onMounted(() => {
  HistoryStorage.init()
  loadHistory()
})
</script>

<style scoped>
.history-page {
  min-height: 100%;
  padding: var(--space-4);
  background: var(--bg-secondary);
  transition: background var(--transition);
}

.section {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.section-title {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.filter-btn {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.filter-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.filter-btn.active {
  background: var(--primary-bg);
  color: var(--primary-dark);
  border-color: var(--primary);
}

.search-input {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  color: var(--text-primary);
  outline: none;
  transition: all var(--transition);
  min-width: 180px;
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.clear-btn {
  padding: var(--space-2) var(--space-3);
  background: var(--error-bg);
  color: var(--error);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.clear-btn:hover {
  background: var(--error);
  color: white;
}

.empty-section {
  text-align: center;
  padding: var(--space-8) var(--space-5);
}

.empty-tip {
  text-align: center;
}

.tip-icon {
  font-size: 48px;
  display: block;
  margin-bottom: var(--space-3);
}

.tip-text {
  font-size: var(--font-md);
  color: var(--text-secondary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.history-item {
  border: 1px solid var(--border-light);
}

.history-item:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-light);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.history-time {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
}

.style-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--primary-bg);
  color: var(--primary-dark);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 18px;
  cursor: pointer;
  transition: all var(--transition);
}

.icon-btn:hover {
  background: var(--bg-tertiary);
}

.icon-btn.active {
  background: var(--primary-bg);
}

.icon-btn.delete-btn:hover {
  background: var(--error-bg);
}

.history-input {
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.input-label {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
  display: block;
  margin-bottom: var(--space-1);
}

.input-text {
  font-size: var(--font-md);
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
}

.image-preview {
  margin-bottom: var(--space-3);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.preview-image {
  width: 100%;
  max-height: 150px;
  object-fit: contain;
  display: block;
}

.history-replies {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.reply-item {
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  transition: all var(--transition);
}

.reply-item:hover {
  border-color: var(--border-color);
}

.reply-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.reply-style {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--primary-dark);
}

.reply-text {
  font-size: var(--font-md);
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0 0 var(--space-3);
}

.reply-actions {
  display: flex;
  gap: var(--space-2);
}

.small-btn {
  padding: var(--space-1) var(--space-3);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.small-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.small-btn.primary {
  background: var(--primary-gradient);
  color: white;
}

.small-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
</style>

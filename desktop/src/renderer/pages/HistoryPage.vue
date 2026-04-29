<template>
  <div class="history-page">
    <section class="history-hero surface-panel">
      <div class="hero-copy">
        <p class="section-kicker">Reply Archive</p>
        <h1 class="hero-title">把已经验证过的表达沉淀下来，随时复用。</h1>
      </div>

      <div class="hero-stats">
        <div class="stat-tile">
          <span class="stat-label">历史记录</span>
          <strong class="stat-value">{{ totalCount }}</strong>
        </div>
        <div class="stat-tile">
          <span class="stat-label">已收藏</span>
          <strong class="stat-value">{{ favoriteCount }}</strong>
        </div>
        <div class="stat-tile">
          <span class="stat-label">当前视图</span>
          <strong class="stat-value">{{ showFavorites ? '收藏' : '全部' }}</strong>
        </div>
      </div>
    </section>

    <section class="history-toolbar surface-panel">
      <div class="toolbar-left">
        <button
          class="mode-btn"
          :class="{ active: !showFavorites }"
          @click="setMode(false)"
        >
          全部
        </button>
        <button
          class="mode-btn"
          :class="{ active: showFavorites }"
          @click="setMode(true)"
        >
          收藏
        </button>
      </div>

      <label class="search-field">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m14 14 3 3" />
        </svg>
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索输入或回复内容"
        />
      </label>

      <button v-if="!showFavorites" class="btn btn-secondary clear-btn" @click="clearAllHistory">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.5 5.5h11" />
          <path d="M7.5 5.5V4.4c0-.5.4-.9.9-.9h3.2c.5 0 .9.4.9.9v1.1" />
          <path d="M6.5 5.5v9.2c0 1 .8 1.8 1.8 1.8h3.4c1 0 1.8-.8 1.8-1.8V5.5" />
        </svg>
        清空
      </button>
    </section>

    <section v-if="historyList.length === 0" class="empty-state surface-panel">
      <div class="empty-mark">
        <svg viewBox="0 0 64 64" fill="none">
          <rect x="10" y="12" width="44" height="40" rx="14" fill="rgba(15,118,110,0.12)" />
          <path d="M22 25h20" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round" />
          <path d="M22 33h14" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round" opacity="0.65" />
          <path d="M22 41h18" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round" opacity="0.4" />
        </svg>
      </div>
      <h3 class="empty-title">{{ showFavorites ? '暂无收藏回复' : '暂无历史记录' }}</h3>
      <p class="empty-text">生成过的回复会沉淀在这里，方便回看、复制和复用。</p>
    </section>

    <section v-else class="history-timeline">
      <article
        v-for="item in historyList"
        :key="item.id"
        class="history-item surface-panel"
      >
        <div class="history-item-head">
          <div class="time-block">
            <span class="history-time">{{ formatTime(item.createdAt) }}</span>
            <span class="style-tag">{{ getStyleLabel(item.selectedStyle) }}</span>
          </div>

          <div class="item-actions">
            <button
              class="icon-btn"
              :class="{ active: item.isFavorite }"
              @click="toggleFavorite(item.id!)"
              :title="item.isFavorite ? '取消收藏' : '收藏'"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2.8 12.2 7l4.8.7-3.5 3.4.8 4.8L10 13.6l-4.3 2.3.8-4.8L3 7.7 7.8 7 10 2.8z" />
              </svg>
            </button>
            <button
              class="icon-btn danger"
              @click="deleteHistory(item.id!)"
              title="删除"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.5 5.5h11" />
                <path d="M7.5 5.5V4.4c0-.5.4-.9.9-.9h3.2c.5 0 .9.4.9.9v1.1" />
                <path d="M6.5 5.5v9.2c0 1 .8 1.8 1.8 1.8h3.4c1 0 1.8-.8 1.8-1.8V5.5" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="item.inputText" class="input-panel">
          <span class="panel-label">原始输入</span>
          <p class="input-text">{{ item.inputText }}</p>
        </div>

        <div v-if="item.inputImage" class="image-preview">
          <img :src="item.inputImage" class="preview-image" alt="历史图片" />
        </div>

        <div class="reply-stack">
          <div
            v-for="(reply, idx) in item.replies"
            :key="idx"
            class="reply-item"
          >
            <div class="reply-top">
              <span class="reply-style">{{ getStyleLabel(reply.style) }}</span>
              <div class="reply-actions">
                <button class="mini-btn" @click="copyReply(reply.reply)">复制</button>
                <button class="mini-btn primary" @click="useReply(reply.reply)">复用</button>
              </div>
            </div>
            <p class="reply-text">{{ reply.reply }}</p>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { HistoryStorage, ReplyHistory } from '../utils/history-storage'
import { useToast } from '../composables/useToast'

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

const totalCount = computed(() => allHistory.value.length)
const favoriteCount = computed(() => allHistory.value.filter(item => item.isFavorite).length)

const getStyleLabel = (style: string): string => {
  const styleMap: Record<string, string> = {
    all: '全部风格',
    friendly: '友好',
    formal: '正式',
    humorous: '幽默',
    concise: '简洁',
    empathetic: '共情'
  }
  return styleMap[style] || '默认'
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
    allHistory.value = await HistoryStorage.getHistory(100)
  } catch (e) {
    console.error('[History] 加载历史记录失败:', e)
  }
}

const setMode = (favoritesOnly: boolean) => {
  if (showFavorites.value === favoritesOnly) return
  showFavorites.value = favoritesOnly
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
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeIn 0.28s ease;
}

.history-hero,
.history-toolbar,
.empty-state,
.history-item {
  padding: var(--space-5);
}

.history-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: var(--space-4);
  background:
    radial-gradient(circle at top right, rgba(47, 107, 102, 0.13), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 243, 237, 0.9) 100%);
}

.section-kicker {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.hero-title {
  max-width: 560px;
  margin-top: var(--space-2);
  font-size: var(--font-xl);
  line-height: 1.32;
  color: var(--text-primary);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.stat-tile {
  min-width: 0;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.58);
}

.stat-label,
.panel-label {
  display: block;
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.stat-value {
  display: block;
  margin-top: 6px;
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-toolbar {
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
}

.toolbar-left {
  display: inline-flex;
  padding: 4px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--border-color);
}

.mode-btn {
  min-width: 58px;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
  transition: all var(--transition);
}

.mode-btn.active {
  color: var(--text-inverse);
  background: var(--primary-gradient);
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.16);
}

.search-field {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 42px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}

.search-field:focus-within {
  border-color: rgba(47, 107, 102, 0.3);
  box-shadow: 0 0 0 4px rgba(47, 107, 102, 0.12);
}

.search-field svg {
  width: 17px;
  height: 17px;
  color: var(--text-tertiary);
}

.search-field input {
  width: 100%;
  background: transparent;
  color: var(--text-primary);
  font-size: var(--font-md);
}

.clear-btn {
  min-width: 82px;
}

.clear-btn svg,
.icon-btn svg {
  width: 16px;
  height: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
}

.empty-mark {
  width: 76px;
  height: 76px;
}

.empty-mark svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: var(--font-lg);
  color: var(--text-primary);
}

.empty-text {
  max-width: 360px;
  font-size: var(--font-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

.history-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.history-item-head,
.reply-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.time-block {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.history-time {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.style-tag,
.reply-style {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  background: var(--primary-bg);
  color: var(--primary-dark);
  font-size: var(--font-xs);
  font-weight: 700;
}

.item-actions {
  display: flex;
  gap: var(--space-2);
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--text-tertiary);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(72, 57, 41, 0.1);
  transition: all var(--transition);
}

.icon-btn.active,
.icon-btn:hover {
  color: var(--secondary-dark);
  background: var(--secondary-bg);
}

.icon-btn.danger:hover {
  color: var(--error);
  background: var(--error-bg);
}

.input-panel,
.reply-item {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.54);
}

.input-text,
.reply-text {
  margin: var(--space-2) 0 0;
  font-size: var(--font-md);
  line-height: 1.72;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.image-preview {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.54);
}

.preview-image {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  display: block;
}

.reply-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.reply-actions {
  display: flex;
  gap: var(--space-2);
}

.mini-btn {
  min-height: 28px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
  transition: all var(--transition);
}

.mini-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.mini-btn.primary {
  color: var(--text-inverse);
  background: var(--primary-gradient);
  border-color: transparent;
}

:global(.dark-theme) .history-hero {
  background:
    radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(39, 32, 27, 0.96) 0%, rgba(25, 20, 17, 0.94) 100%);
}

:global(.dark-theme) .stat-tile,
:global(.dark-theme) .toolbar-left,
:global(.dark-theme) .search-field,
:global(.dark-theme) .icon-btn,
:global(.dark-theme) .input-panel,
:global(.dark-theme) .reply-item,
:global(.dark-theme) .image-preview,
:global(.dark-theme) .mini-btn {
  background: rgba(255, 255, 255, 0.05);
}

@media (max-width: 980px) {
  .history-hero,
  .history-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .hero-stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .history-item-head,
  .reply-top {
    flex-direction: column;
  }
}
</style>

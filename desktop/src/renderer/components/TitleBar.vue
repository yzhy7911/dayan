<template>
  <header class="title-bar surface-panel">
    <div class="title-meta">
      <div class="page-heading">
        <div class="page-title">{{ currentPage.label }}</div>
        <div class="page-subtitle">{{ currentPage.subtitle }}</div>
      </div>
    </div>

    <div class="window-actions">
      <button class="window-btn" @click="minimize" title="最小化">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M6 12h12" />
        </svg>
      </button>
      <button class="window-btn close-btn" @click="close" title="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M7 7l10 10" />
          <path d="M17 7L7 17" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const pageMeta: Record<string, { label: string; subtitle: string }> = {
  '/reply': { label: '智能回复', subtitle: '更快给出自然、得体的回复' },
  '/coach': { label: '聊天军师', subtitle: '看清局势，再决定怎么推进' },
  '/contact': { label: '联系人画像', subtitle: '把聊天对象变成可读信息' },
  '/polish': { label: '文本润色', subtitle: '同一句话，换成更合适的表达' },
  '/knowledge': { label: '话术库', subtitle: '沉淀高频表达，随时调用' },
  '/history': { label: '历史记录', subtitle: '把好用结果留下来，复用起来' },
  '/settings': { label: '系统设置', subtitle: '配置模型、同步和桌面行为' }
}

const currentPage = computed(() => {
  return pageMeta[route.path] || { label: '搭言', subtitle: '桌面沟通工作台' }
})

const minimize = () => {
  window.electronAPI?.window?.minimize?.()
}

const close = () => {
  window.electronAPI?.window?.close?.()
}
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 68px;
  padding: var(--space-3) var(--space-4);
  -webkit-app-region: drag;
}

.title-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.page-heading {
  min-width: 0;
}

.page-title {
  font-size: var(--font-xl);
  font-weight: 800;
  line-height: 1;
  color: var(--text-primary);
}

.page-subtitle {
  margin-top: 5px;
  font-size: var(--font-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.window-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  -webkit-app-region: no-drag;
}

.window-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--text-tertiary);
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid transparent;
  transition: all var(--transition);
}

.window-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-color);
  background: rgba(255, 255, 255, 0.86);
}

.window-btn svg {
  width: 16px;
  height: 16px;
}

.close-btn:hover {
  color: white;
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  border-color: transparent;
}

:global(.dark-theme) .window-btn {
  background: rgba(255, 255, 255, 0.04);
}

:global(.dark-theme) .window-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 520px) {
  .title-bar {
    min-height: 58px;
    padding: var(--space-2) var(--space-3);
  }

  .title-meta,
  .page-heading {
    gap: var(--space-2);
  }

  .page-subtitle {
    display: none;
  }

  .window-actions {
    gap: 6px;
  }

  .window-btn {
    width: 32px;
    height: 32px;
    border-radius: 12px;
  }
}
</style>

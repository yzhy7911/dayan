<template>
  <header class="title-bar surface-panel">
    <div class="title-meta">
      <div class="brand-lockup">
        <div class="logo-mark">
          <svg viewBox="0 0 28 28" fill="none">
            <defs>
              <linearGradient id="brandWave" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#14b8a6" />
                <stop offset="55%" stop-color="#0f766e" />
                <stop offset="100%" stop-color="#c2410c" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="24" height="24" rx="8" fill="url(#brandWave)" />
            <path d="M8 10.2h9.2a2.6 2.6 0 0 1 2.6 2.6v3.6a2.6 2.6 0 0 1-2.6 2.6h-6.8l-2.9 2.9v-4.5a2.6 2.6 0 0 1 .5-7.2z" fill="rgba(255,255,255,0.96)" />
            <circle cx="11.4" cy="14.2" r="1.1" fill="#0f766e" />
            <circle cx="15.9" cy="14.2" r="1.1" fill="#c2410c" />
          </svg>
        </div>
        <div class="brand-copy">
          <div class="brand-title">搭言</div>
          <div class="brand-subtitle">{{ currentPage.subtitle }}</div>
        </div>
      </div>
      <div class="page-chip">
        <span class="page-chip-dot"></span>
        <span>{{ currentPage.label }}</span>
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

.brand-lockup {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.logo-mark {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.brand-copy {
  min-width: 0;
}

.brand-title {
  font-size: var(--font-xl);
  font-weight: 700;
  line-height: 1;
  color: var(--text-primary);
}

.brand-subtitle {
  margin-top: 5px;
  font-size: var(--font-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.page-chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--secondary-light) 0%, var(--primary) 100%);
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
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

:global(.dark-theme) .page-chip {
  background: rgba(255, 255, 255, 0.06);
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
  .brand-lockup {
    gap: var(--space-2);
  }

  .logo-mark {
    width: 32px;
    height: 32px;
  }

  .brand-subtitle {
    display: none;
  }

  .page-chip {
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

<template>
  <div class="app-shell">
    <aside class="nav-column">
      <TabBar />
    </aside>
    <div class="workspace-column">
      <TitleBar />
      <div 
        class="main-content" 
        ref="mainContentRef"
        @mousedown="handleMouseDown"
      >
        <router-view v-slot="{ Component }">
          <keep-alive :include="['Reply', 'Knowledge']">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </div>
    <OnboardingGuide v-if="showOnboarding" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { defineAsyncComponent } from 'vue'
import TitleBar from './components/TitleBar.vue'
import TabBar from './components/TabBar.vue'
import { getTheme, applyTheme } from './utils/theme'
import { HistoryStorage } from './utils/history-storage'
import { ContactStorage } from './utils/contact-storage'
import { initDatabase } from './utils/storage'
import { MemoryManager } from './utils/memory-manager'
import { useDragScroll } from './composables/useDragScroll'

// 异步加载新手引导组件，减少首屏体积
const OnboardingGuide = defineAsyncComponent(
  () => import('./components/OnboardingGuide.vue')
)

const showOnboarding = ref(false)
let idleTaskId: number | null = null

// 使用鼠标拖动滚动 composable
const { containerRef: mainContentRef, handleMouseDown } = useDragScroll()

const runWhenIdle = (task: () => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    idleTaskId = window.requestIdleCallback(() => {
      idleTaskId = null
      task()
    })
    return
  }

  idleTaskId = window.setTimeout(() => {
    idleTaskId = null
    task()
  }, 16)
}

onMounted(async () => {
  console.log('[App] ✅ App 组件已挂载')

  // 同步应用主题（无IO，极快）
  const theme = getTheme()
  applyTheme(theme)

  // 检查是否需要显示新手引导（不阻塞）
  const onboardingCompleted = localStorage.getItem('dayan-onboarding-completed')
  if (!onboardingCompleted) {
    setTimeout(() => {
      showOnboarding.value = true
    }, 600)
  }

  // 延迟初始化数据库（不阻塞首屏渲染）
  runWhenIdle(async () => {
    try {
      await Promise.all([
        initDatabase(),
        HistoryStorage.init(),
        ContactStorage.init()
      ])
      console.log('[App] ✅ 数据库初始化完成')

      // 启动内存管理定期清理
      MemoryManager.startCleanup()
    } catch (e) {
      console.error('[App] ❌ 数据库初始化失败:', e)
    }
  })
})

onUnmounted(() => {
  if (idleTaskId !== null) {
    if (typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idleTaskId)
    } else {
      clearTimeout(idleTaskId)
    }
    idleTaskId = null
  }

  // 停止内存管理
  MemoryManager.stopCleanup()
})
</script>

<style scoped>
.app-shell {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-3);
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.14), transparent 28%),
    linear-gradient(180deg, var(--bg-shell) 0%, transparent 100%);
}

.nav-column {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.workspace-column {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  cursor: grab;
}

.main-content::-webkit-scrollbar {
  display: none;
}

.main-content.dragging {
  cursor: grabbing;
  user-select: none;
}

@media (max-width: 520px) {
  .app-shell {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: var(--space-2);
    padding: var(--space-2);
  }

  .workspace-column {
    gap: var(--space-2);
  }

  .main-content {
    padding-right: 0;
  }
}
</style>

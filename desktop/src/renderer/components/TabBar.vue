<template>
  <nav class="tab-rail surface-panel">
    <div class="rail-top">
      <div class="brand-monogram">DY</div>
      <div class="brand-tag">Desk</div>
    </div>

    <div class="tab-list">
      <button
        v-for="tab in tabs"
        :key="tab.path"
        class="tab-item"
        :class="{ active: route.path === tab.path }"
        @click="switchTab(tab.path)"
      >
        <div class="tab-icon" v-html="tab.icon"></div>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  {
    path: '/reply',
    label: '回复',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-5 4v-13.5z"/>
    </svg>`
  },
  {
    path: '/coach',
    label: '军师',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z"/>
      <path d="M4 12l8 4.5 8-4.5"/>
      <path d="M4 16.5L12 21l8-4.5"/>
    </svg>`
  },
  {
    path: '/contact',
    label: '联系人',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="9" cy="8" r="3.25"/>
      <path d="M3.5 18.5c1.3-2.6 3.13-3.9 5.5-3.9s4.2 1.3 5.5 3.9"/>
      <path d="M17 7.2c1.56.29 2.74 1.65 2.74 3.3 0 1.65-1.18 3.01-2.74 3.3"/>
      <path d="M18.8 18.3c.82-.78 1.73-1.17 2.7-1.17"/>
    </svg>`
  },
  {
    path: '/polish',
    label: '润色',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 19l4.8-1 8.5-8.5a2.3 2.3 0 1 0-3.25-3.25L6.55 14.75 5 19z"/>
      <path d="M13.5 5.5l5 5"/>
    </svg>`
  },
  {
    path: '/knowledge',
    label: '话术',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6.5 4H19v16H6.5A2.5 2.5 0 0 0 4 22V6.5A2.5 2.5 0 0 1 6.5 4z"/>
      <path d="M8 8h7"/>
      <path d="M8 12h7"/>
    </svg>`
  },
  {
    path: '/history',
    label: '历史',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 7v5l3 2"/>
      <circle cx="12" cy="12" r="8"/>
    </svg>`
  },
  {
    path: '/settings',
    label: '设置',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.72 1.72 0 0 0 .35 1.9 2 2 0 0 1-2.83 2.83 1.72 1.72 0 0 0-1.9-.35 1.72 1.72 0 0 0-1.06 1.59 2 2 0 0 1-4 0 1.72 1.72 0 0 0-1.06-1.59 1.72 1.72 0 0 0-1.9.35 2 2 0 1 1-2.83-2.83 1.72 1.72 0 0 0 .35-1.9A1.72 1.72 0 0 0 2.97 14a2 2 0 0 1 0-4 1.72 1.72 0 0 0 1.59-1.06 1.72 1.72 0 0 0-.35-1.9 2 2 0 1 1 2.83-2.83 1.72 1.72 0 0 0 1.9.35A1.72 1.72 0 0 0 10 2.97a2 2 0 0 1 4 0 1.72 1.72 0 0 0 1.06 1.59 1.72 1.72 0 0 0 1.9-.35 2 2 0 1 1 2.83 2.83 1.72 1.72 0 0 0-.35 1.9A1.72 1.72 0 0 0 21.03 10a2 2 0 0 1 0 4 1.72 1.72 0 0 0-1.63 1z"/>
    </svg>`
  }
]

const switchTab = (path: string) => {
  router.push(path)
}
</script>

<style scoped>
.tab-rail {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4) var(--space-2);
  gap: var(--space-5);
}

.rail-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.brand-monogram {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--primary-gradient);
  color: var(--text-inverse);
  font-size: var(--font-sm);
  font-weight: 700;
  box-shadow: 0 18px 32px rgba(15, 118, 110, 0.18);
}

.brand-tag {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.tab-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tab-item {
  width: 100%;
  min-height: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: var(--space-2) 0;
  border-radius: 14px;
  color: var(--text-tertiary);
  transition: all var(--transition);
}

.tab-item:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.5);
}

.tab-item.active {
  color: var(--text-primary);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(240, 233, 223, 0.9) 100%);
  box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.08), 0 16px 28px rgba(66, 47, 29, 0.08);
}

.tab-item.active .tab-icon {
  color: var(--primary-dark);
  transform: translateY(-1px);
}

.tab-icon {
  width: 22px;
  height: 22px;
  transition: all var(--transition);
}

.tab-label {
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

:global(.dark-theme) .tab-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

:global(.dark-theme) .tab-item.active {
  color: var(--text-primary);
  background: linear-gradient(180deg, rgba(45, 212, 191, 0.13) 0%, rgba(15, 118, 110, 0.08) 100%);
  box-shadow: inset 0 0 0 1px rgba(45, 212, 191, 0.28), 0 16px 28px rgba(0, 0, 0, 0.18);
}

:global(.dark-theme) .tab-item.active .tab-icon {
  color: var(--primary);
}

:global(.dark-theme) .tab-item.active .tab-label {
  color: var(--text-primary);
}

@media (max-width: 520px) {
  .tab-rail {
    padding: var(--space-3) 6px;
    gap: var(--space-4);
    border-radius: var(--radius-xl);
  }

  .brand-monogram {
    width: 38px;
    height: 38px;
    border-radius: 13px;
  }

  .tab-list {
    gap: 6px;
  }

  .tab-item {
    min-height: 54px;
    gap: 5px;
    border-radius: 13px;
  }

  .tab-icon {
    width: 21px;
    height: 21px;
  }

}
</style>

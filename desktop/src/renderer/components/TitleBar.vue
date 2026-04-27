<template>
  <div class="title-bar">
    <div class="title-left">
      <div class="logo">
        <svg viewBox="0 0 28 28" fill="none">
          <defs>
            <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#10b981"/>
              <stop offset="50%" stop-color="#0d9488"/>
              <stop offset="100%" stop-color="#8b5cf6"/>
            </linearGradient>
            <linearGradient id="logoInner" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="100%" stop-color="#e0f2fe"/>
            </linearGradient>
            <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.2"/>
            </filter>
          </defs>
          <!-- 背景圆形 -->
          <circle cx="14" cy="14" r="13" fill="url(#logoBg)" filter="url(#logoShadow)"/>
          <!-- 对话气泡 D 形 -->
          <path d="M8 9h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H9l-3 3v-7a3 3 0 0 1 2-3z" fill="url(#logoInner)" opacity="0.95"/>
          <!-- 内部装饰 - AI 光点 -->
          <circle cx="12" cy="14" r="1.5" fill="#10b981"/>
          <circle cx="17" cy="14" r="1" fill="#8b5cf6" opacity="0.8"/>
        </svg>
      </div>
      <span class="title">搭言</span>
    </div>
    <div class="title-right">
      <button class="icon-btn" @click="minimize" title="最小化">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button class="icon-btn close-btn" @click="close" title="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const minimize = () => {
  window.electronAPI?.window?.minimize?.()
}

const close = () => {
  window.electronAPI?.window?.close?.()
}
</script>

<style scoped>
.title-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  z-index: 1000;
  -webkit-app-region: drag;
  box-shadow: var(--shadow-sm);
}

.title-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.logo {
  width: 28px;
  height: 28px;
}

.title {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--text-primary);
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-right {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  -webkit-app-region: no-drag;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition);
}

.icon-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.icon-btn svg {
  width: 16px;
  height: 16px;
}

.close-btn:hover {
  background: var(--error);
  color: white;
}
</style>

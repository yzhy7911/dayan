<template>
  <div class="title-bar">
    <div class="title-left">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="url(#logoGradient)"/>
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#10b981"/>
              <stop offset="100%" stop-color="#059669"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span class="title">嗒言</span>
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
  padding: 0 12px;
  background: white;
  border-bottom: 1px solid #f3f4f6;
  z-index: 1000;
  -webkit-app-region: drag;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  width: 24px;
  height: 24px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.title-right {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.icon-btn svg {
  width: 16px;
  height: 16px;
}

.close-btn:hover {
  background: #ef4444;
  color: white;
}
</style>

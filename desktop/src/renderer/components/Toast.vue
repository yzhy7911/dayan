<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', toast.type]"
      >
        <span class="toast-icon">{{ getIcon(toast.type) }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'

interface Props {
  toasts: Array<{ id: number; type: string; message: string }>
}

const props = defineProps<Props>()
const { toasts } = toRefs(props)

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    loading: '⏳'
  }
  return icons[type] || 'ℹ'
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 300px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #1f2937;
  min-width: 200px;
  animation: slideIn 0.3s ease;
  pointer-events: auto;
}

.toast.success {
  border-left: 3px solid #10b981;
}

.toast.error {
  border-left: 3px solid #ef4444;
}

.toast.info {
  border-left: 3px solid #3b82f6;
}

.toast.loading {
  border-left: 3px solid #f59e0b;
}

.toast-icon {
  font-size: 16px;
  font-weight: bold;
}

.toast.loading .toast-icon {
  animation: spin 1s linear infinite;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.toast-enter-active {
  animation: slideIn 0.3s ease;
}

.toast-leave-active {
  animation: slideIn 0.25s ease reverse;
}
</style>

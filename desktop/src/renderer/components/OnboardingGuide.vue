<template>
  <div class="onboarding-overlay" v-if="isVisible">
    <div class="onboarding-modal">
      <div class="onboarding-header">
        <h2 class="onboarding-title">👋 欢迎使用搭言</h2>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="onboarding-steps">
        <div v-for="(step, index) in steps" :key="step.id" class="step-item" :class="{ active: currentStep === index }">
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-content">
            <div class="step-title">{{ step.title }}</div>
            <div class="step-desc">{{ step.description }}</div>
          </div>
        </div>
      </div>

      <div class="onboarding-action">
        <button class="btn-primary" @click="nextStep">
          {{ currentStep === steps.length - 1 ? '开始使用' : '下一步' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const ONBOARDING_KEY = 'dayan-onboarding-completed'

const isVisible = ref(false)
const currentStep = ref(0)

const steps = [
  {
    id: 1,
    title: 'AI 智能回复',
    description: '粘贴微信聊天内容，AI 将为您生成多种风格的回复',
  },
  {
    id: 2,
    title: '一键粘贴发送',
    description: '点击「发送到微信」，直接将生成的回复粘贴到微信聊天框',
  },
  {
    id: 3,
    title: '军师深度分析',
    description: '切换到军师页面，AI 将为您分析对方意图和对话策略',
  },
  {
    id: 4,
    title: '个性化学习',
    description: '使用越多，AI 越了解您的偏好，推荐更符合您的风格',
  },
]

const checkFirstLaunch = () => {
  const completed = localStorage.getItem(ONBOARDING_KEY)
  if (!completed) {
    isVisible.value = true
  }
}

const close = () => {
  isVisible.value = false
  markComplete()
}

const markComplete = () => {
  localStorage.setItem(ONBOARDING_KEY, Date.now().toString())
}

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    close()
  }
}

onMounted(() => {
  // 延迟一点显示，让页面先加载完
  setTimeout(() => {
    checkFirstLaunch()
  }, 500)
})
</script>

<style scoped>
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: var(--space-4);
}

.onboarding-modal {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.onboarding-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-light);
}

.onboarding-title {
  font-size: var(--font-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  font-size: var(--font-lg);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}

.close-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.onboarding-steps {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.step-item {
  display: flex;
  gap: var(--space-3);
  opacity: 0.4;
  transition: opacity var(--transition);
}

.step-item.active {
  opacity: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  background: var(--primary-gradient);
  color: white;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  padding-top: var(--space-1);
}

.step-title {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.step-desc {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

.onboarding-action {
  padding: var(--space-4);
  padding-top: 0;
}

.btn-primary {
  width: 100%;
  padding: var(--space-3);
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>

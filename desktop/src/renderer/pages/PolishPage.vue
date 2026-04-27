<template>
  <div class="polish-page">
    <div class="input-section">
      <div class="input-header">
        <span class="input-label">输入需要润色的文本</span>
      </div>
      <textarea
        v-model="inputText"
        class="input-textarea"
        placeholder="输入你写好的回复，AI帮你润色得更得体..."
        rows="4"
      ></textarea>

      <div class="style-selector">
        <span class="style-label">润色风格：</span>
        <div class="style-buttons">
          <button
            v-for="style in styles"
            :key="style.value"
            class="style-btn"
            :class="{ active: selectedStyle === style.value }"
            @click="selectedStyle = style.value"
          >
            {{ style.label }}
          </button>
        </div>
      </div>

      <button class="polish-btn" :disabled="!inputText.trim() || isPolishing" @click="polishText">
        <span v-if="isPolishing">润色中...</span>
        <span v-else>开始润色</span>
      </button>
    </div>

    <div class="results-section" v-if="results.length > 0">
      <div class="results-header">
        <span class="results-title">润色结果</span>
      </div>
      <div class="results-list">
        <div v-for="(result, index) in results" :key="index" class="result-card">
          <div class="result-header">
            <span class="result-index">{{ index + 1 }}</span>
            <span class="polish-tag">{{ getStyleLabel(selectedStyle) }}</span>
          </div>
          <div class="result-content">{{ result }}</div>
          <div class="result-actions">
            <button class="copy-btn" @click="copyResult(result)">📋 复制</button>
            <button class="paste-btn" @click="pasteResult(result)">🚀 发送到微信</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const inputText = ref('')
const selectedStyle = ref('friendly')
const isPolishing = ref(false)
const results = ref<string[]>([])

const styles = [
  { value: 'polite', label: '✨ 更礼貌' },
  { value: 'confident', label: '💪 更自信' },
  { value: 'warm', label: '💝 更温暖' },
  { value: 'concise', label: '⚡ 更简洁' }
]

const getStyleLabel = (style: string): string => {
  const styleMap: Record<string, string> = {
    polite: '✨ 更礼貌',
    confident: '💪 更自信',
    warm: '💝 更温暖',
    concise: '⚡ 更简洁'
  }
  return styleMap[style] || '✨ 默认润色'
}

const polishText = async () => {
  if (!inputText.value.trim()) return

  isPolishing.value = true
  try {
    const result = await window.electronAPI?.ai?.polishText?.(
      inputText.value,
      selectedStyle.value
    )
    results.value = result || []
    console.log('[Polish] 润色完成，生成', results.value.length, '条结果')
  } catch (e) {
    console.error('Polish text failed:', e)
    results.value = [inputText.value]
  } finally {
    isPolishing.value = false
  }
}

const copyResult = async (text: string) => {
  await window.electronAPI?.clipboard?.setText?.(text)
  console.log('[Polish] 已复制到剪贴板')
}

const pasteResult = async (text: string) => {
  await window.electronAPI?.clipboard?.setText?.(text)
  await window.electronAPI?.clipboard?.paste?.()
  console.log('[Polish] 已粘贴到微信')
}
</script>

<style scoped>
.polish-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.input-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 16px;
}

.input-header {
  margin-bottom: 12px;
}

.input-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.input-textarea {
  width: 100%;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-primary);
  resize: none;
}

.style-selector {
  margin-top: 16px;
}

.style-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: block;
}

.style-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.style-btn {
  padding: 6px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-secondary);
}

.style-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.polish-btn {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
}

.polish-btn:disabled {
  opacity: 0.5;
}

.results-header {
  margin-bottom: 12px;
}

.results-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 2px solid var(--border-color);
  transition: all 0.25s ease;
  cursor: pointer;
}

.result-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.15);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.result-index {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.polish-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #f3e8ff;
  color: #9333ea;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.result-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.copy-btn {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: var(--border-color);
}

.paste-btn {
  flex: 1;
  padding: 8px 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.paste-btn:hover {
  background: var(--primary-dark);
}
</style>

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
import { useToast } from '../composables/useToast'

const toast = useToast()

const inputText = ref('')
const selectedStyle = ref('friendly')
const isPolishing = ref(false)
const results = ref<string[]>([])

const styles = [
  { value: 'polite', label: '✨ 更礼貌' },
  { value: 'confident', label: '💪 更自信' },
  { value: 'warm', label: '💝 更温暖' },
  { value: 'concise', label: '⚡ 更简洁' },
  { value: 'formal', label: '🎩 更正式' },
  { value: 'rigorous', label: '📋 更严谨' },
  { value: 'ambiguous', label: '🌸 更暧昧' },
  { value: 'greenTea', label: '🍵 更绿茶' }
]

const getStyleLabel = (style: string): string => {
  const styleMap: Record<string, string> = {
    polite: '✨ 更礼貌',
    confident: '💪 更自信',
    warm: '💝 更温暖',
    concise: '⚡ 更简洁',
    formal: '🎩 更正式',
    rigorous: '📋 更严谨',
    ambiguous: '🌸 更暧昧',
    greenTea: '🍵 更绿茶'
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
    // 检查是否包含错误标记
    if (result && result.length > 0 && result[0].startsWith('❌')) {
      toast.error('润色失败：' + result[0].replace('❌ ', ''))
      return
    }
    results.value = result || []
    console.log('[Polish] 润色完成，生成', results.value.length, '条结果')
    toast.success('润色完成！')
  } catch (e: any) {
    console.error('Polish text failed:', e)
    toast.error('润色失败：' + (e.message || '未知错误'))
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
  padding: var(--space-4);
  background: var(--bg-secondary);
}

/* 输入区域 */
.input-section {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.input-header {
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: 6px;
}

.input-label {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--text-primary);
}

.input-textarea {
  width: 100%;
  min-height: 100px;
  padding: var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  color: var(--text-primary);
  resize: none;
  outline: none;
  transition: all var(--transition);
  line-height: 1.6;
}

.input-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
  background: var(--bg-primary);
}

.input-textarea::placeholder {
  color: var(--text-placeholder);
}

/* 风格选择器 */
.style-selector {
  margin-top: var(--space-4);
}

.style-label {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
  display: block;
  font-weight: 500;
}

.style-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.style-btn {
  padding: 6px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  font-weight: 500;
}

.style-btn:hover:not(.active) {
  border-color: var(--primary);
  color: var(--primary);
}

.style-btn.active {
  background: var(--primary-gradient);
  border-color: transparent;
  color: white;
  box-shadow: var(--shadow-sm);
}

/* 润色按钮 */
.polish-btn {
  width: 100%;
  margin-top: var(--space-4);
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

.polish-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.polish-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 结果区域 */
.results-header {
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: 6px;
}

.results-title {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--text-primary);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.result-card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  border: 2px solid var(--border-color);
  transition: all var(--transition-slow);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.result-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.result-index {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  color: white;
  border-radius: 50%;
  font-size: var(--font-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.polish-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--secondary-bg);
  color: var(--secondary-dark);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 500;
}

.result-content {
  font-size: var(--font-md);
  line-height: 1.7;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
  font-weight: 500;
}

.result-actions {
  display: flex;
  gap: var(--space-2);
}

.copy-btn {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.copy-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.paste-btn {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: var(--shadow-sm);
}

.paste-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>

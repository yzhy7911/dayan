<template>
  <div class="polish-page">
    <section class="hero-panel surface-panel">
      <div class="hero-copy">
        <p class="hero-kicker">Tone Studio</p>
        <h1 class="hero-title">把现成表达打磨得更得体、更贴合场景。</h1>
        <p class="hero-desc">
          这页更像一个语气工作台。输入原句，挑一个方向，快速得到几种可直接发送的版本。
        </p>
      </div>

      <div class="hero-metrics">
        <div class="metric-tile">
          <span class="metric-label">当前风格</span>
          <strong class="metric-value">{{ getStyleLabel(selectedStyle) }}</strong>
        </div>
        <div class="metric-tile">
          <span class="metric-label">结果数量</span>
          <strong class="metric-value">{{ results.length || 0 }}</strong>
        </div>
        <div class="metric-tile">
          <span class="metric-label">状态</span>
          <strong class="metric-value">{{ isPolishing ? '处理中' : '待生成' }}</strong>
        </div>
      </div>
    </section>

    <section class="workspace-panel">
      <div class="composer-panel surface-panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Input</p>
            <h2 class="panel-title">原始文本</h2>
          </div>
        </div>

        <textarea
          v-model="inputText"
          class="input-textarea"
          placeholder="输入你已经写好的内容，我们把它润得更顺、更自然。"
          rows="6"
        ></textarea>

        <div class="style-block">
          <span class="style-label">调整方向</span>
          <div class="style-grid">
            <button
              v-for="style in styles"
              :key="style.value"
              class="style-btn"
              :class="{ active: selectedStyle === style.value }"
              @click="selectedStyle = style.value"
            >
              <span class="style-name">{{ style.label }}</span>
              <span class="style-note">{{ style.note }}</span>
            </button>
          </div>
        </div>

        <button class="btn btn-primary polish-btn" :disabled="!inputText.trim() || isPolishing" @click="polishText">
          {{ isPolishing ? '润色中...' : '生成润色结果' }}
        </button>
      </div>

      <section class="results-panel surface-panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Results</p>
            <h2 class="panel-title">候选表达</h2>
          </div>
          <span class="result-chip">{{ results.length }} 条</span>
        </div>

        <div v-if="results.length > 0" class="results-list">
          <article v-for="(result, index) in results" :key="index" class="result-card">
            <div class="result-header">
              <div class="result-index">{{ index + 1 }}</div>
              <span class="polish-tag">{{ getStyleLabel(selectedStyle) }}</span>
            </div>
            <p class="result-content">{{ result }}</p>
            <div class="result-actions">
              <button class="btn btn-secondary action-btn" @click="copyResult(result)">复制</button>
              <button class="btn btn-primary action-btn" @click="pasteResult(result)">发送到微信</button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <div class="empty-mark">
            <svg viewBox="0 0 64 64" fill="none">
              <rect x="10" y="12" width="44" height="40" rx="14" fill="rgba(15,118,110,0.12)" />
              <path d="M22 25h20" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round" />
              <path d="M22 33h14" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round" opacity="0.65" />
              <path d="M22 41h18" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round" opacity="0.4" />
            </svg>
          </div>
          <h3 class="empty-title">还没有润色结果</h3>
          <p class="empty-text">输入一段文字并选择方向后，这里会出现可以直接使用的多个版本。</p>
        </div>
      </section>
    </section>
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
  { value: 'polite', label: '更礼貌', note: '适合边界更清晰的沟通' },
  { value: 'confident', label: '更自信', note: '语气更稳，表达更直接' },
  { value: 'warm', label: '更温暖', note: '保留善意和情绪温度' },
  { value: 'concise', label: '更简洁', note: '删去赘余，保留重点' },
  { value: 'formal', label: '更正式', note: '适合工作或商务场景' },
  { value: 'rigorous', label: '更严谨', note: '措辞更审慎，信息更完整' },
  { value: 'ambiguous', label: '更暧昧', note: '适合关系试探和氛围推进' },
  { value: 'greenTea', label: '更绿茶', note: '轻微留白，带一点拿捏感' }
]

const getStyleLabel = (style: string): string => {
  const styleMap: Record<string, string> = {
    polite: '更礼貌',
    confident: '更自信',
    warm: '更温暖',
    concise: '更简洁',
    formal: '更正式',
    rigorous: '更严谨',
    ambiguous: '更暧昧',
    greenTea: '更绿茶'
  }
  return styleMap[style] || '默认润色'
}

const polishText = async () => {
  if (!inputText.value.trim()) return

  isPolishing.value = true
  try {
    const result = await window.electronAPI?.ai?.polishText?.(
      inputText.value,
      selectedStyle.value
    )

    if (result && result.length > 0 && result[0].startsWith('❌')) {
      toast.error('润色失败：' + result[0].replace('❌ ', ''))
      return
    }

    results.value = result || []
    console.log('[Polish] 润色完成，生成', results.value.length, '条结果')
    toast.success('润色完成')
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
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeIn 0.28s ease;
}

.hero-panel,
.composer-panel,
.results-panel {
  padding: var(--space-5);
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(280px, 0.92fr);
  gap: var(--space-4);
  background:
    radial-gradient(circle at top right, rgba(20, 184, 166, 0.16), transparent 26%),
    radial-gradient(circle at bottom left, rgba(194, 65, 12, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(247, 241, 233, 0.9) 100%);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hero-kicker,
.panel-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.hero-title,
.panel-title {
  font-size: var(--font-xl);
  line-height: 1.32;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-desc {
  max-width: 560px;
  font-size: var(--font-md);
  line-height: 1.7;
  color: var(--text-secondary);
}

.hero-metrics {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.metric-tile {
  min-width: 0;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.58);
}

.metric-label {
  display: block;
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.metric-value {
  display: block;
  margin-top: 6px;
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--text-primary);
}

.workspace-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: var(--space-4);
  min-height: 0;
}

.composer-panel,
.results-panel {
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.input-textarea {
  width: 100%;
  min-height: 230px;
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  font-size: var(--font-md);
  color: var(--text-primary);
  resize: vertical;
  outline: none;
  transition: all var(--transition);
  line-height: 1.7;
}

.input-textarea:focus {
  border-color: rgba(15, 118, 110, 0.5);
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
  background: rgba(255, 255, 255, 0.94);
}

.style-block {
  margin-top: var(--space-4);
}

.style-label {
  display: block;
  margin-bottom: var(--space-3);
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--text-secondary);
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.style-btn {
  min-height: 76px;
  padding: var(--space-3);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.56);
  text-align: left;
  transition: all var(--transition);
}

.style-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.style-btn.active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(226, 241, 238, 0.92) 100%);
  border-color: rgba(15, 118, 110, 0.18);
  box-shadow: 0 18px 32px rgba(15, 118, 110, 0.12);
}

.style-name {
  display: block;
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--text-primary);
}

.style-note {
  display: block;
  margin-top: 6px;
  font-size: var(--font-xs);
  line-height: 1.55;
  color: var(--text-secondary);
}

.polish-btn {
  width: 100%;
  margin-top: var(--space-4);
  min-height: 42px;
}

.result-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-secondary);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.result-card {
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.54);
  transition: all var(--transition);
}

.result-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.result-index {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--primary-gradient);
  color: var(--text-inverse);
  font-size: var(--font-xs);
  font-weight: 700;
}

.polish-tag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  background: var(--secondary-bg);
  color: var(--secondary-dark);
  font-size: var(--font-xs);
  font-weight: 700;
}

.result-content {
  margin: 0 0 var(--space-4);
  font-size: var(--font-md);
  line-height: 1.72;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.result-actions {
  display: flex;
  gap: var(--space-3);
}

.action-btn {
  flex: 1;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-5);
}

.empty-mark {
  width: 76px;
  height: 76px;
}

.empty-mark svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: var(--font-lg);
  color: var(--text-primary);
}

.empty-text {
  max-width: 320px;
  font-size: var(--font-sm);
  line-height: 1.6;
  color: var(--text-secondary);
}

:global(.dark-theme) .hero-panel {
  background:
    radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 26%),
    radial-gradient(circle at bottom left, rgba(179, 138, 99, 0.1), transparent 24%),
    linear-gradient(180deg, rgba(39, 32, 27, 0.96) 0%, rgba(25, 20, 17, 0.94) 100%);
}

:global(.dark-theme) .metric-tile,
:global(.dark-theme) .input-textarea,
:global(.dark-theme) .style-btn,
:global(.dark-theme) .result-chip,
:global(.dark-theme) .result-card {
  background: rgba(255, 255, 255, 0.05);
}

:global(.dark-theme) .style-btn.active {
  background: linear-gradient(180deg, rgba(54, 42, 34, 0.94) 0%, rgba(33, 25, 20, 0.92) 100%);
  box-shadow: inset 0 0 0 1px rgba(45, 212, 191, 0.14), 0 16px 28px rgba(0, 0, 0, 0.18);
}

@media (max-width: 1080px) {
  .hero-panel,
  .workspace-panel {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .style-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .result-actions {
    flex-direction: column;
  }
}
</style>

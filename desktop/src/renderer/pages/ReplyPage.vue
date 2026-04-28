<template>
  <div class="reply-page">
    <!-- 输入区域 -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">📝 输入内容</h3>
        <div class="header-actions">
          <button
            class="listen-btn"
            :class="{ active: isListening }"
            @click="toggleListening"
          >
            {{ isListening ? '🔴 监听中' : '📡 监听剪贴板' }}
          </button>
          <button class="quick-paste-btn" @click="pasteFromClipboard">
            📋 粘贴
          </button>
        </div>
      </div>

      <!-- 图片预览区 -->
      <div v-if="pastedImage" class="image-preview-container">
        <img :src="pastedImage" class="pasted-image" alt="粘贴的图片" />
        <button class="remove-image-btn" @click="removeImage">×</button>
      </div>

      <textarea
        v-model="inputText"
        class="input-textarea"
        placeholder="粘贴微信聊天内容或截图，AI 自动生成回复..."
        rows="4"
        @paste="handlePaste"
      ></textarea>

      <!-- 情绪识别提示 -->
      <div v-if="detectedEmotion" class="emotion-detected">
        <span class="emotion-icon">🎭</span>
        <span class="emotion-text">
          检测到情绪：<strong>{{ detectedEmotion }}</strong> ({{ Math.round(emotionConfidence * 100) }}%)
        </span>
        <button class="emotion-apply-btn" @click="applyEmotionStyle">
          应用推荐风格
        </button>
      </div>

      <!-- 反诈预警提示 -->
      <div v-if="scamWarning" class="scam-warning" :class="scamWarning.level">
        <span class="scam-icon">{{ scamWarning.level === 'high' ? '🚨' : '⚠️' }}</span>
        <span class="scam-text">{{ scamWarning.message }}</span>
        <span class="scam-confidence">置信度: {{ Math.round(scamWarning.confidence * 100) }}%</span>
      </div>

      <div class="style-selector">
        <span class="style-label">回复风格：</span>
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

      <button
        class="generate-btn"
        :disabled="!inputText.trim() || isGenerating"
        @click="generateReply"
      >
        <span v-if="isGenerating">⏳ 生成中...</span>
        <span v-else>✨ 生成回复</span>
      </button>
    </div>

    <!-- 结果区域 -->
    <div class="section" v-if="replies.length > 0">
      <div class="section-header">
        <h3 class="section-title">💡 AI 推荐回复</h3>
        <span class="result-count">{{ replies.length }} 条</span>
      </div>

      <div class="replies-list">
        <div
          v-for="(reply, index) in replies"
          :key="index"
          class="reply-card"
        >
          <div class="reply-header">
            <div>
              <span class="reply-index">{{ index + 1 }}</span>
              <span :class="['style-tag', reply.style]">{{ getStyleLabel(reply.style) }}</span>
            </div>
          </div>
          <div class="reply-content">{{ reply.reply }}</div>
          <div class="reply-actions">
            <button class="btn-copy" @click="copyReply(reply.reply)">
              📋 复制
            </button>
            <button class="btn-paste" @click="pasteReply(reply.reply)">
              🚀 发送到微信
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示：未配置 API -->
    <div class="section" v-if="!hasAPIKey() && replies.length === 0">
      <div class="empty-tip">
        <span class="tip-icon">⚙️</span>
        <p class="tip-text">请先到「设置」页面配置你的 AI API Key</p>
        <button class="btn-go-settings" @click="goToSettings">
          去配置 →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { hasAPIKey } from '../utils/storage'
import { HistoryStorage } from '../utils/history-storage'
import { EmotionDetector } from '../utils/emotion-detector'
import { StyleLearner } from '../utils/style-learning'
import { ScamDetector } from '../utils/ScamDetector'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()
const inputText = ref('')
const selectedStyle = ref('all')
const isGenerating = ref(false)
const replies = ref<{ style: string; reply: string }[]>([])
const isListening = ref(false)
const pastedImage = ref<string | null>(null)

// 情绪识别相关
const detectedEmotion = ref<string | null>(null)
const emotionConfidence = ref<number>(0)
const emotionSuggestions = ref<string[]>([])

// 反诈预警相关
const scamWarning = ref<ReturnType<typeof ScamDetector.analyze>>(null)

const styles = [
  { value: 'all', label: '✨ 全部风格' },
  { value: 'friendly', label: '💬 友好' },
  { value: 'formal', label: '💼 正式' },
  { value: 'humorous', label: '😄 幽默' },
  { value: 'concise', label: '⚡ 简洁' },
  { value: 'empathetic', label: '💝 共情' }
]

const getStyleLabel = (style: string): string => {
  const styleMap: Record<string, string> = {
    all: '✨ 全部风格',
    friendly: '💬 友好风格',
    formal: '💼 正式风格',
    humorous: '😄 幽默风格',
    concise: '⚡ 简洁风格',
    empathetic: '💝 共情风格'
  }
  return styleMap[style] || '✨ 默认风格'
}

onMounted(() => {
  console.log('[Reply] 页面加载完成')
  StyleLearner.init()
  // 如果有足够的学习数据，默认使用推荐风格
  if (StyleLearner.hasEnoughData()) {
    const recommended = StyleLearner.getRecommendedStyle()
    if (styles.find(s => s.value === recommended)) {
      selectedStyle.value = recommended
    }
  }
  // 注册剪贴板变化监听
  window.electronAPI?.clipboard?.onChanged?.((text: string) => {
    if (isListening.value && text && text.trim()) {
      handleClipboardChange(text)
    }
  })
})

// 监听输入文本变化，检测情绪和诈骗
watch(inputText, (newText) => {
  if (!newText || !newText.trim()) {
    detectedEmotion.value = null
    emotionConfidence.value = 0
    emotionSuggestions.value = []
    scamWarning.value = null
    return
  }

  // 情绪识别
  const emotionResult = EmotionDetector.detectFromText(newText)
  if (emotionResult) {
    detectedEmotion.value = emotionResult.emotion
    emotionConfidence.value = emotionResult.confidence
    emotionSuggestions.value = emotionResult.suggestions
  } else {
    detectedEmotion.value = null
    emotionConfidence.value = 0
    emotionSuggestions.value = []
  }

  // 诈骗检测
  const scamResult = ScamDetector.analyze(newText)
  if (scamResult) {
    scamWarning.value = scamResult
    if (scamResult.level === 'high') {
      toast.error(scamResult.message)
    }
  } else {
    scamWarning.value = null
  }
})

// 应用情绪推荐的风格
const applyEmotionStyle = () => {
  if (!detectedEmotion.value) return

  const recommendedStyle = EmotionDetector.getStyleRecommendation(detectedEmotion.value)
  selectedStyle.value = recommendedStyle
  toast.success(`已应用${detectedEmotion.value}风格：${getStyleLabel(recommendedStyle)}`)
}

onUnmounted(() => {
  // 页面卸载时停止监听
  if (isListening.value) {
    window.electronAPI?.clipboard?.stopListen?.()
  }
})

const toggleListening = async () => {
  try {
    if (isListening.value) {
      await window.electronAPI?.clipboard?.stopListen?.()
      isListening.value = false
      toast.info('已停止剪贴板监听')
    } else {
      await window.electronAPI?.clipboard?.startListen?.()
      isListening.value = true
      toast.success('已开始监听剪贴板，复制微信内容后自动填充')
    }
  } catch (e) {
    console.error('[Reply] 切换监听状态失败:', e)
    toast.error('操作失败，请重试')
  }
}

const handleClipboardChange = (text: string) => {
  console.log('[Reply] 检测到剪贴板变化:', text.substring(0, 50))
  inputText.value = text
  // 自动触发生成（可选，这里只填充不自动生成）
  toast.info('已自动填充剪贴板内容')
}

const pasteFromClipboard = async () => {
  try {
    // 先检查是否有图片
    const hasImage = await window.electronAPI?.ocr?.hasImage?.()
    if (hasImage) {
      const imageData = await window.electronAPI?.ocr?.getImage?.()
      if (imageData) {
        pastedImage.value = imageData
        toast.success('已粘贴图片，AI 将分析图片内容')
        return
      }
    }

    // 没有图片则粘贴文本
    const text = await window.electronAPI?.clipboard?.getText?.()
    if (text) {
      inputText.value = text
      console.log('[Reply] 已从剪贴板粘贴内容')
    }
  } catch (e) {
    console.error('[Reply] 粘贴失败:', e)
  }
}

const handlePaste = async (event: ClipboardEvent) => {
  // 检查剪贴板中的图片
  const items = event.clipboardData?.items
  if (items) {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            pastedImage.value = e.target?.result as string
            toast.success('已粘贴图片，AI 将分析图片内容')
          }
          reader.readAsDataURL(file)
          event.preventDefault()
          return
        }
      }
    }
  }
}

const removeImage = () => {
  pastedImage.value = null
}

const generateReply = async () => {
  if (!inputText.value.trim() && !pastedImage.value) return

  isGenerating.value = true
  replies.value = []

  try {
    // 构建包含图片的提示
    let prompt = inputText.value
    if (pastedImage.value) {
      prompt = '[图片] ' + prompt
      toast.info('正在分析图片内容...')
    }

    console.log(`[Reply] 正在生成回复... 风格: ${selectedStyle.value}`)
    const result = await window.electronAPI?.ai?.generateReply?.(
      prompt,
      selectedStyle.value
    )

    if (result && result.length > 0) {
      replies.value = result
      console.log(`[Reply] ✅ 生成了 ${result.length} 条回复，风格:`, result.map(r => r.style))
    } else {
      // 兜底：如果 API 没返回，显示引导
      replies.value = [
        {
          style: 'friendly',
          reply: '请先在设置页面配置有效的 AI API Key'
        },
        {
          style: 'friendly',
          reply: '配置完成后点击「测试连接」验证是否可用'
        }
      ]
    }
  } catch (e) {
    console.error('[Reply] ❌ 生成失败:', e)
    replies.value = [
      {
        style: 'friendly',
        reply: '生成失败，请检查网络连接或 API 配置'
      }
    ]
  } finally {
    isGenerating.value = false
  }
}

const copyReply = async (reply: string) => {
  try {
    await window.electronAPI?.clipboard?.setText?.(reply)
    // 记录用户选择的回复风格
    const replyItem = replies.value.find(r => r.reply === reply)
    if (replyItem && replyItem.style !== 'all') {
      StyleLearner.recordChoice(replyItem.style)
    }
    toast.success('已复制到剪贴板')
  } catch (e) {
    console.error('[Reply] 复制失败:', e)
  }
}

const pasteReply = async (reply: string) => {
  try {
    await window.electronAPI?.clipboard?.setText?.(reply)
    await window.electronAPI?.clipboard?.paste?.()
    // 记录用户选择的回复风格
    const replyItem = replies.value.find(r => r.reply === reply)
    if (replyItem && replyItem.style !== 'all') {
      StyleLearner.recordChoice(replyItem.style)
    }
    console.log('[Reply] 已粘贴到微信')
  } catch (e) {
    console.error('[Reply] 粘贴失败:', e)
  }
}

const goToSettings = () => {
  router.push('/settings')
}
</script>

<style scoped>
.reply-page {
  min-height: 100%;
  padding: var(--space-4);
  background: var(--bg-secondary);
  transition: background var(--transition);
}

.section {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.header-actions {
  display: flex;
  gap: var(--space-2);
}

.listen-btn {
  padding: var(--space-1) var(--space-3);
  background: var(--warning-bg);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.listen-btn:hover {
  background: rgba(245, 158, 11, 0.15);
}

.listen-btn.active {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-color: transparent;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.section-title {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.quick-paste-btn {
  padding: var(--space-1) var(--space-3);
  background: var(--primary-bg);
  color: var(--primary);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.quick-paste-btn:hover {
  background: rgba(16, 185, 129, 0.15);
}

.image-preview-container {
  position: relative;
  margin-bottom: var(--space-3);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 2px dashed var(--border-color);
  transition: all var(--transition);
}

.pasted-image {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}

.remove-image-btn:hover {
  background: var(--error);
}

.result-count {
  font-size: var(--font-xs);
  color: var(--text-secondary);
}

.input-textarea {
  width: 100%;
  padding: var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  color: var(--text-primary);
  resize: none;
  outline: none;
  transition: all var(--transition);
}

.input-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.emotion-detected {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--secondary-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--secondary);
  flex-wrap: wrap;
}

.emotion-icon {
  font-size: var(--font-xl);
}

.emotion-text {
  font-size: var(--font-sm);
  color: var(--text-primary);
}

.emotion-text strong {
  color: var(--secondary);
}

.emotion-apply-btn {
  margin-left: auto;
  padding: var(--space-1) var(--space-3);
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.emotion-apply-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.scam-warning {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}

.scam-warning.medium {
  background: var(--warning-bg);
  border: 1px solid var(--warning);
}

.scam-warning.high {
  background: var(--error-bg);
  border: 1px solid var(--error);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.scam-icon {
  font-size: var(--font-xl);
}

.scam-text {
  flex: 1;
  font-size: var(--font-sm);
  color: var(--text-primary);
  line-height: 1.5;
}

.scam-warning.high .scam-text {
  color: var(--error);
  font-weight: 600;
}

.scam-warning.medium .scam-text {
  color: var(--warning);
}

.scam-confidence {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

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
  padding: var(--space-1) var(--space-3);
  background: var(--bg-primary);
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

.generate-btn {
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

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.reply-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: 2px solid var(--border-color);
  transition: all var(--transition-slow);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.reply-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.reply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.reply-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: var(--primary-gradient);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.style-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--primary-bg);
  color: var(--primary-dark);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 500;
  margin-left: var(--space-2);
}

.style-tag.all {
  background: var(--primary-gradient);
  color: white;
}

.style-tag.friendly {
  background: var(--primary-bg);
  color: var(--primary-dark);
}

.style-tag.formal {
  background: var(--info-bg);
  color: var(--info);
}

.style-tag.humorous {
  background: var(--warning-bg);
  color: var(--warning);
}

.style-tag.concise {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.style-tag.empathetic {
  background: var(--secondary-bg);
  color: var(--secondary-dark);
}

.reply-content {
  font-size: var(--font-md);
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
  font-weight: 500;
}

.reply-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-copy,
.btn-paste {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-copy {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-copy:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-paste {
  background: var(--primary-gradient);
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-paste:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.empty-tip {
  text-align: center;
  padding: var(--space-8) var(--space-5);
}

.tip-icon {
  font-size: 40px;
  display: block;
  margin-bottom: var(--space-3);
}

.tip-text {
  font-size: var(--font-md);
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

.btn-go-settings {
  padding: var(--space-2) var(--space-5);
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-go-settings:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>

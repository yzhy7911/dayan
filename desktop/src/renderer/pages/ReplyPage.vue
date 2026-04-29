<template>
  <div class="reply-page">
    <section class="hero-panel surface-panel">
      <div class="hero-copy">
        <p class="hero-eyebrow">Reply Studio</p>
        <h1 class="hero-title">难回的话，整理成可发送版本。</h1>
      </div>
      <div class="hero-metrics">
        <div class="metric-tile">
          <span class="metric-label">监听</span>
          <span class="metric-value">{{ isListening ? '开启' : '关闭' }}</span>
        </div>
        <div class="metric-tile">
          <span class="metric-label">风格</span>
          <span class="metric-value">{{ getStyleLabel(selectedStyle).replace('风格', '') }}</span>
        </div>
        <div class="metric-tile">
          <span class="metric-label">结果</span>
          <span class="metric-value">{{ replies.length }} 条</span>
        </div>
      </div>
    </section>

    <section class="composer-panel surface-panel">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">输入区</div>
          <h3 class="panel-title">贴聊天、截图或要回复的内容</h3>
        </div>
        <div class="head-actions">
          <button class="action-chip" :class="{ active: isListening }" @click="toggleListening">
            {{ isListening ? '停止' : '监听' }}
          </button>
          <button class="action-chip secondary" @click="pasteFromClipboard">
            粘贴
          </button>
        </div>
      </div>

      <div v-if="pastedImage" class="image-preview-container">
        <img :src="pastedImage" class="pasted-image" alt="粘贴的图片" />
        <button class="remove-image-btn" @click="removeImage">×</button>
      </div>

      <div v-if="parsedChats.length > 0" class="chat-parse-result">
        <div class="parse-header">
          <span class="parse-title">已解析的聊天记录</span>
          <button class="btn-refresh" @click="parseChatHistory">🔄 重新解析</button>
        </div>
        <div class="chat-list">
          <div
            v-for="(chat, index) in parsedChats"
            :key="index"
            :class="['chat-item', chat.isMe ? 'me' : 'other']"
          >
            <span class="chat-avatar">{{ chat.isMe ? '我' : '对方' }}</span>
            <div class="chat-content">
              <p>{{ chat.text }}</p>
            </div>
          </div>
        </div>
      </div>

      <textarea
        v-model="inputText"
        class="input-textarea"
        placeholder="粘贴聊天内容，或描述当前局面..."
        rows="5"
        @paste="handlePaste"
      ></textarea>

      <div v-if="detectedEmotion" class="signal-row emotion-row">
        <div class="signal-copy">
          <span class="signal-label">情绪信号</span>
          <span class="signal-text">{{ detectedEmotion }} · {{ Math.round(emotionConfidence * 100) }}%</span>
        </div>
        <button class="signal-btn" @click="applyEmotionStyle">应用推荐风格</button>
      </div>

      <div v-if="scamWarning" class="signal-row" :class="scamWarning.level === 'high' ? 'risk-high' : 'risk-medium'">
        <div class="signal-copy">
          <span class="signal-label">{{ scamWarning.level === 'high' ? '高风险提醒' : '风险提醒' }}</span>
          <span class="signal-text">{{ scamWarning.message }}</span>
        </div>
        <span class="confidence-pill">置信度 {{ Math.round(scamWarning.confidence * 100) }}%</span>
      </div>

      <div class="style-selector">
        <span class="style-label">风格模式</span>
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
        :disabled="!inputText.trim() && !pastedImage || isGenerating"
        @click="generateReply"
      >
        <span v-if="isGenerating">正在生成回复…</span>
        <span v-else>生成回复</span>
      </button>
    </section>

    <section class="results-panel surface-panel">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">输出区</div>
          <h3 class="panel-title">候选回复</h3>
        </div>
        <span class="result-count" v-if="replies.length > 0">{{ replies.length }} 条结果</span>
      </div>

      <div class="replies-list" v-if="replies.length > 0">
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
              复制
            </button>
            <button class="btn-paste" @click="pasteReply(reply.reply)">
              发送到微信
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state-card" v-else-if="!hasAPIKey()">
        <span class="empty-badge">未配置模型</span>
        <p class="empty-text">先完成 API 配置，回复工作台才会开始生成内容。</p>
        <button class="btn-go-settings" @click="goToSettings">
          前往设置
        </button>
      </div>

      <div class="empty-state-card muted" v-else>
        <span class="empty-badge">等待输入</span>
        <p class="empty-text">输入一段对话或贴一张截图，结果会出现在这里。</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

// 组件名称，用于 keep-alive 缓存
defineOptions({ name: 'Reply' })
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

// 聊天记录解析相关
interface ChatItem {
  text: string
  isMe: boolean
}
const parsedChats = ref<ChatItem[]>([])

// 情绪识别相关
const detectedEmotion = ref<string | null>(null)
const emotionConfidence = ref<number>(0)
const emotionSuggestions = ref<string[]>([])

// 反诈预警相关
const scamWarning = ref<ReturnType<typeof ScamDetector.analyze>>(null)

const styles = [
  { value: 'all', label: '全部风格' },
  { value: 'friendly', label: '友好' },
  { value: 'formal', label: '正式' },
  { value: 'humorous', label: '幽默' },
  { value: 'concise', label: '简洁' },
  { value: 'empathetic', label: '共情' }
]

const getStyleLabel = (style: string): string => {
  const styleMap: Record<string, string> = {
    all: '全部风格',
    friendly: '友好风格',
    formal: '正式风格',
    humorous: '幽默风格',
    concise: '简洁风格',
    empathetic: '共情风格'
  }
  return styleMap[style] || '默认风格'
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
    const hasImage = await window.electronAPI?.clipboard?.hasImage?.()
    if (hasImage) {
      const imageData = await window.electronAPI?.clipboard?.getImage?.()
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
  parsedChats.value = []
}

const parseChatHistory = () => {
  const text = inputText.value || pastedImage.value ? '' : ''
  if (!text) {
    parsedChats.value = []
    return
  }
  
  parsedChats.value = parseChatText(text)
}

const parseChatText = (text: string): ChatItem[] => {
  const result: ChatItem[] = []
  
  const lines = text.split('\n').filter(line => line.trim())
  
  let currentSpeaker: 'me' | 'other' | null = null
  let currentText = ''
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (trimmedLine.startsWith('我：') || trimmedLine.startsWith('我:') || trimmedLine.startsWith('我 ')) {
      if (currentSpeaker !== null && currentText) {
        result.push({ text: currentText.trim(), isMe: currentSpeaker === 'me' })
      }
      currentSpeaker = 'me'
      currentText = trimmedLine.replace(/^我[：:\s]/, '')
    } else if (trimmedLine.startsWith('对方：') || trimmedLine.startsWith('对方:') || 
               trimmedLine.startsWith('朋友：') || trimmedLine.startsWith('朋友:') ||
               trimmedLine.startsWith('他：') || trimmedLine.startsWith('他:') ||
               trimmedLine.startsWith('她：') || trimmedLine.startsWith('她:')) {
      if (currentSpeaker !== null && currentText) {
        result.push({ text: currentText.trim(), isMe: currentSpeaker === 'me' })
      }
      currentSpeaker = 'other'
      currentText = trimmedLine.replace(/^(对方|朋友|他|她)[：:\s]/, '')
    } else if (trimmedLine.match(/^[\u4e00-\u9fa5]{1,4}[：:]/)) {
      if (currentSpeaker !== null && currentText) {
        result.push({ text: currentText.trim(), isMe: currentSpeaker === 'me' })
      }
      const match = trimmedLine.match(/^([\u4e00-\u9fa5]{1,4})[：:]/)
      if (match && match[1] === '我') {
        currentSpeaker = 'me'
      } else {
        currentSpeaker = 'other'
      }
      currentText = trimmedLine.replace(/^[\u4e00-\u9fa5]{1,4}[：:]/, '')
    } else if (currentSpeaker !== null) {
      currentText += '\n' + trimmedLine
    } else {
      result.push({ text: trimmedLine, isMe: false })
    }
  }
  
  if (currentSpeaker !== null && currentText) {
    result.push({ text: currentText.trim(), isMe: currentSpeaker === 'me' })
  }
  
  return result
}

const formatChatForAI = (chats: ChatItem[]): string => {
  return chats.map(chat => {
    return `${chat.isMe ? '我' : '对方'}：${chat.text}`
  }).join('\n')
}

const generateReply = async () => {
  if (!inputText.value.trim() && !pastedImage.value) return

  isGenerating.value = true
  replies.value = []

  try {
    let context = inputText.value || ''

    // 如果有图片，先尝试用 OCR 识别
    if (pastedImage.value) {
      toast.info('正在分析图片内容...')
      console.log('[Reply] 正在进行 OCR 识别...')

      try {
        // 检查 OCR 是否可用
        const ocrAvailable = await window.electronAPI?.ocr?.hasImage?.()
        
        if (ocrAvailable) {
          // 使用 OCR 识别图片
          const ocrResult = await window.electronAPI?.ocr?.recognize?.(pastedImage.value)
          if (ocrResult && ocrResult.success && ocrResult.text.trim()) {
            context = ocrResult.text
            console.log('[Reply] OCR 识别成功:', context.substring(0, 100))
            
            // 解析识别到的聊天记录
            parsedChats.value = parseChatText(context)
            console.log('[Reply] 已解析到', parsedChats.value.length, '条聊天记录')
          } else {
            console.log('[Reply] OCR 未能识别图片中的文字，将图片发送给 AI 分析')
          }
        } else {
          // OCR 不可用，直接发送图片给 AI
          console.log('[Reply] OCR 不可用，将图片发送给 AI 分析')
        }
      } catch (ocrError) {
        console.error('[Reply] OCR 识别失败:', ocrError)
        console.log('[Reply] OCR 识别失败，将图片发送给 AI 分析')
      }
    }

    // 如果有解析到的聊天记录，使用整理后的格式
    if (parsedChats.value.length > 0) {
      context = formatChatForAI(parsedChats.value)
      console.log('[Reply] 整理后的聊天记录:', context.substring(0, 100))
    }

    console.log(`[Reply] 正在生成回复... 风格: ${selectedStyle.value}`)
    const result = await window.electronAPI?.ai?.generateReply?.(
      context,
      selectedStyle.value,
      pastedImage.value
    )

    if (result && result.length > 0) {
      replies.value = result
      console.log(`[Reply] 生成了 ${result.length} 条回复，风格:`, result.map(r => r.style))
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
  } catch (e: any) {
    console.error('[Reply] 生成失败:', e)
    replies.value = [
      {
        style: 'friendly',
        reply: e.message || '生成失败，请检查网络连接或 API 配置'
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
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background:
    radial-gradient(circle at top right, rgba(20, 184, 166, 0.16), transparent 26%),
    radial-gradient(circle at bottom left, rgba(194, 65, 12, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(247, 241, 233, 0.9) 100%);
}

.hero-eyebrow,
.panel-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.hero-title,
.panel-title {
  margin-top: 8px;
  font-size: var(--font-xl);
  line-height: 1.3;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.metric-tile {
  min-width: 0;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.64);
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.head-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.action-chip {
  min-height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 700;
  background: var(--primary-gradient);
  color: var(--text-inverse);
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.14);
  transition: all var(--transition);
}

.action-chip.secondary {
  background: rgba(255, 255, 255, 0.75);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  box-shadow: none;
}

.action-chip.active {
  background: linear-gradient(135deg, var(--secondary-light) 0%, var(--secondary) 100%);
}

.image-preview-container {
  position: relative;
  margin-bottom: var(--space-4);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.66);
}

.pasted-image {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(31, 27, 22, 0.78);
  color: white;
  font-size: 18px;
  transition: all var(--transition);
}

.remove-image-btn:hover {
  background: var(--error);
}

.input-textarea {
  width: 100%;
  min-height: 150px;
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  font-size: var(--font-md);
  color: var(--text-primary);
  resize: none;
  outline: none;
  transition: all var(--transition);
}

.input-textarea:focus {
  border-color: rgba(15, 118, 110, 0.5);
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
  background: rgba(255, 255, 255, 0.94);
}

.signal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}

.emotion-row {
  background: rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.18);
}

.risk-medium {
  background: var(--warning-bg);
  border: 1px solid rgba(180, 83, 9, 0.18);
}

.risk-high {
  background: var(--error-bg);
  border: 1px solid rgba(180, 35, 24, 0.18);
}

.signal-copy {
  flex: 1;
  min-width: 0;
}

.signal-label {
  display: block;
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-tertiary);
}

.signal-text {
  display: block;
  margin-top: 5px;
  font-size: var(--font-sm);
  color: var(--text-primary);
  line-height: 1.5;
}

.signal-btn,
.confidence-pill {
  flex-shrink: 0;
  min-height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 700;
}

.signal-btn {
  background: var(--primary-gradient);
  color: white;
}

.confidence-pill {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.7);
  color: var(--text-secondary);
}

.style-selector {
  margin-top: var(--space-4);
}

.style-label {
  font-size: var(--font-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
  display: block;
}

.style-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.style-btn {
  min-height: 34px;
  padding: 0 var(--space-3);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  font-weight: 500;
}

.style-btn:hover:not(.active) {
  border-color: rgba(15, 118, 110, 0.35);
  color: var(--text-primary);
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
  min-height: 46px;
  background: var(--primary-gradient);
  color: white;
  border-radius: var(--radius-lg);
  font-size: var(--font-md);
  font-weight: 600;
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
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 242, 234, 0.78) 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  border: 1px solid var(--border-color);
  transition: all var(--transition-slow);
  box-shadow: var(--shadow-sm);
}

.reply-card:hover {
  border-color: rgba(15, 118, 110, 0.24);
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
  background: rgba(15, 118, 110, 0.12);
  color: var(--primary-dark);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.style-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.74);
  color: var(--text-secondary);
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
  font-weight: 600;
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
  min-height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 700;
  transition: all var(--transition);
}

.btn-copy {
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-copy:hover {
  background: rgba(255, 255, 255, 0.98);
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

.empty-state-card {
  text-align: center;
  padding: var(--space-8) var(--space-5);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.56);
  border: 1px dashed var(--border-strong);
}

.empty-state-card.muted {
  background: rgba(255, 255, 255, 0.34);
}

.empty-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  background: var(--secondary-bg);
  color: var(--secondary-dark);
  font-size: var(--font-xs);
  font-weight: 700;
}

.empty-text {
  margin-top: var(--space-3);
  font-size: var(--font-md);
  color: var(--text-secondary);
  line-height: 1.6;
}

.btn-go-settings {
  min-height: 40px;
  margin-top: var(--space-4);
  padding: 0 var(--space-5);
  background: var(--primary-gradient);
  color: white;
  border-radius: var(--radius-lg);
  font-size: var(--font-sm);
  font-weight: 700;
  transition: all var(--transition);
}

.btn-go-settings:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

@media (max-width: 520px) {
  .reply-page {
    gap: var(--space-3);
  }

  .hero-panel,
  .composer-panel,
  .results-panel {
    padding: var(--space-4);
    border-radius: var(--radius-xl);
  }

  .hero-panel {
    gap: var(--space-3);
  }

  .hero-title {
    margin-top: 6px;
    line-height: 1.42;
    letter-spacing: 0;
  }

  .panel-title {
    margin-top: 6px;
    line-height: 1.4;
    letter-spacing: 0;
  }

  .hero-metrics {
    gap: var(--space-2);
  }

  .metric-tile {
    padding: 10px;
    border-radius: var(--radius-lg);
  }

  .metric-value {
    margin-top: 4px;
  }

  .panel-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .head-actions {
    width: 78px;
    flex-direction: column;
    gap: 6px;
  }

  .action-chip {
    width: 100%;
    min-height: 32px;
    padding: 0 10px;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }

  .input-textarea {
    min-height: 136px;
    padding: var(--space-3);
    border-radius: var(--radius-xl);
    line-height: 1.7;
  }

  .style-selector {
    margin-top: var(--space-3);
  }

  .style-label {
    margin-bottom: var(--space-2);
  }

  .style-buttons {
    gap: 7px;
  }

  .style-btn {
    min-height: 32px;
    padding: 0 12px;
  }

  .generate-btn {
    min-height: 42px;
    margin-top: var(--space-3);
    border-radius: var(--radius-lg);
  }

  .empty-state-card {
    padding: var(--space-6) var(--space-4);
  }
}
</style>

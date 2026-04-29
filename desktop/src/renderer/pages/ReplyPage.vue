<template>
  <div class="reply-page">
    <section class="hero-panel surface-panel">
      <div class="hero-copy">
        <p class="hero-eyebrow">Reply Studio</p>
        <h1 class="hero-title">把犹豫的瞬间，变成能直接发出的下一句。</h1>
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

      <div v-if="isParsingImage" class="parse-status">
        正在从图片里提取聊天对话...
      </div>

      <div v-if="parsedChats.length > 0" class="chat-parse-result">
        <div class="parse-header">
          <span class="parse-title">已解析的聊天记录</span>
          <button class="btn-refresh" @click="parseChatHistory">重新解析</button>
        </div>
        <div class="chat-list">
          <div
            v-for="(chat, index) in parsedChats"
            :key="index"
            :class="['chat-item', chat.isMe ? 'me' : 'other', { target: selectedTargetIndex === index }]"
          >
            <button class="chat-avatar" @click="toggleChatSpeaker(index)">{{ chat.isMe ? '我' : '对方' }}</button>
            <div class="chat-content">
              <textarea
                v-model="chat.text"
                class="chat-edit"
                rows="2"
              ></textarea>
              <div class="chat-tools">
                <button class="chat-tool-btn" :class="{ active: selectedTargetIndex === index }" @click="selectReplyTarget(index)">
                  回复这句
                </button>
                <button class="chat-tool-btn" @click="removeParsedChat(index)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="textarea-wrap">
        <textarea
          v-model="inputText"
          class="input-textarea"
          :placeholder="parsedChats.length > 0 ? '可补充当前局面、你的想法或想达到的效果...' : '粘贴聊天内容，或描述当前局面...'"
          rows="5"
          @paste="handlePaste"
        ></textarea>
        <button v-if="inputText" class="clear-text-btn" @click="clearInputText">
          清空
        </button>
      </div>

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

      <div class="intent-selector">
        <span class="style-label">回复目标</span>
        <div class="style-buttons">
          <button
            v-for="intent in replyIntents"
            :key="intent.value"
            class="style-btn intent-btn"
            :class="{ active: selectedIntent === intent.value }"
            @click="selectedIntent = intent.value"
          >
            {{ intent.label }}
          </button>
        </div>
      </div>

      <button
        class="generate-btn"
        :disabled="!canGenerate || isGenerating"
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
            <button class="btn-copy" :disabled="isRerollingIndex === index" @click="rerollReply(index)">
              {{ isRerollingIndex === index ? '生成中' : '换一句' }}
            </button>
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
import { computed, ref, onActivated, onDeactivated, onMounted, onUnmounted, watch } from 'vue'

// 组件名称，用于 keep-alive 缓存
defineOptions({ name: 'Reply' })
import { useRouter } from 'vue-router'
import { hasAPIKey } from '../utils/storage'
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
const isRerollingIndex = ref<number | null>(null)
const isListening = ref(false)
const pastedImage = ref<string | null>(null)
const isParsingImage = ref(false)
const lastOCRText = ref('')
const lastOCRLines = ref<OCRLine[]>([])
const lastOCRSize = ref({ width: 0, height: 0 })
const selectedTargetIndex = ref<number | null>(null)
const selectedIntent = ref('natural')
const canGenerate = computed(() => parsedChats.value.length > 0 || inputText.value.trim() || pastedImage.value)

// 聊天记录解析相关
interface ChatItem {
  text: string
  isMe: boolean
}
interface OCRLine {
  text: string
  confidence?: number
  box?: {
    x: number
    y: number
    width: number
    height: number
  }
}
interface ConversationBounds {
  left: number
  right: number
  top: number
  bottom: number
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

const replyIntents = [
  { value: 'natural', label: '自然接话' },
  { value: 'comfort', label: '安抚' },
  { value: 'explain', label: '解释' },
  { value: 'decline', label: '拒绝' },
  { value: 'advance', label: '推进' },
  { value: 'end', label: '收尾' }
]

const getIntentLabel = (intent: string): string => {
  return replyIntents.find(item => item.value === intent)?.label || '自然接话'
}

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

onActivated(() => {
  console.log('[Reply] 页面已激活')
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
  stopReplyListening()
})

onDeactivated(() => {
  stopReplyListening()
})

const stopReplyListening = async () => {
  if (!isListening.value) return

  try {
    await window.electronAPI?.clipboard?.stopListen?.()
  } catch (e) {
    console.error('[Reply] 停止监听失败:', e)
  } finally {
    isListening.value = false
  }
}

const toggleListening = async () => {
  try {
    if (isListening.value) {
      await stopReplyListening()
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
        await setPastedImage(imageData)
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
          reader.onload = async (e) => {
            await setPastedImage(e.target?.result as string)
          }
          reader.readAsDataURL(file)
          event.preventDefault()
          return
        }
      }
    }
  }
}

const setPastedImage = async (imageData: string) => {
  pastedImage.value = imageData
  inputText.value = ''
  lastOCRText.value = ''
  lastOCRLines.value = []
  lastOCRSize.value = { width: 0, height: 0 }
  parsedChats.value = []
  toast.info('已粘贴图片，正在提取聊天内容')
  await extractChatFromImage()
}

const removeImage = () => {
  pastedImage.value = null
  parsedChats.value = []
  selectedTargetIndex.value = null
  lastOCRText.value = ''
  lastOCRLines.value = []
  lastOCRSize.value = { width: 0, height: 0 }
}

const clearInputText = () => {
  inputText.value = ''
  detectedEmotion.value = null
  emotionConfidence.value = 0
  emotionSuggestions.value = []
  scamWarning.value = null
}

const extractChatFromImage = async () => {
  if (!pastedImage.value) return

  isParsingImage.value = true
  try {
    const ocrResult = await window.electronAPI?.ocr?.recognize?.(pastedImage.value)
    if (ocrResult?.success && ocrResult.text.trim()) {
      lastOCRText.value = ocrResult.text
      lastOCRLines.value = ocrResult.lines || []
      lastOCRSize.value = {
        width: ocrResult.width || 0,
        height: ocrResult.height || 0
      }

      parsedChats.value = parseChatFromOCR(lastOCRLines.value, lastOCRSize.value, lastOCRText.value)
      if (parsedChats.value.length > 0) {
        selectedTargetIndex.value = getDefaultReplyTargetIndex(parsedChats.value)
        toast.success(`已提取 ${parsedChats.value.length} 条对话`)
      } else {
        inputText.value = cleanOCRText(lastOCRText.value)
        toast.info('未能明确区分对话双方，已保留识别到的主要文字')
      }
    } else {
      toast.error('图片中没有识别到可用文字')
    }
  } catch (e) {
    console.error('[Reply] 图片对话提取失败:', e)
    toast.error('图片提取失败，请重试或手动粘贴文字')
  } finally {
    isParsingImage.value = false
  }
}

const parseChatHistory = () => {
  if (lastOCRLines.value.length > 0) {
    parsedChats.value = parseChatFromOCR(lastOCRLines.value, lastOCRSize.value, lastOCRText.value)
  } else {
    parsedChats.value = parseChatText(inputText.value)
  }

  if (parsedChats.value.length > 0) {
    selectedTargetIndex.value = getDefaultReplyTargetIndex(parsedChats.value)
    inputText.value = ''
  }
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

const parseChatFromOCR = (lines: OCRLine[], size: { width: number; height: number }, fallbackText: string): ChatItem[] => {
  if (!lines.length || !size.width) {
    return parseChatText(cleanOCRText(fallbackText))
  }

  const bounds = detectConversationBounds(lines, size)

  const usableLines = lines
    .filter(line => line.text && !isNoiseOCRLine(line.text))
    .filter(line => {
      if (!line.box || !size.height) return false
      const yCenter = line.box.y + line.box.height / 2
      const xCenter = line.box.x + line.box.width / 2
      return xCenter >= bounds.left &&
        xCenter <= bounds.right &&
        yCenter >= bounds.top &&
        yCenter <= bounds.bottom
    })
    .filter(line => !isNonMessageOCRLine(line, bounds))
    .sort((a, b) => {
      const ay = a.box?.y ?? 0
      const by = b.box?.y ?? 0
      if (Math.abs(ay - by) > 10) return ay - by
      return (a.box?.x ?? 0) - (b.box?.x ?? 0)
    })

  const chats: ChatItem[] = []
  let current: ChatItem | null = null
  let currentBottom = -Infinity

  for (const line of usableLines) {
    const text = normalizeChatText(line.text)
    if (!text) continue

    const box = line.box
    const centerX = box ? box.x + box.width / 2 : (bounds.left + bounds.right) / 2
    const isMe = centerX > bounds.left + (bounds.right - bounds.left) * 0.56
    const bottom = box ? box.y + box.height : currentBottom
    const lineHeight = box?.height || 24
    const shouldMerge = current && current.isMe === isMe && box && box.y - currentBottom < lineHeight * 1.25

    if (shouldMerge && current) {
      current.text = `${current.text}\n${text}`
    } else {
      current = { text, isMe }
      chats.push(current)
    }

    currentBottom = Math.max(currentBottom, bottom)
  }

  return mergeShortOCRFragments(chats)
}

const detectConversationBounds = (lines: OCRLine[], size: { width: number; height: number }): ConversationBounds => {
  const width = size.width || 1
  const height = size.height || 1
  const aspectRatio = width / height
  const hasDesktopSidebar = aspectRatio > 1.15
  const appRailLeft = detectAppLeftRail(lines, width, height)
  const desktopChatLeft = hasDesktopSidebar ? detectDesktopChatLeft(lines, width, height) : 0
  const left = Math.max(appRailLeft, desktopChatLeft)
  const top = detectChatTop(lines, height)
  const bottom = detectChatBottom(lines, height, top)

  return {
    left,
    right: width,
    top,
    bottom
  }
}

const detectAppLeftRail = (lines: OCRLine[], width: number, height: number): number => {
  const navLines = lines
    .filter(line => line.box && line.box.x < width * 0.24 && line.box.y > height * 0.04 && line.box.y < height * 0.98)
    .filter(line => /^(DESK|回复|军师|联系人|润色|话术|历史|设置|DY)$/.test(normalizeChatText(line.text)))
    .map(line => line.box!.x + line.box!.width)
    .sort((a, b) => b - a)

  if (navLines.length >= 2) {
    return Math.min(width * 0.32, Math.max(width * 0.18, navLines[0] + width * 0.035))
  }

  return 0
}

const detectDesktopChatLeft = (lines: OCRLine[], width: number, height: number): number => {
  const rightSideLines = lines
    .filter(line => line.box && line.box.y > height * 0.06 && line.box.y < height * 0.92)
    .filter(line => !isNoiseOCRLine(line.text))
    .map(line => line.box!.x)
    .filter(x => x > width * 0.22)
    .sort((a, b) => a - b)

  if (rightSideLines.length >= 2) {
    return Math.max(width * 0.26, Math.min(width * 0.48, rightSideLines[0] - width * 0.04))
  }

  return width * 0.30
}

const detectChatTop = (lines: OCRLine[], height: number): number => {
  const titleBottom = lines
    .filter(line => line.box && isHeaderOCRLine(line.text))
    .map(line => line.box!.y + line.box!.height)
    .sort((a, b) => b - a)[0]

  if (titleBottom && titleBottom < height * 0.24) {
    return titleBottom + height * 0.025
  }

  return height * 0.08
}

const detectChatBottom = (lines: OCRLine[], height: number, top: number): number => {
  const inputTop = lines
    .filter(line => line.box && line.box.y > Math.max(top, height * 0.45))
    .filter(line => isInputAreaOCRLine(line.text))
    .map(line => line.box!.y)
    .sort((a, b) => a - b)[0]

  if (inputTop) {
    return Math.max(top, inputTop - height * 0.025)
  }

  return height * 0.92
}

const normalizeChatText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[·•。,\s]+/, '')
    .replace(/[|｜]+/g, '')
    .trim()
}

const cleanOCRText = (text: string): string => {
  return text
    .split('\n')
    .map(normalizeChatText)
    .filter(line => line && !isNoiseOCRLine(line))
    .join('\n')
}

const isNoiseOCRLine = (text: string): boolean => {
  const clean = normalizeChatText(text)
  if (!clean) return true
  if (isSpeakerTimeOCRLine(clean)) return true
  if (isVoiceDurationOCRLine(clean)) return true
  if (isMediaPlaceholderOCRLine(clean)) return true
  if (/^\d{1,2}:\d{2}$/.test(clean)) return true
  if (/^(微信|通讯录|发现|我|聊天信息|发送|按住说话|\+|返回|更多|语音|表情|文件传输助手)$/.test(clean)) return true
  if (/^(今天|昨天|周[一二三四五六日天]|星期[一二三四五六日天])\s*\d{1,2}:\d{2}$/.test(clean)) return true
  if (clean.length <= 1 && !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(clean)) return true
  return false
}

const isNonMessageOCRLine = (line: OCRLine, bounds: ConversationBounds): boolean => {
  const clean = normalizeChatText(line.text)
  if (!line.box || !clean) return false
  if (isSpeakerTimeOCRLine(clean)) return true

  const panelWidth = bounds.right - bounds.left
  const xCenter = line.box.x + line.box.width / 2
  const inLeftAvatarLane = xCenter < bounds.left + panelWidth * 0.24
  const inRightAvatarLane = xCenter > bounds.right - panelWidth * 0.18
  const compactBox = line.box.width < panelWidth * 0.18 && line.box.height < 58

  return compactBox && (inLeftAvatarLane || inRightAvatarLane) && isAvatarTextOCRLine(clean)
}

const isSpeakerTimeOCRLine = (text: string): boolean => {
  const clean = text.replace(/\s+/g, '')
  return /^[@#]?[A-Za-z0-9_\-\u4e00-\u9fa5]{1,10}\d{1,2}:\d{2}$/.test(clean) ||
    /^[@#]?[A-Za-z0-9_\-\u4e00-\u9fa5]{1,10}[：:]\d{1,2}$/.test(clean)
}

const isAvatarTextOCRLine = (text: string): boolean => {
  const clean = text.replace(/\s+/g, '')
  return /^[A-Z]{1,3}$/.test(clean) ||
    /^[@#]?[A-Za-z0-9_\-\u4e00-\u9fa5]{1,8}$/.test(clean)
}

const isVoiceDurationOCRLine = (text: string): boolean => {
  const clean = text
    .replace(/[（）()\[\]【】]/g, '')
    .replace(/\s+/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/″/g, '"')
    .trim()

  return /^\d{1,3}["']+$/.test(clean) ||
    /^\d{1,2}'\d{1,2}"?$/.test(clean) ||
    /^\d{1,3}(秒|s|S)$/.test(clean)
}

const isMediaPlaceholderOCRLine = (text: string): boolean => {
  const clean = text
    .replace(/[（）()\[\]【】]/g, '')
    .replace(/\s+/g, '')
    .trim()

  return /^(图片|视频|照片|相册|文件|表情|位置|名片|链接|小程序|语音消息|视频消息)$/.test(clean) ||
    /^(收到|发送)?(一张|1张|一个|1个)?(图片|视频|照片|文件|表情|位置|名片|链接|小程序)$/.test(clean)
}

const isHeaderOCRLine = (text: string): boolean => {
  const clean = normalizeChatText(text)
  return /^(微信|WeChat|聊天信息|返回|更多|搜索|\d+)$/.test(clean)
}

const isInputAreaOCRLine = (text: string): boolean => {
  const clean = normalizeChatText(text)
  return /^(发送|按住说话|输入|语音|表情|\+|聊天信息)$/.test(clean) ||
    /^(发送消息|请输入|输入消息|说点什么)/.test(clean)
}

const mergeShortOCRFragments = (chats: ChatItem[]): ChatItem[] => {
  const merged: ChatItem[] = []

  for (const chat of chats) {
    const previous = merged[merged.length - 1]
    if (previous && previous.isMe === chat.isMe && chat.text.length <= 4) {
      previous.text = `${previous.text}\n${chat.text}`
    } else {
      merged.push({ ...chat })
    }
  }

  return merged.filter(chat => {
    const text = normalizeChatText(chat.text)
    return text && !isVoiceDurationOCRLine(text) && !isMediaPlaceholderOCRLine(text)
  })
}

const formatChatForAI = (chats: ChatItem[]): string => {
  return chats.map((chat, index) => {
    const targetMark = selectedTargetIndex.value === index ? '【回复目标】' : ''
    return `${targetMark}${chat.isMe ? '我' : '对方'}：${chat.text}`
  }).join('\n')
}

const getDefaultReplyTargetIndex = (chats: ChatItem[]): number | null => {
  for (let i = chats.length - 1; i >= 0; i--) {
    if (!chats[i].isMe) return i
  }
  return chats.length > 0 ? chats.length - 1 : null
}

const selectReplyTarget = (index: number) => {
  selectedTargetIndex.value = selectedTargetIndex.value === index ? null : index
}

const toggleChatSpeaker = (index: number) => {
  parsedChats.value[index].isMe = !parsedChats.value[index].isMe
}

const removeParsedChat = (index: number) => {
  parsedChats.value.splice(index, 1)
  if (selectedTargetIndex.value === index) {
    selectedTargetIndex.value = getDefaultReplyTargetIndex(parsedChats.value)
  } else if (selectedTargetIndex.value !== null && selectedTargetIndex.value > index) {
    selectedTargetIndex.value -= 1
  }
}

const buildReplyContext = (): string => {
  const base = parsedChats.value.length > 0 ? formatChatForAI(parsedChats.value) : inputText.value
  const extra = parsedChats.value.length > 0 && inputText.value.trim() ? `\n\n【补充说明】${inputText.value.trim()}` : ''
  const intent = selectedIntent.value !== 'natural' ? `\n\n【这次回复目标】${getIntentLabel(selectedIntent.value)}` : ''
  const target = selectedTargetIndex.value !== null ? '\n\n请优先回复标记为【回复目标】的那一句。' : ''
  return `${base}${extra}${intent}${target}`.trim()
}

const generateReply = async () => {
  if (!canGenerate.value) return

  isGenerating.value = true
  replies.value = []

  try {
    let context = buildReplyContext()

    // 如果有图片，先尝试用 OCR 识别
    if (pastedImage.value) {
      if (parsedChats.value.length === 0 && !isParsingImage.value) {
        toast.info('正在从图片提取聊天内容...')
        await extractChatFromImage()
      }
    }

    // 如果有解析到的聊天记录，使用整理后的格式
    if (parsedChats.value.length > 0) {
      context = buildReplyContext()
      console.log('[Reply] 整理后的聊天记录:', context.substring(0, 100))
    }

    const imageForAI = context.trim() ? undefined : pastedImage.value || undefined

    console.log(`[Reply] 正在生成回复... 风格: ${selectedStyle.value}`)
    const result = await window.electronAPI?.ai?.generateReply?.(
      context,
      selectedStyle.value,
      imageForAI
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

const rerollReply = async (index: number) => {
  const current = replies.value[index]
  if (!current || isRerollingIndex.value !== null) return

  isRerollingIndex.value = index
  try {
    const result = await window.electronAPI?.ai?.generateReply?.(
      buildReplyContext(),
      current.style,
      undefined
    )
    if (result?.[0]?.reply) {
      replies.value[index] = { style: current.style, reply: result[0].reply }
    }
  } catch (e: any) {
    console.error('[Reply] 换一句失败:', e)
    toast.error(e.message || '换一句失败')
  } finally {
    isRerollingIndex.value = null
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

.parse-status {
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: rgba(15, 118, 110, 0.08);
  border: 1px solid rgba(15, 118, 110, 0.16);
  color: var(--primary-dark);
  font-size: var(--font-sm);
  font-weight: 700;
}

.chat-parse-result {
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid var(--border-color);
}

.parse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.parse-title {
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-secondary);
}

.btn-refresh {
  min-height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.chat-item {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.chat-item.me {
  flex-direction: row-reverse;
}

.chat-item.target .chat-content {
  border-color: rgba(15, 118, 110, 0.42);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.08);
}

.chat-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: rgba(148, 135, 122, 0.14);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
  cursor: pointer;
}

.chat-item.me .chat-avatar {
  background: rgba(15, 118, 110, 0.12);
  color: var(--primary-dark);
}

.chat-content {
  max-width: calc(100% - 48px);
  padding: 9px 12px;
  border-radius: var(--radius-lg);
  background: white;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-item.me .chat-content {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.18);
}

.chat-edit {
  width: 100%;
  min-height: 40px;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: var(--font-sm);
  line-height: 1.55;
  resize: vertical;
}

.chat-tools {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.chat-tool-btn {
  min-height: 24px;
  padding: 0 9px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 700;
}

.chat-tool-btn.active {
  background: rgba(15, 118, 110, 0.12);
  border-color: rgba(15, 118, 110, 0.28);
  color: var(--primary-dark);
}

.textarea-wrap {
  position: relative;
}

.input-textarea {
  width: 100%;
  min-height: 150px;
  padding: var(--space-4);
  padding-right: 64px;
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

.clear-text-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}

.clear-text-btn:hover {
  color: var(--error);
  border-color: rgba(180, 35, 24, 0.22);
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

.intent-selector {
  margin-top: var(--space-4);
}

.intent-btn {
  min-width: 68px;
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

.btn-copy:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

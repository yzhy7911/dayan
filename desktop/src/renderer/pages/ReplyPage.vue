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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { hasAPIKey } from '../utils/storage'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()
const inputText = ref('')
const selectedStyle = ref('all')
const isGenerating = ref(false)
const replies = ref<{ style: string; reply: string }[]>([])
const isListening = ref(false)
const pastedImage = ref<string | null>(null)

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
  // 注册剪贴板变化监听
  window.electronAPI?.clipboard?.onChanged?.((text: string) => {
    if (isListening.value && text && text.trim()) {
      handleClipboardChange(text)
    }
  })
})

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
    // 简单的成功提示（可以替换为更好的 Toast）
    toast.success('已复制到剪贴板')
  } catch (e) {
    console.error('[Reply] 复制失败:', e)
  }
}

const pasteReply = async (reply: string) => {
  try {
    await window.electronAPI?.clipboard?.setText?.(reply)
    await window.electronAPI?.clipboard?.paste?.()
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
  padding: 16px;
  background: var(--bg-secondary);
}

.section {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
  transition: background var(--transition);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.listen-btn {
  padding: 6px 12px;
  background: var(--warning-bg);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
  font-size: 12px;
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
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.quick-paste-btn {
  padding: 6px 12px;
  background: var(--primary-bg);
  color: var(--primary);
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.quick-paste-btn:hover {
  background: rgba(16, 185, 129, 0.15);
}

.image-preview-container {
  position: relative;
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px dashed var(--border-color);
}

.pasted-image {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
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
  font-size: 12px;
  color: var(--text-secondary);
}

.input-textarea {
  width: 100%;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  resize: none;
  outline: none;
  transition: all var(--transition);
}

.input-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.style-selector {
  margin-top: 16px;
}

.style-label {
  font-size: 13px;
  color: #6b7280;
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
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.style-btn.active {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.generate-btn {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  transition: all 0.25s ease;
  cursor: pointer;
}

.reply-card:hover {
  border-color: #10b981;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
}

.reply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.reply-index {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background: #10b981;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.style-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #d1fae5;
  color: #059669;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
}

.style-tag.all {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.style-tag.friendly {
  background: #d1fae5;
  color: #059669;
}

.style-tag.formal {
  background: #dbeafe;
  color: #2563eb;
}

.style-tag.humorous {
  background: #fef3c7;
  color: #d97706;
}

.style-tag.concise {
  background: #e5e7eb;
  color: #4b5563;
}

.style-tag.empathetic {
  background: #fce7f3;
  color: #db2777;
}

.reply-content {
  font-size: 14px;
  line-height: 1.6;
  color: #1f2937;
  margin-bottom: 12px;
}

.reply-actions {
  display: flex;
  gap: 8px;
}

.btn-copy,
.btn-paste {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy {
  background: #f3f4f6;
  color: #4b5563;
}

.btn-copy:hover {
  background: #e5e7eb;
}

.btn-paste {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.btn-paste:hover {
  background: rgba(16, 185, 129, 0.15);
}

.empty-tip {
  text-align: center;
  padding: 30px 20px;
}

.tip-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.tip-text {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
}

.btn-go-settings {
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
</style>

<template>
  <div v-if="visible" class="ocr-modal-overlay" @click.self="close">
    <div class="ocr-modal">
      <div class="modal-header">
        <div class="modal-title">📸 屏幕识别结果</div>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <div class="loading-text">正在识别屏幕内容...</div>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-text">{{ error }}</div>
        <button class="retry-btn" @click="startCapture">重新识别</button>
      </div>

      <div v-else class="result-content">
        <div class="stats-bar">
          <span>识别到 {{ messages.length }} 条对话，共 {{ lines.length }} 行文字</span>
          <button class="refresh-btn" @click="startCapture">🔄 重新截图</button>
        </div>

        <div class="result-tabs">
          <button
            :class="{ active: activeTab === 'parsed' }"
            @click="activeTab = 'parsed'"
          >
            结构化对话
          </button>
          <button
            :class="{ active: activeTab === 'raw' }"
            @click="activeTab = 'raw'"
          >
            原始文本
          </button>
        </div>

        <!-- 结构化对话 -->
        <div v-if="activeTab === 'parsed'" class="parsed-result">
          <div v-if="messages.length === 0" class="empty-hint">
            未识别到对话格式，请检查是否选中聊天窗口
          </div>

          <div v-else class="message-list">
            <div
              v-for="(msg, idx) in messages"
              :key="idx"
              :class="['message-item', { selected: selectedIds.includes(idx) }]"
              @click="toggleSelect(idx)"
            >
              <div class="msg-header">
                <span class="msg-speaker">{{ msg.speaker }}</span>
                <span v-if="msg.time" class="msg-time">{{ msg.time }}</span>
              </div>
              <div class="msg-content">{{ msg.content }}</div>
            </div>
          </div>
        </div>

        <!-- 原始文本 -->
        <div v-else class="raw-result">
          <textarea
            v-model="rawText"
            class="raw-textarea"
            placeholder="OCR 原始识别结果..."
          ></textarea>
          <button class="parse-btn" @click="reparse">🔍 重新解析</button>
        </div>
      </div>

      <div class="modal-footer">
        <div class="select-info">
        <span v-if="selectedIds.length > 0">已选中 {{ selectedIds.length }} 条</span>
        <span v-else>点击可选择需要导入的对话</span>
        </div>
        <div class="footer-buttons">
          <button class="btn-secondary" @click="close">取消</button>
          <button
            class="btn-primary"
            :disabled="messages.length === 0"
            @click="importToCoach"
          >
            🧠 导入军师分析
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'import', messages: any[]): void
}>()

const visible = ref(false)
const loading = ref(false)
const error = ref('')
const rawText = ref('')
const lines = ref<any[]>([])
const messages = ref<any[]>([])
const activeTab = ref<'parsed' | 'raw'>('parsed')
const selectedIds = ref<number[]>([])

const ipc = (window as any).electronAPI

// 开始识别（带重试机制，解决时序问题）
async function startCapture(retryCount = 0) {
  loading.value = true
  error.value = ''
  selectedIds.value = []

  try {
    console.log('[OCR] 发起调用，重试次数:', retryCount)
    const result = await ipc?.invoke('ocr:captureAndRecognize')

    if (result?.success) {
      rawText.value = result.rawText
      lines.value = result.lines
      messages.value = result.messages

      // 默认全选
      selectedIds.value = messages.value.map((_, i) => i)
    } else {
      error.value = result?.error || '识别失败'
    }
  } catch (e: any) {
    error.value = e.message || '识别异常'
  } finally {
    loading.value = false
  }
}

// 重新解析
async function reparse() {
  try {
    const result = await ipc?.invoke('ocr:parseChat', rawText.value)
    if (result?.success) {
      messages.value = result.messages
      selectedIds.value = messages.value.map((_, i) => i)
    }
  } catch (e) {
    console.error('解析失败', e)
  }
}

// 切换选中
function toggleSelect(idx: number) {
  const pos = selectedIds.value.indexOf(idx)
  if (pos >= 0) {
    selectedIds.value.splice(pos, 1)
  } else {
    selectedIds.value.push(idx)
  }
}

// 导入军师
function importToCoach() {
  const selected = selectedIds.value.map(i => messages.value[i])
  emit('import', selected)
  close()
}

function close() {
  visible.value = false
  emit('close')
}

function open() {
  visible.value = true
  startCapture()
}

// 监听主进程触发的 OCR
if (ipc?.on) {
  ipc.on('ocr:trigger', () => {
    open()
  })
}

defineExpose({ open })
</script>

<style scoped>
.ocr-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.ocr-modal {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: var(--bg-primary);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--error);
  color: white;
}

/* 加载状态 */
.loading-state {
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: var(--text-secondary);
  font-size: 14px;
}

/* 错误状态 */
.error-state {
  padding: 40px 20px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-text {
  color: var(--error);
  margin-bottom: 20px;
}

.retry-btn {
  padding: 8px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* 结果内容 */
.result-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.refresh-btn {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
}

.result-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 12px;
}

.result-tabs button {
  padding: 6px 14px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.result-tabs button.active {
  background: var(--primary-bg);
  color: var(--primary);
  font-weight: 500;
}

.parsed-result {
  min-height: 200px;
}

.empty-hint {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-item {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.message-item:hover {
  background: var(--bg-tertiary);
}

.message-item.selected {
  border-color: var(--primary);
  background: var(--primary-bg);
}

.msg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.msg-speaker {
  font-weight: 600;
  color: var(--primary);
  font-size: 13px;
}

.msg-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.msg-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
}

.raw-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.raw-textarea {
  width: 100%;
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.parse-btn {
  align-self: flex-start;
  padding: 6px 16px;
  background: var(--secondary-bg);
  color: var(--secondary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

/* 底部按钮 */
.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.select-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.footer-buttons {
  display: flex;
  gap: 10px;
}

.btn-secondary {
  padding: 8px 20px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  padding: 8px 20px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<template>
  <div class="coach-page">
    <!-- OCR 功能暂隐藏，待后续优化
    <OCRResultModal ref="ocrModalRef" @import="handleOCRImport" />
    -->

    <div class="top-bar">
      <select v-model="currentGoalId" @change="onGoalChange">
        <option value="">选择目标</option>
        <option v-for="goal in goals" :key="goal.id" :value="goal.id">{{ goal.name }}</option>
      </select>
      <div class="top-bar-actions">
        <button class="icon-btn" @click="showNewGoalModal = true" title="新建">新增</button>
        <button v-if="currentGoal" class="icon-btn" @click="openEditGoalModal" title="编辑">编辑</button>
        <button v-if="currentGoal" class="icon-btn danger" @click="confirmDeleteGoal" title="删除">删除</button>
      </div>
    </div>

    <section class="coach-reason">
      <div>
        <p class="reason-kicker">Chat Coach</p>
        <h1 class="reason-title">看懂对方真正想什么，再决定下一步怎么说。</h1>
      </div>
      <p class="reason-copy">适合关系推进、客户沟通和拉扯局面：整理聊天记录后，帮你判断意图、风险和可用策略。</p>
    </section>

    <!-- 剪贴板监听模式栏 -->
    <div v-if="currentGoal" class="clipboard-monitor-bar" :class="{ active: isMonitorActive }">
      <span class="monitor-status">
        <span class="status-dot"></span>
        {{ isMonitorActive ? '正在监听剪贴板...' : '剪贴板监听' }}
      </span>
      <button class="monitor-toggle-btn" @click="toggleMonitor">
        {{ isMonitorActive ? '停止' : '开始' }}
      </button>
    </div>

    <!-- 剪贴板监听提示 -->
    <div v-if="isMonitorActive && lastCopiedText" class="clipboard-toast">
      <span class="clipboard-preview">{{ lastCopiedText.substring(0, 35) }}{{ lastCopiedText.length > 35 ? '...' : '' }}</span>
      <div class="clipboard-buttons">
        <button v-if="lastCopiedChats.length" class="clipboard-add-btn them" @click="importLastCopiedChats">
          导入
        </button>
        <button v-if="!lastCopiedChats.length" class="clipboard-add-btn them" @click="addLastCopiedAsThem">
          对方
        </button>
        <button v-if="!lastCopiedChats.length" class="clipboard-add-btn me" @click="addLastCopiedAsMe">
          我
        </button>
      </div>
    </div>

    <div v-if="currentGoal" class="content">
      <!-- 顶部技能选择器 -->
      <section class="coach-workbench">
        <div class="skill-selector">
          <span class="skill-label">军师技能</span>
          <select v-model="selectedSkill" class="skill-select">
            <option value="">默认分析</option>
            <option v-for="skill in availableSkills" :key="skill">{{ skill }}</option>
          </select>
          <div class="coach-mode-switch">
            <button
              v-for="mode in responseModes"
              :key="mode.value"
              :class="{ active: responseMode === mode.value }"
              @click="setResponseMode(mode.value)"
            >
              {{ mode.label }}
            </button>
          </div>
          <button class="call-open-btn" @click="openCallPanel">
            通话
          </button>
        </div>

        <div class="coach-input-card">
          <textarea v-model="inputText" placeholder="输入对方说的话..." rows="3" @keydown.ctrl.enter="sendMessage"></textarea>
          <div v-if="coachModeSuggestion && coachModeSuggestion !== responseMode" class="coach-mode-hint">
            <span>建议切到「{{ responseModeLabelByValue(coachModeSuggestion) }}」来处理当前内容。</span>
            <button @click="setResponseMode(coachModeSuggestion)">一键切换</button>
          </div>
          <div class="input-footer">
            <span>{{ selectedSkill || '默认分析' }} · {{ responseModeLabel }}</span>
            <button :disabled="!inputText.trim() || isSending" @click="sendMessage">
              {{ isSending ? `${responseModeLabel}分析中...` : '发送分析' }}
            </button>
          </div>
        </div>
      </section>

      <div v-if="showCallPanel" class="call-panel">
        <div class="call-head">
          <div>
            <div class="call-kicker">通话军师</div>
            <div class="call-title">边转述，边拿到下一步建议</div>
          </div>
          <span class="call-state-pill" :class="{ listening: isListeningSpeech, analyzing: isCallAnalyzing }">
            {{ callStateText }}
          </span>
          <span class="call-asr-status" :class="{ ready: asrStatus?.available }">
            {{ asrStatus?.available ? '本地离线' : '需本地识别库' }}
          </span>
          <button class="call-close-btn" @click="closeCallPanel">结束</button>
        </div>

        <div class="call-controls">
          <div class="speaker-switch">
            <button :class="{ active: callSpeaker === 'them' }" @click="callSpeaker = 'them'">对方说</button>
            <button :class="{ active: callSpeaker === 'me' }" @click="callSpeaker = 'me'">我说</button>
          </div>
          <label class="auto-toggle">
            <input v-model="callNoiseGateEnabled" type="checkbox" />
            低音量过滤
          </label>
          <label class="auto-toggle">
            <input v-model="callAutoAnalyze" type="checkbox" />
            自动分析
          </label>
        </div>

        <div class="hotword-panel">
          <div class="hotword-head">
            <span class="call-section-title">热词纠错</span>
            <button class="call-secondary-btn" @click="addHotwordRule">新增</button>
          </div>
          <div class="hotword-list">
            <div v-for="(rule, idx) in hotwordRules" :key="idx" class="hotword-item">
              <input v-model="rule.from" class="hotword-input" placeholder="易错词" @blur="saveHotwordRules" />
              <span class="hotword-arrow">→</span>
              <input v-model="rule.to" class="hotword-input" placeholder="目标词" @blur="saveHotwordRules" />
              <button class="hotword-delete" @click="removeHotwordRule(idx)">删</button>
            </div>
          </div>
        </div>

        <div v-if="callError" class="call-error">{{ callError }}</div>
        <div v-else-if="callHint" class="call-hint">{{ callHint }}</div>

        <div class="call-live">
          <span class="call-live-label">{{ isListeningSpeech ? '正在听' : '转写' }}</span>
          <textarea
            v-model="callTranscriptDraft"
            rows="3"
            placeholder="点击开始后，用语音转述对方说了什么；也可以直接在这里输入。"
          ></textarea>
        </div>

        <div class="call-actions">
          <button
            v-if="!isListeningSpeech"
            class="call-primary-btn"
            :disabled="isStartingSpeech"
            @click="startCallListening"
          >
            {{ isStartingSpeech ? '启动中...' : '开始听写' }}
          </button>
          <button
            v-else
            class="call-primary-btn active"
            :disabled="isStoppingSpeech"
            @click="stopCallListening"
          >
            {{ isStoppingSpeech ? '收尾中...' : '暂停听写' }}
          </button>
          <button class="call-secondary-btn" :disabled="!callTranscriptDraft.trim()" @click="commitCallDraft">
            加入并分析
          </button>
        </div>

        <div v-if="callRecentMessages.length" class="call-recent">
          <div class="call-section-title">最近转述</div>
          <div v-for="(item, idx) in callRecentMessages" :key="idx" class="call-recent-item">
            <span>{{ item.isMe ? '我' : '对方' }}</span>
            <p>{{ item.text }}</p>
          </div>
        </div>

        <div class="call-suggestion">
          <div class="call-suggestion-head">
            <div class="call-section-title">当前建议</div>
            <button
              class="call-copy-btn"
              :disabled="!latestAnalysis?.replies?.length"
              @click="copyCurrentSuggestion"
            >
              复制
            </button>
          </div>
          <div v-if="isCallAnalyzing" class="call-muted">正在分析...</div>
          <div v-else-if="latestAnalysis?.replies?.length" class="call-suggestion-text">
            {{ latestAnalysis.replies[0].content }}
          </div>
          <div v-else class="call-muted">说完一段后，这里会出现推荐下一句。</div>
        </div>
      </div>

      <div v-if="!hasLatestAnalysis" class="coach-result-empty">
        <div class="result-empty-title">等待分析</div>
        <div class="result-empty-copy">新的判断、策略和可发送话术会在这里汇总。</div>
      </div>

      <template v-else>
        <!-- 胜率 + 意图 合并卡片 -->
        <div class="card status-card">
          <div class="status-left">
            <div class="card-title">胜率</div>
            <div class="winrate-compact">
              <span class="winrate-num">{{ latestAnalysis?.winRate || '--' }}%</span>
              <div class="progress-small">
                <div class="progress-bar" :style="{ width: (latestAnalysis?.winRate || 0) + '%' }"></div>
              </div>
            </div>
            <div class="situation-compact">
              <div class="good-tag">✓ {{ latestAnalysis?.advantages || '暂无' }}</div>
              <div class="bad-tag">{{ latestAnalysis?.disadvantages || '暂无' }}</div>
            </div>
          </div>
          <div class="status-divider"></div>
          <div class="status-right">
            <div class="card-title">意图</div>
            <div class="intent-list">
              <div class="intent-item"><span class="intent-label">情绪</span><span class="orange">{{ latestAnalysis?.emotion || '--' }}</span></div>
              <div class="intent-item"><span class="intent-label">真实</span><span class="red">{{ latestAnalysis?.realIntent || '--' }}</span></div>
              <div class="intent-item"><span class="intent-label">需求</span><span>{{ latestAnalysis?.needs || '--' }}</span></div>
            </div>
          </div>
        </div>

        <div v-if="latestContextMatches.phrasebook.length || latestContextMatches.knowledge.length" class="card reference-card">
          <div class="card-title">参考资料</div>
          <div class="reference-list">
            <div v-for="item in latestContextMatches.knowledge" :key="`knowledge-${item.id || item.title}`" class="reference-item">
              <span class="reference-tag">知识库</span>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.content }}</p>
              </div>
            </div>
            <div v-for="item in latestContextMatches.phrasebook" :key="`phrase-${item.id || item.keyword}`" class="reference-item">
              <span class="reference-tag phrase">话术本</span>
              <div>
                <strong>{{ item.keyword }}</strong>
                <p>{{ item.content }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 策略建议 -->
        <div class="card strategy">
          <div class="card-title">策略建议</div>
          <div class="strategy-split">
            <div class="strategy-col">
              <div class="col-title good">应该做</div>
              <div class="strategy-list">
                <div v-for="(item, idx) in (latestAnalysis?.shouldDo || [])" :key="idx" class="strategy-item">{{ item }}</div>
              </div>
            </div>
            <div class="strategy-col">
              <div class="col-title bad">不要做</div>
              <div class="strategy-list">
                <div v-for="(item, idx) in (latestAnalysis?.shouldNotDo || [])" :key="idx" class="strategy-item">{{ item }}</div>
              </div>
            </div>
          </div>
          <div class="tone">建议语气：{{ latestAnalysis?.recommendedTone || '--' }}</div>
        </div>

        <!-- 推荐话术 -->
        <div class="card replies">
          <div class="card-title">推荐话术</div>
          <div class="replies-list">
            <div v-for="(reply, idx) in (latestAnalysis?.replies || [])" :key="idx" class="reply-item">
              <div class="reply-header">
                <span class="reply-num">{{ idx + 1 }}</span>
                <span class="reply-style">{{ reply.style }}</span>
              </div>
              <div class="reply-content">{{ reply.content }}</div>
              <div class="reply-actions">
                <button class="btn-copy" @click="copyReply(reply, idx)">复制</button>
                <button class="btn-send" @click="sendReply(reply, idx)">发送</button>
              </div>
            </div>
            <div v-if="!latestAnalysis?.replies?.length" class="empty">暂无话术</div>
          </div>
        </div>
      </template>

      <div class="history-sticky">
        <div class="history-header" @click="toggleHistory">
          <span>
            历史记录 ({{ currentGoal.messages.length }})
          </span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button
              v-if="currentGoal.messages.length >= 2"
              class="analyze-all-btn"
              :disabled="isAnalyzingAll"
              @click.stop="analyzeAllMessages"
            >
              {{ isAnalyzingAll ? '分析中...' : '整体分析' }}
            </button>
            <span class="toggle">{{ showHistory ? '▲' : '▼' }}</span>
          </div>
        </div>
        <div v-show="showHistory" class="history-body">
          <div v-for="msg in currentGoal.messages" :key="msg.timestamp" :class="['msg-wrapper', getMsgWrapperClass(msg.content)]">
            <div class="msg-bubble">
              <div class="msg-text">{{ extractMessageContent(msg.content) }}</div>
            </div>
          </div>
          <div v-if="!currentGoal.messages.length" class="empty">暂无记录</div>
        </div>
      </div>
    </div>

    <div v-if="!currentGoal" class="empty-state">
      <div class="empty-icon"></div>
      <div class="empty-title">聊天军师</div>
      <button @click="showNewGoalModal = true">创建目标</button>
    </div>

    <div v-if="showNewGoalModal" class="modal" @click="showNewGoalModal = false">
      <div @click.stop>
        <div class="modal-title">创建目标</div>
        <input v-model="newGoalName" placeholder="目标名称" />
        <textarea v-model="newGoalContent" placeholder="目标描述（可选）" rows="2"></textarea>
        <div class="modal-footer">
          <button @click="showNewGoalModal = false">取消</button>
          <button @click="createGoal">创建</button>
        </div>
      </div>
    </div>

    <div v-if="showEditGoalModal" class="modal" @click="showEditGoalModal = false">
      <div @click.stop>
        <div class="modal-title">编辑目标</div>
        <input v-model="editGoalName" placeholder="目标名称" />
        <textarea v-model="editGoalContent" placeholder="目标描述（可选）" rows="3"></textarea>
        <div class="modal-footer">
          <button @click="showEditGoalModal = false">取消</button>
          <button @click="saveGoalEdit">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteModal" class="modal" @click="showDeleteModal = false">
      <div @click.stop>
        <div class="modal-title">删除目标</div>
        <p>确定删除「{{ currentGoal?.name }}」？</p>
        <div class="modal-footer">
          <button @click="showDeleteModal = false">取消</button>
          <button class="danger" @click="deleteGoal">删除</button>
        </div>
      </div>
    </div>

    <!-- 整体分析弹窗 -->
    <div v-if="showAnalysisModal" class="modal analysis-modal" @click="showAnalysisModal = false">
      <div class="modal-content-large" @click.stop>
        <div class="modal-header">
          <div class="modal-title">整体对话分析</div>
          <button class="close-btn" @click="showAnalysisModal = false">✕</button>
        </div>

        <div v-if="isAnalyzingAll" class="loading-state">
          <div class="loading-spinner"></div>
          <p>正在深度分析历史对话...</p>
        </div>

        <div v-else class="analysis-result">
          <div class="analysis-section">
            <div class="section-title">总体评估</div>
            <div class="winrate-display">
              <span class="winrate-value">{{ overallAnalysis.winRate || 0 }}%</span>
              <span class="winrate-label">当前成功率</span>
            </div>
          </div>

          <div class="analysis-section">
            <div class="section-title">关系现状</div>
            <div class="status-text">{{ overallAnalysis.relationshipStatus || '暂无分析' }}</div>
          </div>

          <div class="analysis-section">
            <div class="section-title">对方画像</div>
            <div class="personality-tags">
              <span v-for="(t, i) in overallAnalysis.personality || []" :key="i" class="personality-tag">{{ t }}</span>
            </div>
          </div>

          <div class="analysis-section">
            <div class="section-title">潜在风险</div>
            <ul class="risk-list">
              <li v-for="(r, i) in overallAnalysis.risks || []" :key="i">{{ r }}</li>
            </ul>
          </div>

          <div class="analysis-section">
            <div class="section-title">下一步建议</div>
            <ul class="suggestion-list">
              <li v-for="(s, i) in overallAnalysis.nextSteps || []" :key="i">{{ s }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { CoachStorage } from '../utils/coach-storage'
import { useToast } from '../composables/useToast'
import { ContactStorage } from '../utils/contact-storage'
// OCR 功能暂隐藏
// import OCRResultModal from '../components/OCRResultModal.vue'
import '../skills/puachat-master.skill'
import '../skills/top-sales-chat.skill'
import { getSkillNames, getSkill } from '../skills/skill-loader'
import {
  formatMatchesForPrompt,
  retrieveCommunicationContext,
  type CommunicationContextMatches,
  type ResponseMode
} from '../utils/context-retrieval'

const toast = useToast()
const route = useRoute()

const goals = ref<any[]>([])
const currentGoalId = ref<number | ''>('')
const currentGoal = ref<any>(null)
const latestAnalysis = ref<any>(null)
const latestContextMatches = ref<CommunicationContextMatches>({ phrasebook: [], knowledge: [] })
const inputText = ref('')
const isSending = ref(false)
const showNewGoalModal = ref(false)
const showDeleteModal = ref(false)
const showEditGoalModal = ref(false)
const newGoalName = ref('')
const newGoalContent = ref('')
const editGoalName = ref('')
const editGoalContent = ref('')
const selectedSkill = ref('')
const responseMode = ref<ResponseMode>('balanced')
const availableSkills = ref<string[]>([])
const showHistory = ref(false)
const showAnalysisModal = ref(false)
const isAnalyzingAll = ref(false)
const overallAnalysis = ref<any>({})
const showCallPanel = ref(false)
const isListeningSpeech = ref(false)
const isStartingSpeech = ref(false)
const isStoppingSpeech = ref(false)
const callSpeaker = ref<'them' | 'me'>('them')
const callAutoAnalyze = ref(true)
const callNoiseGateEnabled = ref(true)
const callTranscriptDraft = ref('')
const callError = ref('')
const callHint = ref('')
const callRecentMessages = ref<ChatItem[]>([])
const hotwordRules = ref<Array<{ from: string; to: string }>>([])
const isCallAnalyzing = ref(false)
const pendingCallAnalysis = ref(false)
const asrStatus = ref<any>(null)
const callStateText = computed(() => {
  if (isStoppingSpeech.value) return '收尾中'
  if (isStartingSpeech.value) return '启动中'
  if (isCallAnalyzing.value) return '分析中'
  if (isListeningSpeech.value) return '正在听'
  return '待开始'
})
const hasLatestAnalysis = computed(() => Boolean(
  latestAnalysis.value?.winRate ||
  latestAnalysis.value?.realIntent ||
  latestAnalysis.value?.replies?.length
))
let localAsrSessionId = ''
let callMediaStream: MediaStream | null = null
let callAudioContext: AudioContext | null = null
let callSourceNode: MediaStreamAudioSourceNode | null = null
let callWorkletNode: AudioWorkletNode | null = null
let callWorkletUrl = ''
let isPushingAudio = false
let pendingCallAudioBuffers: ArrayBuffer[] = []
const maxPendingCallAudioBytes = 16000 * 2 * 8
let lowVolumeStreak = 0
let lowVolumeHintCooldown = 0
const noiseGateThreshold = 0.008
const HOTWORD_STORAGE_KEY = 'coach:asrHotwords'
const defaultHotwordRules = [
  { from: '扣子', to: 'Coze' },
  { from: '口子', to: 'Coze' },
  { from: '扣字', to: 'Coze' }
]

// 剪贴板监听相关
const isMonitorActive = ref(false)
const currentSpeaker = ref<'them' | 'me'>('them')
const lastCopiedText = ref('')
const lastClipboardCheck = ref('')
const lastClipboardImageCheck = ref('')
const isCheckingClipboardImage = ref(false)
const lastCopiedChats = ref<ChatItem[]>([])

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

const responseModes: Array<{ value: ResponseMode; label: string }> = [
  { value: 'fast', label: '快速' },
  { value: 'balanced', label: '标准' },
  { value: 'deep', label: '深度' }
]
const responseModeLabel = computed(() => responseModes.find(item => item.value === responseMode.value)?.label || '标准')
const responseModeLabelByValue = (mode: ResponseMode) => responseModes.find(item => item.value === mode)?.label || '标准'
const coachModeSuggestion = computed<ResponseMode | null>(() => {
  const text = inputText.value.trim()
  if (!text) return null
  if (/(合同|退款|赔偿|承诺|报警|转账|借钱|隐私|风险)/.test(text)) return 'deep'
  if (text.length <= 36) return 'fast'
  if (text.length >= 180) return 'deep'
  return 'balanced'
})

const setResponseMode = (mode: ResponseMode) => {
  responseMode.value = mode
  localStorage.setItem('coach:responseMode', mode)
}

const loadHotwordRules = () => {
  try {
    const raw = localStorage.getItem(HOTWORD_STORAGE_KEY)
    if (!raw) {
      hotwordRules.value = [...defaultHotwordRules]
      return
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      hotwordRules.value = parsed
        .filter(item => item && typeof item.from === 'string' && typeof item.to === 'string')
        .map(item => ({ from: item.from.trim(), to: item.to.trim() }))
        .filter(item => item.from && item.to)
      if (!hotwordRules.value.length) {
        hotwordRules.value = [...defaultHotwordRules]
      }
    }
  } catch {
    hotwordRules.value = [...defaultHotwordRules]
  }
}

const saveHotwordRules = () => {
  const next = hotwordRules.value
    .map(item => ({ from: item.from.trim(), to: item.to.trim() }))
    .filter(item => item.from && item.to)
  hotwordRules.value = next
  localStorage.setItem(HOTWORD_STORAGE_KEY, JSON.stringify(next))
}

const addHotwordRule = () => {
  hotwordRules.value.push({ from: '', to: '' })
}

const removeHotwordRule = (index: number) => {
  hotwordRules.value.splice(index, 1)
  saveHotwordRules()
}

// OCR 功能暂隐藏
// const ocrModalRef = ref<InstanceType<typeof OCRResultModal> | null>(null)
// function openOCRModal() {
//   ocrModalRef.value?.open()
// }
// async function handleOCRImport(messages: any[]) {
//   if (!currentGoal.value) {
//     const goalName = messages[0]?.speaker || '新聊天'
//     const goalId = await CoachStorage.createGoal(goalName, `从屏幕识别导入的 ${messages.length} 条对话`)
//     currentGoalId.value = goalId
//     await onGoalChange()
//   }
//   for (const msg of messages) {
//     await CoachStorage.addMessage(currentGoalId.value, {
//       role: 'user',
//       content: `${msg.speaker} 说: ${msg.content}`,
//       timestamp: Date.now()
//     })
//   }
//   await onGoalChange()
// }

// 临时修复：直接删除整个 OCR 相关函数，避免语法错误
const ocrModalRef = ref(null)
function openOCRModal() {}
async function handleOCRImport(messages: any[]) {}

const loadSkills = () => {
  availableSkills.value = getSkillNames()
}

const toggleHistory = () => { showHistory.value = !showHistory.value }
const loadGoals = async () => { goals.value = await CoachStorage.getGoals() }
const bindContactGoalFromRoute = async () => {
  const raw = route.query.contactId
  const value = Array.isArray(raw) ? raw[0] : raw
  const contactId = Number(value)
  if (!contactId || Number.isNaN(contactId)) return false

  const contact = await ContactStorage.getContact(contactId)
  if (!contact) return false

  const goal = await CoachStorage.getOrCreateGoalByContact(contactId, contact.name)
  currentGoalId.value = goal.id || ''
  await onGoalChange()
  return true
}

const onGoalChange = async () => {
  if (!currentGoalId.value) { currentGoal.value = null; latestAnalysis.value = null; return }
  const goal = await CoachStorage.getGoal(currentGoalId.value)
  currentGoal.value = goal || null
  if (currentGoal.value) {
    currentGoal.value.messages = currentGoal.value.messages || []
  }
  latestAnalysis.value = null
}
const createGoal = async () => {
  if (!newGoalName.value.trim()) return
  const id = await CoachStorage.createGoal(newGoalName.value, newGoalContent.value)
  await loadGoals()
  currentGoalId.value = id
  const goal = await CoachStorage.getGoal(id)
  currentGoal.value = goal
  if (currentGoal.value) {
    currentGoal.value.messages = currentGoal.value.messages || []
  }
  latestAnalysis.value = null
  showNewGoalModal.value = false
  newGoalName.value = ''
  newGoalContent.value = ''
}
const openEditGoalModal = () => {
  if (!currentGoal.value) return
  editGoalName.value = currentGoal.value.name
  editGoalContent.value = currentGoal.value.goal
  showEditGoalModal.value = true
}
const saveGoalEdit = async () => {
  if (!currentGoal.value || !editGoalName.value.trim()) return
  await CoachStorage.updateGoal(currentGoal.value.id, {
    name: editGoalName.value.trim(),
    goal: editGoalContent.value.trim()
  })
  await loadGoals()
  const goal = await CoachStorage.getGoal(currentGoal.value.id)
  currentGoal.value = goal
  showEditGoalModal.value = false
}
const confirmDeleteGoal = () => { showDeleteModal.value = true }
const deleteGoal = async () => {
  if (!currentGoal.value) return
  await CoachStorage.deleteGoal(currentGoal.value.id)
  await loadGoals()
  currentGoal.value = null
  latestAnalysis.value = null
  currentGoalId.value = ''
  showDeleteModal.value = false
}

const analyzeAllMessages = async () => {
  if (!currentGoal.value?.messages?.length || isAnalyzingAll.value) return

  isAnalyzingAll.value = true
  showAnalysisModal.value = true
  overallAnalysis.value = {}

  try {
    // 整理历史消息
    const history = currentGoal.value.messages
      .filter((m: any) => !m.content.startsWith('[') && m.content.trim())
      .map((m: any) => ({
        role: m.role,
        content: m.content
      }))

    if (history.length < 2) {
      toast.error('聊天记录太少，无法进行整体分析')
      isAnalyzingAll.value = false
      return
    }

    // 调用 AI 整体分析
    const result = await window.electronAPI?.ai?.analyzeOverall(
      history,
      await buildGoalTextWithSkill(history.map(item => item.content).join('\n'))
    )

    if (result?.success === false && result?.error) {
      toast.error('整体分析失败：' + result.error)
      return
    }
    if (result) {
      overallAnalysis.value = result
    }
  } catch (e: any) {
    console.error('整体分析失败:', e)
    alert('整体分析失败：' + (e.message || '未知错误'))
  } finally {
    isAnalyzingAll.value = false
  }
}

const getSceneFromSkill = () => {
  if (selectedSkill.value.includes('销售')) return '销售'
  if (selectedSkill.value.includes('恋爱')) return '恋爱'
  return '全部'
}

const buildGoalTextWithSkill = async (query = ''): Promise<string> => {
  let goalText = currentGoal.value?.goal || ''
  if (selectedSkill.value) {
    const skill = getSkill(selectedSkill.value)
    if (skill) {
      goalText = `${goalText}\n\n【使用技能：${selectedSkill.value}】\n\n${skill.prompts.system}`
    }
  }

  const matches = await retrieveCommunicationContext(
    `${currentGoal.value?.goal || ''}\n${query}`,
    { scene: getSceneFromSkill(), mode: responseMode.value }
  )
  latestContextMatches.value = matches
  const referenceBlock = formatMatchesForPrompt(matches)
  if (referenceBlock) {
    goalText = `${goalText}\n\n${referenceBlock}`
  }

  return goalText
}

const analyzeCurrentGoal = async (extraMessage?: { role: string; content: string }) => {
  if (!currentGoal.value) return null

  const history = currentGoal.value.messages.map((m: any) => ({ role: m.role, content: m.content }))
  if (extraMessage) {
    history.push(extraMessage)
  }

  const query = history.map(item => item.content).join('\n')
  const result = await (window as any).electronAPI?.ai?.analyzeIntent?.(history, await buildGoalTextWithSkill(query), responseMode.value)
  if (result?.success === false && result?.error) {
    toast.error('分析失败：' + result.error)
    return null
  }

  if (result?.winRate) {
    latestAnalysis.value = result
  }

  return result
}

const sendMessage = async () => {
  if (!inputText.value.trim() || !currentGoal.value || isSending.value) return
  isSending.value = true
  const userMessage = inputText.value.trim()
  inputText.value = ''
  try {
    const result = await analyzeCurrentGoal({ role: 'user', content: userMessage })
    if (result?.winRate) {
      await CoachStorage.addMessage(currentGoal.value.id, { role: 'user', content: userMessage, timestamp: Date.now() })
      currentGoal.value.messages.push({ role: 'user', content: userMessage, timestamp: Date.now() })
    }
  } catch (e: any) {
    console.error(e)
    toast.error('分析失败：' + (e.message || '未知错误'))
  } finally {
    isSending.value = false
  }
}
const copyReply = async (reply: any, idx: number) => {
  await (window as any).electronAPI?.clipboard?.setText?.(reply.content)
  if (currentGoal.value) {
    const msg = { role: 'user', content: `[复制话术${idx + 1}]: ${reply.content}`, timestamp: Date.now() }
    await CoachStorage.addMessage(currentGoal.value.id, msg)
    currentGoal.value.messages.push(msg)
  }
}
const sendReply = async (reply: any, idx: number) => {
  await (window as any).electronAPI?.clipboard?.setText?.(reply.content)
  await (window as any).electronAPI?.clipboard?.paste?.()
  if (currentGoal.value) {
    const msg = { role: 'user', content: `[发送话术${idx + 1}]: ${reply.content}`, timestamp: Date.now() }
    await CoachStorage.addMessage(currentGoal.value.id, msg)
    currentGoal.value.messages.push(msg)
  }
}

const copyCurrentSuggestion = async () => {
  const text = latestAnalysis.value?.replies?.[0]?.content?.trim()
  if (!text || !currentGoal.value) return

  try {
    await (window as any).electronAPI?.clipboard?.setText?.(text)
    const message = {
      role: 'assistant',
      content: `[复制当前建议]: ${text}`,
      timestamp: Date.now()
    }
    await CoachStorage.addMessage(currentGoal.value.id, message)
    currentGoal.value.messages.push(message)
    toast.success('已复制当前建议')
  } catch (e: any) {
    console.error('复制当前建议失败:', e)
    toast.error('复制失败，请重试')
  }
}
onMounted(async () => {
  const cachedMode = localStorage.getItem('coach:responseMode')
  if (cachedMode === 'fast' || cachedMode === 'balanced' || cachedMode === 'deep') {
    responseMode.value = cachedMode
  }
  loadHotwordRules()

  await loadGoals()
  loadSkills()
  const bound = await bindContactGoalFromRoute()
  if (!bound && goals.value.length) {
    currentGoalId.value = goals.value[0].id
    await onGoalChange()
  }

  // 注册剪贴板变化监听
  window.electronAPI?.clipboard?.onChanged?.(handleClipboardChange)
})

onUnmounted(() => {
  // 停止监听
  stopMonitor()
  stopCallMode()
})

onBeforeRouteLeave(() => {
  stopMonitor()
  stopCallMode()
})

const openCallPanel = async () => {
  showCallPanel.value = true
  callError.value = ''
  await refreshAsrStatus()
  if (!asrStatus.value?.available) {
    callError.value = buildAsrUnavailableMessage()
  }
}

const closeCallPanel = () => {
  stopCallMode()
  showCallPanel.value = false
}

const refreshAsrStatus = async () => {
  try {
    asrStatus.value = await window.electronAPI?.asr?.status?.()
  } catch (e: any) {
    asrStatus.value = { available: false, error: e?.message || '本地识别状态检查失败' }
  }
}

const buildAsrUnavailableMessage = () => {
  if (!asrStatus.value?.modelReady) {
    return '未找到本地语音模型，请确认模型放在 desktop/models/asr/vosk-cn-small。'
  }
  if (!asrStatus.value?.runtimeReady) {
    return '本地语音识别运行库还没装好，可以先手动输入转述内容后分析。'
  }
  return asrStatus.value?.error || '本地语音识别暂不可用，可以先手动输入转述内容。'
}

const startCallListening = async () => {
  if (isListeningSpeech.value || isStartingSpeech.value) return

  isStartingSpeech.value = true
  await refreshAsrStatus()
  if (!asrStatus.value?.available) {
    callError.value = buildAsrUnavailableMessage()
    isStartingSpeech.value = false
    return
  }

  await stopCallListening()

  callError.value = ''
  try {
    callMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        sampleSize: 16,
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true
      }
    })
    callAudioContext = new AudioContext({ sampleRate: 16000 })
    const startResult = await window.electronAPI?.asr?.start?.(16000)
    if (!startResult?.success || !startResult.sessionId) {
      throw new Error(startResult?.error || '本地语音识别启动失败')
    }
    localAsrSessionId = startResult.sessionId
    callSourceNode = callAudioContext.createMediaStreamSource(callMediaStream)
    callWorkletNode = await createCallAudioWorklet(callAudioContext)
    callWorkletNode.port.onmessage = handleCallAudioWorkletMessage
    callSourceNode.connect(callWorkletNode)
    isListeningSpeech.value = true
  } catch (e: any) {
    console.error('启动本地语音识别失败:', e)
    callError.value = getCallStartErrorMessage(e)
    await stopCallListening()
  } finally {
    isStartingSpeech.value = false
  }
}

const createCallAudioWorklet = async (audioContext: AudioContext) => {
  if (!callWorkletUrl) {
    const workletCode = `
      class CallAudioCaptureProcessor extends AudioWorkletProcessor {
        constructor() {
          super()
          this.buffers = []
          this.size = 0
          this.chunkSize = 4096
        }

        process(inputs) {
          const input = inputs[0]
          const channel = input && input[0]
          if (!channel) return true

          this.buffers.push(new Float32Array(channel))
          this.size += channel.length

          while (this.size >= this.chunkSize) {
            const chunk = new Float32Array(this.chunkSize)
            let offset = 0

            while (offset < this.chunkSize && this.buffers.length) {
              const first = this.buffers[0]
              const needed = this.chunkSize - offset

              if (first.length <= needed) {
                chunk.set(first, offset)
                offset += first.length
                this.buffers.shift()
              } else {
                chunk.set(first.subarray(0, needed), offset)
                this.buffers[0] = first.slice(needed)
                offset += needed
              }
            }

            this.size -= this.chunkSize
            this.port.postMessage(chunk.buffer, [chunk.buffer])
          }

          return true
        }
      }

      registerProcessor('call-audio-capture', CallAudioCaptureProcessor)
    `
    callWorkletUrl = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }))
  }

  await audioContext.audioWorklet.addModule(callWorkletUrl)
  return new AudioWorkletNode(audioContext, 'call-audio-capture', {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCount: 1
  })
}

const getCallStartErrorMessage = (error: any) => {
  const name = error?.name || ''
  const message = error?.message || ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return '麦克风权限被拒绝，请在系统设置里允许搭言使用麦克风。'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return '没有检测到可用麦克风，请检查输入设备。'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return '麦克风正被其他应用占用，请关闭占用后再试。'
  }
  return message || '本地语音识别启动失败，请稍后重试。'
}

const applyCallHotwordCorrections = (text: string) => {
  let next = text
  for (const rule of hotwordRules.value) {
    const from = rule.from.trim()
    const to = rule.to.trim()
    if (!from || !to) continue
    next = next.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), to)
  }
  return next
}

const calcRms = (input: Float32Array) => {
  if (!input.length) return 0
  let sum = 0
  for (let i = 0; i < input.length; i++) {
    sum += input[i] * input[i]
  }
  return Math.sqrt(sum / input.length)
}

const handleCallAudioWorkletMessage = (event: MessageEvent<ArrayBuffer>) => {
  if (!localAsrSessionId) return

  const input = new Float32Array(event.data)
  if (callNoiseGateEnabled.value) {
    const rms = calcRms(input)
    if (rms < noiseGateThreshold) {
      lowVolumeStreak += 1
      if (lowVolumeStreak >= 10 && Date.now() > lowVolumeHintCooldown) {
        callHint.value = '当前音量偏低，建议靠近麦克风或提高说话音量。'
        lowVolumeHintCooldown = Date.now() + 5000
      }
      return
    }
  }
  lowVolumeStreak = 0
  if (callHint.value.includes('音量偏低')) {
    callHint.value = ''
  }

  const pcm = convertFloatTo16BitPCM(downsampleBuffer(input, callAudioContext?.sampleRate || 44100, 16000))
  const audioBuffer = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer
  pendingCallAudioBuffers.push(audioBuffer)
  trimPendingCallAudioQueue()
  void flushCallAudioQueue()
}

const trimPendingCallAudioQueue = () => {
  let totalBytes = pendingCallAudioBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0)
  while (totalBytes > maxPendingCallAudioBytes && pendingCallAudioBuffers.length > 1) {
    const removed = pendingCallAudioBuffers.shift()
    totalBytes -= removed?.byteLength || 0
  }
}

const flushCallAudioQueue = async () => {
  if (!localAsrSessionId || isPushingAudio) return

  isPushingAudio = true
  try {
    while (localAsrSessionId && pendingCallAudioBuffers.length) {
      const chunks = pendingCallAudioBuffers.splice(0)
      const result = await window.electronAPI?.asr?.pushAudio?.(localAsrSessionId, mergeArrayBuffers(chunks))
      if (!result?.success) {
        callError.value = result?.error || '本地语音识别失败'
        return
      }
      if (result.isFinal && result.text?.trim()) {
        callTranscriptDraft.value = applyCallHotwordCorrections(result.text.trim())
        if (callAutoAnalyze.value) {
          await commitCallDraft()
        } else {
          callHint.value = '已转写到草稿，确认后点“加入并分析”。'
        }
      } else if (result.partial?.trim()) {
        callTranscriptDraft.value = applyCallHotwordCorrections(result.partial.trim())
      }
    }
  } catch (e: any) {
    callError.value = e?.message || '本地语音识别失败'
  } finally {
    isPushingAudio = false
  }
}

const mergeArrayBuffers = (buffers: ArrayBuffer[]) => {
  if (buffers.length === 1) return buffers[0]

  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0)
  const merged = new Uint8Array(totalLength)
  let offset = 0
  for (const buffer of buffers) {
    merged.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  }
  return merged.buffer
}

const waitForCallAudioIdle = async () => {
  while (isPushingAudio) {
    await new Promise(resolve => setTimeout(resolve, 20))
  }
}

const downsampleBuffer = (buffer: Float32Array, inputRate: number, outputRate: number) => {
  if (outputRate === inputRate) return buffer
  const sampleRateRatio = inputRate / outputRate
  const newLength = Math.round(buffer.length / sampleRateRatio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }
    result[offsetResult] = accum / Math.max(count, 1)
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }

  return result
}

const convertFloatTo16BitPCM = (input: Float32Array) => {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]))
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}

const stopCallListening = async (commitFinal = true) => {
  if (isStoppingSpeech.value) return

  isStoppingSpeech.value = true
  try {
    if (callWorkletNode) {
      callWorkletNode.port.onmessage = null
      callWorkletNode.disconnect()
    }
    callSourceNode?.disconnect()
    callMediaStream?.getTracks().forEach(track => track.stop())
    await callAudioContext?.close()
    await waitForCallAudioIdle()
    await flushCallAudioQueue()
    await waitForCallAudioIdle()

    if (localAsrSessionId) {
      const result = await window.electronAPI?.asr?.stop?.(localAsrSessionId)
      if (commitFinal && result?.text?.trim()) {
        callTranscriptDraft.value = applyCallHotwordCorrections(result.text.trim())
        if (callAutoAnalyze.value) {
          await commitCallDraft()
        } else {
          callHint.value = '已转写到草稿，确认后点“加入并分析”。'
        }
      }
    }
  } catch (e) {
    console.error('停止本地语音识别失败:', e)
  } finally {
    localAsrSessionId = ''
    callMediaStream = null
    callAudioContext = null
    callSourceNode = null
    callWorkletNode = null
    isPushingAudio = false
    isStartingSpeech.value = false
    isStoppingSpeech.value = false
    pendingCallAudioBuffers = []
    isListeningSpeech.value = false
  }
}

const stopCallMode = () => {
  void stopCallListening(false)
  callTranscriptDraft.value = ''
  callError.value = ''
  callHint.value = ''
}

const commitCallDraft = async () => {
  const text = callTranscriptDraft.value.trim()
  if (!text || !currentGoal.value) return

  callTranscriptDraft.value = ''
  await appendCallMessage(text, callSpeaker.value === 'me')
}

const appendCallMessage = async (text: string, isMe: boolean) => {
  if (!currentGoal.value) return

  const message = {
    role: isMe ? 'assistant' : 'user',
    content: `${isMe ? '我说' : '对方说'}: ${text}`,
    timestamp: Date.now()
  }

  await CoachStorage.addMessage(currentGoal.value.id, message)
  currentGoal.value.messages.push(message)
  callRecentMessages.value.unshift({ text, isMe })
  callRecentMessages.value = callRecentMessages.value.slice(0, 5)

  if (callAutoAnalyze.value) {
    triggerCallAnalysis()
  }
}

const triggerCallAnalysis = async () => {
  if (!currentGoal.value) return

  if (isCallAnalyzing.value) {
    pendingCallAnalysis.value = true
    return
  }

  isCallAnalyzing.value = true
  try {
    await analyzeCurrentGoal()
  } catch (e: any) {
    console.error('通话分析失败:', e)
    toast.error('通话分析失败：' + (e.message || '未知错误'))
  } finally {
    isCallAnalyzing.value = false
    if (pendingCallAnalysis.value) {
      pendingCallAnalysis.value = false
      triggerCallAnalysis()
    }
  }
}

// 剪贴板监听相关方法
let clipboardPollingInterval: any = null

const stopMonitor = async () => {
  if (!isMonitorActive.value && !clipboardPollingInterval) return

  try {
    await window.electronAPI?.clipboard?.stopListen?.()
  } catch (e) {
    console.error('停止剪贴板监听失败:', e)
  } finally {
    isMonitorActive.value = false
    if (clipboardPollingInterval) {
      clearInterval(clipboardPollingInterval)
      clipboardPollingInterval = null
    }
    lastClipboardImageCheck.value = ''
    lastCopiedChats.value = []
  }
}

const toggleMonitor = async () => {
  if (isMonitorActive.value) {
    // 停止监听
    await stopMonitor()
    toast.info('已停止剪贴板监听')
  } else {
    // 开始监听
    const started = await window.electronAPI?.clipboard?.startListen?.()
    if (started) {
      isMonitorActive.value = true
      // 开启轮询检查剪贴板变化（备用方案）
      clipboardPollingInterval = setInterval(checkClipboard, 500)
      toast.success('剪贴板监听已开启！复制微信内容即可添加')
    }
  }
}

const handleClipboardChange = (text: string) => {
  if (!isMonitorActive.value || !text.trim()) return
  if (text === lastClipboardCheck.value) return

  lastClipboardCheck.value = text
  lastCopiedText.value = text
  lastCopiedChats.value = []
}

const checkClipboard = async () => {
  if (!isMonitorActive.value) return

  try {
    const hasImage = await window.electronAPI?.clipboard?.hasImage?.()
    if (hasImage && !isCheckingClipboardImage.value) {
      const imageData = await window.electronAPI?.clipboard?.getImage?.()
      const imageKey = getImageClipboardKey(imageData)
      if (imageData && imageKey && imageKey !== lastClipboardImageCheck.value) {
        lastClipboardImageCheck.value = imageKey
        await handleClipboardImage(imageData)
        return
      }
    }

    const text = await window.electronAPI?.clipboard?.getText?.()
    if (text && text.trim() && text !== lastClipboardCheck.value) {
      lastClipboardCheck.value = text
      lastCopiedText.value = text
      lastCopiedChats.value = []
    }
  } catch (e) {
    console.error('检查剪贴板失败:', e)
  }
}

const getImageClipboardKey = (imageData?: string | null): string => {
  if (!imageData) return ''
  return `${imageData.length}:${imageData.slice(0, 80)}:${imageData.slice(-80)}`
}

const handleClipboardImage = async (imageData: string) => {
  if (!isMonitorActive.value) return

  isCheckingClipboardImage.value = true
  try {
    const result = await window.electronAPI?.ocr?.recognize?.(imageData)
    if (!result?.success || !result.text.trim()) {
      toast.info('图片里没有识别到可导入的聊天内容')
      return
    }

    const chats = parseChatFromOCR(
      result.lines || [],
      { width: result.width || 0, height: result.height || 0 },
      result.text
    )

    if (chats.length > 0) {
      lastCopiedChats.value = chats
      lastCopiedText.value = `已识别 ${chats.length} 条图片对话`
      lastClipboardCheck.value = lastCopiedText.value
      toast.success(`已识别 ${chats.length} 条图片对话，点击导入`)
    } else {
      const cleaned = cleanOCRText(result.text)
      if (cleaned) {
        lastCopiedChats.value = []
        lastCopiedText.value = cleaned
        lastClipboardCheck.value = cleaned
        toast.info('已识别图片文字，请选择归属')
      }
    }
  } catch (e) {
    console.error('图片剪贴板识别失败:', e)
    toast.error('图片识别失败')
  } finally {
    isCheckingClipboardImage.value = false
  }
}

const importLastCopiedChats = async () => {
  if (!lastCopiedChats.value.length || !currentGoal.value) return

  try {
    for (const chat of lastCopiedChats.value) {
      await CoachStorage.addMessage(currentGoal.value.id, {
        role: chat.isMe ? 'user' : 'assistant',
        content: `${chat.isMe ? '我说' : '对方说'}: ${chat.text}`,
        timestamp: Date.now()
      })
    }
    await onGoalChange()
    toast.success(`已导入 ${lastCopiedChats.value.length} 条对话`)
    lastCopiedText.value = ''
    lastCopiedChats.value = []
  } catch (e) {
    console.error('导入图片对话失败:', e)
    toast.error('导入失败')
  }
}

const addLastCopiedAsThem = async () => {
  if (!lastCopiedText.value || !currentGoal.value) return

  const content = lastCopiedText.value.trim()

  try {
    await CoachStorage.addMessage(currentGoal.value.id, {
      role: 'assistant',
      content: `对方说: ${content}`,
      timestamp: Date.now()
    })
    await onGoalChange()
    toast.success('已添加为"对方说"')
    lastCopiedText.value = ''
    lastCopiedChats.value = []
  } catch (e) {
    console.error('添加消息失败:', e)
    toast.error('添加失败')
  }
}

const addLastCopiedAsMe = async () => {
  if (!lastCopiedText.value || !currentGoal.value) return

  const content = lastCopiedText.value.trim()

  try {
    await CoachStorage.addMessage(currentGoal.value.id, {
      role: 'user',
      content: `我说: ${content}`,
      timestamp: Date.now()
    })
    await onGoalChange()
    toast.success('已添加为"我说"')
    lastCopiedText.value = ''
    lastCopiedChats.value = []
  } catch (e) {
    console.error('添加消息失败:', e)
    toast.error('添加失败')
  }
}

// 更新消息标签显示逻辑
const getMsgClass = (content: string) => {
  if (content.startsWith('[发送话术')) return 'send'
  if (content.startsWith('[复制话术')) return 'copy'
  if (content.startsWith('对方说:')) return 'them'
  if (content.startsWith('我说:')) return 'me'
  return 'user'
}

const getMsgWrapperClass = (content: string) => {
  if (content.startsWith('我说:')) return 'me'
  return 'them'
}

const extractMessageContent = (content: string) => {
  if (content.startsWith('对方说:')) return content.replace('对方说:', '')
  if (content.startsWith('我说:')) return content.replace('我说:', '')
  return content
}

const parseChatFromOCR = (lines: OCRLine[], size: { width: number; height: number }, fallbackText: string): ChatItem[] => {
  if (!lines.length || !size.width) {
    return cleanOCRText(fallbackText)
      .split('\n')
      .filter(Boolean)
      .map(text => ({ text, isMe: false }))
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
  const left = hasDesktopSidebar ? detectDesktopChatLeft(lines, width, height) : 0
  const top = detectChatTop(lines, height)
  const bottom = detectChatBottom(lines, height, top)

  return { left, right: width, top, bottom }
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
  if (isVoiceDurationOCRLine(clean)) return true
  if (isMediaPlaceholderOCRLine(clean)) return true
  if (/^\d{1,2}:\d{2}$/.test(clean)) return true
  if (/^(微信|通讯录|发现|我|聊天信息|发送|按住说话|\+|返回|更多|语音|表情|文件传输助手)$/.test(clean)) return true
  if (/^(今天|昨天|周[一二三四五六日天]|星期[一二三四五六日天])\s*\d{1,2}:\d{2}$/.test(clean)) return true
  if (clean.length <= 1 && !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(clean)) return true
  return false
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
</script>

<style scoped>
.coach-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  overflow: hidden;
}

/* 顶部导航栏 */
.top-bar {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  align-items: center;
}

.top-bar select {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  transition: all var(--transition);
}

.top-bar select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.top-bar-actions {
  display: flex;
  gap: var(--space-1);
}

.top-bar .icon-btn {
  padding: var(--space-1) var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: var(--font-md);
  transition: all var(--transition);
}

.top-bar .icon-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.top-bar .icon-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.top-bar .ocr-btn {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
}

.top-bar .ocr-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.coach-reason {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(247, 241, 233, 0.78) 100%);
  border-bottom: 1px solid var(--border-light);
}

.reason-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.reason-title {
  margin-top: 6px;
  font-size: var(--font-lg);
  line-height: 1.35;
  font-weight: 800;
  color: var(--text-primary);
}

.reason-copy {
  max-width: 250px;
  font-size: var(--font-xs);
  line-height: 1.6;
  color: var(--text-secondary);
}

.coach-workbench {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(239, 250, 247, 0.9) 100%);
  border: 1px solid rgba(15, 118, 110, 0.16);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

/* 技能选择器 - 移到内容区顶部 */
.skill-selector {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: 0;
  background: transparent;
  border-radius: 0;
  border: 0;
}

.skill-label {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  font-weight: 600;
}

.skill-select {
  flex: 1 1 180px;
  min-width: 150px;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  transition: all var(--transition);
}

.skill-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.coach-mode-switch {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  white-space: nowrap;
  gap: 6px;
  padding: 4px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
}

.coach-mode-switch button {
  min-height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
}

.coach-mode-switch button.active {
  background: var(--primary-gradient);
  color: white;
}

.call-open-btn {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  background: var(--primary-gradient);
  color: white;
  font-size: var(--font-sm);
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}

@media (max-width: 920px) {
  .skill-selector {
    gap: var(--space-2);
  }

  .skill-label {
    flex: 0 0 auto;
  }

  .skill-select {
    flex: 1 1 100%;
    min-width: 0;
  }

  .coach-mode-switch {
    flex: 1 1 auto;
    justify-content: center;
  }

  .call-open-btn {
    margin-left: auto;
  }
}

.coach-input-card {
  padding: var(--space-3);
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(15, 118, 110, 0.12);
  border-radius: var(--radius-lg);
}

.coach-input-card textarea {
  width: 100%;
  min-height: 86px;
  padding: 0;
  border: 0;
  outline: none;
  resize: vertical;
  background: transparent;
  color: var(--text-primary);
  font-size: var(--font-md);
  line-height: 1.6;
}

.coach-input-card textarea::placeholder {
  color: var(--text-tertiary);
}

.coach-mode-hint {
  margin-top: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: rgba(14, 116, 144, 0.08);
  border: 1px solid rgba(14, 116, 144, 0.16);
  font-size: var(--font-xs);
  color: var(--text-secondary);
}

.coach-mode-hint button {
  min-height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
  color: white;
  font-size: 11px;
  font-weight: 700;
}

.call-panel {
  padding: var(--space-4);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 241, 233, 0.88) 100%);
  border: 1px solid rgba(15, 118, 110, 0.14);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.call-head,
.call-controls,
.call-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.call-kicker,
.call-section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.call-title {
  margin-top: 4px;
  font-size: var(--font-md);
  font-weight: 800;
  color: var(--text-primary);
}

.call-state-pill {
  margin-left: auto;
  padding: 5px 10px;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.call-state-pill.listening {
  background: var(--primary-bg);
  color: var(--primary-dark);
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.08);
}

.call-state-pill.analyzing {
  background: var(--warning-bg);
  color: var(--warning);
}

.call-asr-status {
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--warning-bg);
  color: var(--warning);
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.call-asr-status.ready {
  background: var(--success-bg);
  color: var(--success);
}

.call-close-btn,
.call-secondary-btn {
  min-height: 32px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
}

.speaker-switch {
  display: inline-flex;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
}

.speaker-switch button {
  min-height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
}

.speaker-switch button.active {
  background: var(--primary-gradient);
  color: white;
}

.auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
}

.call-error {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--warning-bg);
  color: var(--warning);
  font-size: var(--font-xs);
  line-height: 1.5;
}

.call-hint {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: rgba(14, 116, 144, 0.08);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  line-height: 1.5;
}

.hotword-panel {
  padding: var(--space-2);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--border-light);
}

.hotword-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.hotword-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hotword-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
}

.hotword-input {
  min-height: 30px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  color: var(--text-primary);
}

.hotword-arrow {
  font-size: 12px;
  color: var(--text-tertiary);
}

.hotword-delete {
  min-height: 28px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  background: rgba(180, 35, 24, 0.08);
  border: 1px solid rgba(180, 35, 24, 0.18);
  color: var(--error);
  font-size: 12px;
  font-weight: 700;
}

.call-live {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
}

.call-live-label {
  display: block;
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.call-live textarea {
  width: 100%;
  min-height: 76px;
  border: 0;
  outline: none;
  resize: vertical;
  background: transparent;
  color: var(--text-primary);
  line-height: 1.55;
  font-size: var(--font-sm);
}

.call-live textarea::placeholder {
  color: var(--text-tertiary);
}

.call-recent-item p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.55;
  font-size: var(--font-sm);
}

.call-primary-btn {
  flex: 1;
  min-height: 36px;
  border-radius: var(--radius-md);
  background: var(--primary-gradient);
  color: white;
  font-size: var(--font-sm);
  font-weight: 800;
}

.call-primary-btn.active {
  background: linear-gradient(135deg, var(--secondary-light) 0%, var(--secondary) 100%);
}

.call-primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.call-secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.call-recent {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.call-recent-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: start;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.call-recent-item span {
  display: inline-flex;
  justify-content: center;
  padding: 3px 0;
  border-radius: var(--radius-sm);
  background: var(--secondary-bg);
  color: var(--secondary-dark);
  font-size: 11px;
  font-weight: 800;
}

.call-suggestion {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--success-bg) 0%, #dcfce7 100%);
  border: 1px solid rgba(22, 163, 74, 0.18);
}

.call-suggestion-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.call-copy-btn {
  min-height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(22, 163, 74, 0.24);
  color: var(--success);
  font-size: 11px;
  font-weight: 800;
}

.call-copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.call-suggestion-text {
  margin-top: 8px;
  color: var(--text-primary);
  font-size: var(--font-md);
  line-height: 1.55;
  font-weight: 700;
}

.call-muted {
  margin-top: 8px;
  color: var(--text-tertiary);
  font-size: var(--font-sm);
}

.coach-result-empty {
  padding: var(--space-6) var(--space-4);
  border-radius: var(--radius-xl);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 241, 233, 0.76) 100%);
  border: 1px dashed rgba(15, 118, 110, 0.2);
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.result-empty-title {
  font-size: var(--font-lg);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.result-empty-copy {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 整体分析按钮 */
.analyze-all-btn {
  padding: var(--space-1) var(--space-3);
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.analyze-all-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.analyze-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 历史记录区域 */
.history-sticky {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background: var(--bg-primary);
  cursor: pointer;
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--text-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border-light);
}

.history-header > span:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle {
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
}

.history-body {
  max-height: 150px;
  overflow-y: auto;
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.msg-wrapper {
  display: flex;
  width: 100%;
}

.msg-wrapper.them {
  justify-content: flex-start;
}

.msg-wrapper.me {
  justify-content: flex-end;
}

.msg-bubble {
  max-width: 75%;
  padding: var(--space-2) var(--space-3);
  border-radius: 12px;
  font-size: var(--font-sm);
  line-height: 1.5;
  position: relative;
  word-break: break-word;
  transition: background var(--transition), color var(--transition);
}

.msg-wrapper.them .msg-bubble {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-bottom-left-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.msg-wrapper.me .msg-bubble {
  background: linear-gradient(135deg, #95ec69 0%, #7ed356 100%);
  color: #000;
  border-bottom-right-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

/* 暗色模式下调整我的消息气泡 */
.dark-theme .msg-wrapper.me .msg-bubble {
  background: linear-gradient(135deg, #7ed356 0%, #5caf30 100%);
  color: #000;
}

.msg-text {
  white-space: pre-wrap;
}

.empty {
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  padding: var(--space-4);
}

/* 内容区域 */
.content {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* 状态合并卡片 */
.status-card {
  display: flex;
  align-items: stretch;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
  border-top: 3px solid var(--info);
}

.status-card:hover {
  box-shadow: var(--shadow-md);
}

.status-left {
  flex: 0.5;
  min-width: 0;
}

.status-divider {
  width: 1px;
  background: var(--border-light);
  margin: 0 var(--space-3);
  flex-shrink: 0;
}

.status-right {
  flex: 1.5;
  min-width: 0;
}

.card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.strategy {
  border-top: 3px solid var(--secondary);
}

.replies {
  border-top: 3px solid var(--success);
}

.reference-card {
  border-top: 3px solid var(--warning);
}

.card-title {
  font-size: var(--font-sm);
  font-weight: 600;
  margin-bottom: var(--space-2);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 胜率紧凑布局 */
.winrate-compact {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.winrate-num {
  font-size: var(--font-xl);
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  min-width: 50px;
}

.progress-small {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--primary-gradient);
  border-radius: var(--radius-full);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.situation-compact {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.good-tag, .bad-tag {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  line-height: 1.4;
  word-break: break-all;
}

.good-tag {
  background: var(--success-bg);
  color: var(--success);
}

.bad-tag {
  background: var(--error-bg);
  color: var(--error);
}

/* 意图分析列表式 */
.intent-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.intent-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2);
  font-size: var(--font-sm);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.intent-label {
  color: var(--text-tertiary);
  font-weight: 600;
  font-size: var(--font-xs);
}

.orange {
  color: var(--warning);
  font-weight: 600;
}

.red {
  color: var(--error);
  font-weight: 600;
}

/* 策略建议 */
.strategy-split {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.strategy-col {
  flex: 1;
  font-size: var(--font-sm);
}

.col-title {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.col-title.good {
  background: var(--success-bg);
  color: var(--success);
}

.col-title.bad {
  background: var(--error-bg);
  color: var(--error);
}

.strategy-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.strategy-item {
  padding: var(--space-1) 0;
  color: var(--text-secondary);
  font-size: var(--font-xs);
  line-height: 1.4;
  border-bottom: 1px solid var(--border-light);
}

.strategy-item:last-child {
  border-bottom: none;
}

.tone {
  padding: var(--space-2) var(--space-3);
  background: var(--secondary-bg);
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  color: var(--secondary-dark);
  font-weight: 500;
}

.reference-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.reference-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  background: rgba(255, 248, 232, 0.7);
  border: 1px solid rgba(180, 83, 9, 0.12);
}

.reference-tag {
  align-self: flex-start;
  min-height: 22px;
  padding: 0 8px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--warning);
  background: var(--warning-bg);
}

.reference-tag.phrase {
  color: var(--primary-dark);
  background: var(--primary-bg);
}

.reference-item strong {
  display: block;
  margin-bottom: 4px;
  font-size: var(--font-xs);
  color: var(--text-primary);
}

.reference-item p {
  margin: 0;
  font-size: var(--font-xs);
  line-height: 1.5;
  color: var(--text-secondary);
}

/* 推荐话术 */
.replies-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.reply-item {
  padding: var(--space-3);
  background: linear-gradient(135deg, var(--success-bg) 0%, #dcfce7 100%);
  border: 1px solid var(--success);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.reply-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.reply-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.reply-num {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  color: white;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
}

.reply-style {
  padding: 2px 8px;
  background: var(--success-bg);
  color: var(--success);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 600;
}

.reply-content {
  font-size: var(--font-sm);
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: var(--space-2);
  font-weight: 500;
}

.reply-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-copy, .btn-send {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-copy {
  background: var(--bg-primary);
  color: var(--success);
  border: 1px solid var(--success);
}

.btn-send {
  background: var(--primary-gradient);
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-copy:hover, .btn-send:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-3);
}

.input-footer span {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.input-footer button {
  padding: var(--space-2) var(--space-5);
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.input-footer button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.input-footer button:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--space-4);
  opacity: 0.6;
}

.empty-title {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.empty-state button {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.empty-state button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.empty {
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-sm);
  padding: var(--space-4);
}

/* 弹窗通用样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal > div {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-xl);
  animation: fadeIn 0.3s ease;
}

.modal-title {
  font-size: var(--font-lg);
  font-weight: 600;
  margin-bottom: var(--space-4);
  color: var(--text-primary);
}

.modal input, .modal textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  margin-bottom: var(--space-3);
  outline: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: all var(--transition);
}

.modal input:focus, .modal textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
  background: var(--bg-primary);
}

.modal textarea {
  resize: none;
}

.modal-footer {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.modal-footer button {
  flex: 1;
  padding: var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.modal-footer button:first-child {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.modal-footer button:first-child:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.modal-footer button:last-child {
  background: var(--primary-gradient);
  color: white;
}

.modal-footer button:last-child:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.modal-footer .danger {
  background: var(--error);
  color: white;
}

.modal-footer .danger:hover {
  background: #dc2626;
}

.modal p {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
  line-height: 1.6;
}

/* 整体分析弹窗 */
.analysis-modal {
  overflow-y: auto;
  padding: var(--space-4) 0;
}

.modal-content-large {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 50%;
  font-size: var(--font-sm);
  cursor: pointer;
  transition: all var(--transition);
}

.close-btn:hover {
  background: var(--border-color);
  transform: rotate(90deg);
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
}

.loading-spinner {
  font-size: 48px;
  margin-bottom: var(--space-4);
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

/* 分析结果 */
.analysis-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.analysis-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.section-title {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: 6px;
}

.winrate-display {
  text-align: center;
  padding: var(--space-4) 0;
}

.winrate-value {
  display: block;
  font-size: 48px;
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.winrate-label {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

.status-text {
  font-size: var(--font-sm);
  color: var(--text-primary);
  line-height: 1.7;
}

.personality-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.personality-tag {
  padding: 4px 12px;
  background: var(--primary-gradient);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 500;
}

.risk-list, .suggestion-list {
  margin: 0;
  padding-left: var(--space-4);
  font-size: var(--font-sm);
  color: var(--text-primary);
  line-height: 2;
}

.risk-list li {
  color: var(--error);
}

.suggestion-list li {
  color: var(--info);
}

/* 剪贴板监听栏 */
.clipboard-monitor-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) var(--space-4);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  gap: var(--space-2);
}

.clipboard-monitor-bar.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
  border-bottom: 1px solid var(--warning);
}

.monitor-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-xs);
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.clipboard-monitor-bar.active .status-dot {
  background: var(--warning);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.monitor-toggle-btn {
  padding: var(--space-1) var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.monitor-toggle-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.clipboard-monitor-bar.active .monitor-toggle-btn {
  background: var(--error);
  color: white;
}

/* 剪贴板提示条 */
.clipboard-toast {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%);
  border-bottom: 1px solid rgba(16, 185, 129, 0.15);
}

.clipboard-preview {
  flex: 1;
  font-size: var(--font-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clipboard-buttons {
  display: flex;
  gap: var(--space-1);
}

.clipboard-add-btn {
  padding: var(--space-1) var(--space-2);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
  min-width: 40px;
  text-align: center;
}

.clipboard-add-btn.them {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.clipboard-add-btn.me {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.clipboard-add-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

/* ===== 设计升级覆盖 ===== */
.coach-page {
  height: auto;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: transparent;
  overflow: visible;
}

.top-bar,
.clipboard-monitor-bar,
.clipboard-toast,
.history-sticky {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(247, 241, 233, 0.88) 100%);
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(18px);
}

.top-bar,
.clipboard-monitor-bar,
.clipboard-toast,
.history-sticky {
  border-radius: var(--radius-xl);
}

.top-bar {
  padding: var(--space-4);
  gap: var(--space-3);
}

.top-bar select,
.skill-select,
.modal input,
.modal textarea {
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.top-bar select,
.skill-select {
  min-height: 40px;
  padding: 0 var(--space-3);
  color: var(--text-primary);
}

.top-bar-actions .icon-btn,
.monitor-toggle-btn,
.analyze-all-btn,
.btn-copy,
.btn-send,
.modal-footer button:last-child,
.input-footer button,
.empty-state button {
  background: var(--primary-gradient);
  color: white;
  border: none;
  box-shadow: 0 16px 28px rgba(15, 118, 110, 0.16);
}

.top-bar-actions .icon-btn {
  min-width: 48px;
  min-height: 34px;
  padding: 0 var(--space-3);
  font-size: var(--font-xs);
  font-weight: 700;
  white-space: nowrap;
}

.top-bar-actions .icon-btn.danger,
.modal-footer .danger {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
}

.content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  padding: 0;
  overflow: visible;
}

.card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 241, 233, 0.84) 100%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.status-card {
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
}

.status-divider {
  display: none;
}

.strategy-split {
  gap: var(--space-4);
}

.strategy-item {
  border-bottom-style: dashed;
}

.reply-item {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(226, 250, 244, 0.92) 100%);
  border-color: rgba(15, 118, 110, 0.18);
}

.reply-style,
.personality-tag {
  background: var(--primary-bg);
  color: var(--primary-dark);
}

.history-sticky {
  overflow: hidden;
}

.history-header {
  padding: var(--space-4) var(--space-4) var(--space-3);
  border-bottom: 1px solid rgba(72, 57, 41, 0.08);
}

.history-body {
  max-height: 180px;
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.msg-bubble {
  border-radius: 14px;
}

.input-footer button:disabled {
  background: rgba(157, 143, 130, 0.4);
  box-shadow: none;
}

.empty-state {
  border-radius: var(--radius-2xl);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.86) 0%, rgba(247, 241, 233, 0.72) 100%);
  border: 1px dashed var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.empty-icon {
  width: 68px;
  height: 68px;
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-4);
  opacity: 1;
  background:
    linear-gradient(135deg, rgba(15, 118, 110, 0.14) 0%, rgba(194, 65, 12, 0.1) 100%);
  border: 1px solid rgba(15, 118, 110, 0.12);
}

.modal > div,
.modal-content-large {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 241, 233, 0.94) 100%);
  border: 1px solid rgba(255, 255, 255, 0.62);
}

.loading-spinner {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 3px solid rgba(15, 118, 110, 0.14);
  border-top-color: var(--primary);
}

:global(.dark-theme) .top-bar,
:global(.dark-theme) .clipboard-monitor-bar,
:global(.dark-theme) .clipboard-toast,
:global(.dark-theme) .history-sticky,
:global(.dark-theme) .coach-workbench,
:global(.dark-theme) .call-panel,
:global(.dark-theme) .card,
:global(.dark-theme) .modal > div,
:global(.dark-theme) .modal-content-large {
  background: var(--surface-main) !important;
  border-color: var(--border-color) !important;
  backdrop-filter: none;
}
</style>

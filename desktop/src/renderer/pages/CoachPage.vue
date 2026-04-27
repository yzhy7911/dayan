<template>
  <div class="coach-page">
    <div class="top-bar">
      <select v-model="currentGoalId" @change="onGoalChange">
        <option value="">🎯 选择目标</option>
        <option v-for="goal in goals" :key="goal.id" :value="goal.id">{{ goal.name }}</option>
      </select>
      <button @click="showNewGoalModal = true">➕ 新建</button>
      <button v-if="currentGoal" @click="confirmDeleteGoal">🗑️ 删除</button>
    </div>

    <div v-if="currentGoal" class="history-sticky">
      <div class="history-header" @click="toggleHistory">
        📝 历史 ({{ currentGoal.messages.length }})
        <span class="toggle">{{ showHistory ? '▲' : '▼' }}</span>
      </div>
      <div v-show="showHistory" class="history-body">
        <div v-for="msg in currentGoal.messages" :key="msg.timestamp" :class="['msg-item', getMsgClass(msg.content)]">
          <div class="msg-label">{{ getMsgLabel(msg.content) }}</div>
          <div class="msg-content">{{ msg.content }}</div>
        </div>
        <div v-if="!currentGoal.messages.length" class="empty">暂无记录</div>
      </div>
    </div>

    <div v-if="currentGoal" class="content">
      <div class="card win-rate">
        <div class="card-title">📊 胜率 {{ latestAnalysis?.winRate || '--' }}%</div>
        <div class="progress">
          <div class="progress-bar" :style="{ width: (latestAnalysis?.winRate || 0) + '%' }"></div>
        </div>
        <div class="situation">
          <div class="good">✓ {{ latestAnalysis?.advantages || '暂无' }}</div>
          <div class="bad">✗ {{ latestAnalysis?.disadvantages || '暂无' }}</div>
        </div>
      </div>

      <div class="card intent">
        <div class="card-title">🎭 意图分析</div>
        <div class="intent-grid">
          <div>表面：{{ latestAnalysis?.surfaceIntent || '--' }}</div>
          <div class="red">真实：{{ latestAnalysis?.realIntent || '--' }}</div>
          <div>情绪：<span class="orange">{{ latestAnalysis?.emotion || '--' }}</span></div>
          <div>需求：{{ latestAnalysis?.needs || '--' }}</div>
        </div>
      </div>

      <div class="card strategy">
        <div class="card-title">💡 策略建议</div>
        <div class="strategy-split">
          <div class="strategy-col">
            <div class="good">✅ 应该做的</div>
            <div v-for="(item, idx) in (latestAnalysis?.shouldDo || [])" :key="idx">{{ item }}</div>
          </div>
          <div class="strategy-col">
            <div class="bad">❌ 不要做的</div>
            <div v-for="(item, idx) in (latestAnalysis?.shouldNotDo || [])" :key="idx">{{ item }}</div>
          </div>
        </div>
        <div class="tone">🎨 语气：{{ latestAnalysis?.recommendedTone || '--' }}</div>
      </div>

      <div class="card replies">
        <div class="card-title">💬 推荐话术</div>
        <div class="replies-list">
          <div v-for="(reply, idx) in (latestAnalysis?.replies || [])" :key="idx" class="reply-item">
            <div class="reply-header">
              <span class="reply-num">{{ idx + 1 }}</span>
              <span class="reply-style">{{ reply.style }}</span>
            </div>
            <div class="reply-content">{{ reply.content }}</div>
            <div class="reply-actions">
              <button class="btn-copy" @click="copyReply(reply, idx)">📋 复制</button>
              <button class="btn-send" @click="sendReply(reply, idx)">🚀 发送</button>
            </div>
          </div>
          <div v-if="!latestAnalysis?.replies?.length" class="empty">暂无话术</div>
        </div>
      </div>
    </div>

    <div v-if="currentGoal" class="input-area">
      <textarea v-model="inputText" placeholder="输入客户说的话..." rows="3" @keydown.ctrl.enter="sendMessage"></textarea>
      <div class="input-footer">
        <span>Ctrl+Enter 发送</span>
        <button :disabled="!inputText.trim() || isSending" @click="sendMessage">
          {{ isSending ? '🔄 分析中...' : '🧠 发送' }}
        </button>
      </div>
    </div>

    <div v-if="!currentGoal" class="empty-state">
      <div class="empty-icon">🧠</div>
      <div class="empty-title">聊天军师</div>
      <button @click="showNewGoalModal = true">➕ 创建目标</button>
    </div>

    <div v-if="showNewGoalModal" class="modal" @click="showNewGoalModal = false">
      <div @click.stop>
        <div class="modal-title">✨ 创建目标</div>
        <input v-model="newGoalName" placeholder="目标名称" />
        <textarea v-model="newGoalContent" placeholder="目标描述（可选）" rows="2"></textarea>
        <div class="modal-footer">
          <button @click="showNewGoalModal = false">取消</button>
          <button @click="createGoal">创建</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteModal" class="modal" @click="showDeleteModal = false">
      <div @click.stop>
        <div class="modal-title">⚠️ 删除目标</div>
        <p>确定删除「{{ currentGoal?.name }}」？</p>
        <div class="modal-footer">
          <button @click="showDeleteModal = false">取消</button>
          <button class="danger" @click="deleteGoal">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CoachStorage } from '../utils/coach-storage'
import '../skills/puachat-master.skill'
import '../skills/top-sales-chat.skill'
import { getSkillNames, getSkill } from '../skills/skill-loader'

const goals = ref<any[]>([])
const currentGoalId = ref<number | ''>('')
const currentGoal = ref<any>(null)
const latestAnalysis = ref<any>(null)
const inputText = ref('')
const isSending = ref(false)
const showNewGoalModal = ref(false)
const showDeleteModal = ref(false)
const newGoalName = ref('')
const newGoalContent = ref('')
const selectedSkill = ref('')
const availableSkills = ref<string[]>([])
const showHistory = ref(true)

const loadSkills = () => {
  availableSkills.value = getSkillNames()
}

const getMsgClass = (content: string) => {
  if (content.startsWith('[发送话术')) return 'send'
  if (content.startsWith('[复制话术')) return 'copy'
  return 'user'
}

const getMsgLabel = (content: string) => {
  if (content.startsWith('[发送话术')) return '🚀 发送'
  if (content.startsWith('[复制话术')) return '📋 复制'
  return '💬 ' + (currentGoal.value?.name || '')
}

const toggleHistory = () => { showHistory.value = !showHistory.value }
const loadGoals = async () => { goals.value = await CoachStorage.getGoals() }
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
const sendMessage = async () => {
  if (!inputText.value.trim() || !currentGoal.value || isSending.value) return
  isSending.value = true
  const userMessage = inputText.value.trim()
  inputText.value = ''
  try {
    const history = currentGoal.value.messages.map((m: any) => ({ role: m.role, content: m.content }))
    history.push({ role: 'user', content: userMessage })
    let goalText = currentGoal.value.goal
    if (selectedSkill.value) {
      const skill = getSkill(selectedSkill.value)
      if (skill) {
        goalText = currentGoal.value.goal + '\n\n【使用技能：' + selectedSkill.value + '】\n\n' + skill.prompts.system
      }
    }
    const result = await (window as any).electronAPI?.ai?.analyzeIntent?.(history, goalText)
    if (result?.winRate) {
      latestAnalysis.value = result
      await CoachStorage.addMessage(currentGoal.value.id, { role: 'user', content: userMessage, timestamp: Date.now() })
      currentGoal.value.messages.push({ role: 'user', content: userMessage, timestamp: Date.now() })
    }
  } catch (e) {
    console.error(e)
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
onMounted(async () => {
  await loadGoals()
  loadSkills()
  if (goals.value.length) {
    currentGoalId.value = goals.value[0].id
    await onGoalChange()
  }
})
</script>

<style scoped>
.coach-page { height: 100%; display: flex; flex-direction: column; background: #f5f7fa; overflow: hidden; }
.top-bar { display: flex; gap: 8px; padding: 12px; background: white; border-bottom: 1px solid #e8e8e8; align-items: center; }
.top-bar select { flex: 1; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px; }
.top-bar button { padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; background: #f0f0f0; }
.top-bar button:hover { background: #e0e0e0; }
.skill-label { font-size: 13px; color: #666; margin-left: 16px; }
.skill-select { padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 13px; background: white; }
.history-sticky { background: #fafafa; border-bottom: 1px solid #e8e8e8; max-height: 200px; overflow-y: auto; }
.history-header { display: flex; justify-content: space-between; padding: 10px 16px; background: white; cursor: pointer; font-size: 13px; font-weight: 600; }
.toggle { color: #999; }
.history-body { padding: 8px 16px; }
.msg-item { padding: 8px 10px; border-radius: 6px; margin-bottom: 6px; }
.msg-item.user { background: #e6f7ff; }
.msg-item.send { background: #d9f7be; border-left: 3px solid #52c41a; }
.msg-item.copy { background: #f9f0ff; border-left: 3px solid #722ed1; }
.msg-label { font-size: 11px; font-weight: 600; color: #666; margin-bottom: 3px; }
.msg-content { font-size: 13px; color: #333; }
.content { flex: 1; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.card { background: white; border-radius: 8px; padding: 14px; }
.win-rate { border-left: 4px solid #1890ff; }
.intent { border-left: 4px solid #13c2c2; }
.strategy { border-left: 4px solid #722ed1; }
.replies { border-left: 4px solid #52c41a; }
.card-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #333; }
.progress { height: 8px; background: #f0f0f0; border-radius: 4px; margin-bottom: 12px; }
.progress-bar { height: 100%; background: #1890ff; border-radius: 4px; transition: width 0.3s; }
.situation { display: flex; flex-direction: column; gap: 6px; }
.good { padding: 6px 10px; background: #f6ffed; color: #52c41a; border-radius: 6px; font-size: 13px; }
.bad { padding: 6px 10px; background: #fff1f0; color: #ff4d4f; border-radius: 6px; font-size: 13px; }
.intent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
.red { background: #fff2f0; padding: 10px; border-radius: 6px; border-left: 3px solid #ff4d4f; }
.orange { color: #fa8c16; font-weight: 600; }
.strategy-split { display: flex; gap: 12px; margin-bottom: 12px; }
.strategy-col { flex: 1; font-size: 12px; }
.tone { padding: 8px 12px; background: #f9f0ff; border-radius: 6px; font-size: 13px; color: #722ed1; }
.replies-list { display: flex; flex-direction: column; gap: 12px; }
.reply-item { padding: 14px; background: linear-gradient(135deg, #f6ffed, #d9f7be); border: 2px solid #52c41a; border-radius: 10px; box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2); }
.reply-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.reply-num { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #52c41a, #73d13d); color: white; border-radius: 50%; font-size: 12px; font-weight: 700; }
.reply-style { padding: 4px 12px; background: #d9f7be; color: #389e0d; border-radius: 20px; font-size: 12px; font-weight: 600; }
.reply-content { font-size: 15px; color: #1a1a1a; line-height: 1.7; margin-bottom: 12px; font-weight: 500; }
.reply-actions { display: flex; gap: 10px; }
.btn-copy, .btn-send { flex: 1; padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-copy { background: white; color: #389e0d; border: 2px solid #52c41a; }
.btn-send { background: linear-gradient(135deg, #52c41a, #73d13d); color: white; box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3); }
.btn-copy:hover, .btn-send:hover { transform: translateY(-2px); }
.input-area { padding: 12px; background: white; border-top: 1px solid #e8e8e8; flex-shrink: 0; }
.input-area textarea { width: 100%; padding: 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px; resize: none; outline: none; }
.input-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
.input-footer span { font-size: 12px; color: #999; }
.input-footer button { padding: 10px 20px; background: #1890ff; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
.input-footer button:disabled { background: #d9d9d9; cursor: not-allowed; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.empty-icon { font-size: 70px; margin-bottom: 16px; }
.empty-title { font-size: 20px; font-weight: 700; color: #333; margin-bottom: 24px; }
.empty-state button { padding: 12px 24px; background: #1890ff; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.empty { text-align: center; color: #999; font-size: 13px; padding: 12px; }
.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal > div { background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 400px; }
.modal-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #333; }
.modal input, .modal textarea { width: 100%; padding: 10px 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px; margin-bottom: 12px; outline: none; }
.modal textarea { resize: none; }
.modal-footer { display: flex; gap: 10px; }
.modal-footer button { flex: 1; padding: 10px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
.modal-footer button:first-child { background: #f0f0f0; color: #666; }
.modal-footer button:last-child { background: #1890ff; color: white; }
.modal-footer .danger { background: #ff4d4f; color: white; }
.modal p { font-size: 14px; color: #666; margin-bottom: 16px; }
</style>

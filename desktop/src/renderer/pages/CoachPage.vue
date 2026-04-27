<template>
  <div class="coach-page">
    <div class="top-bar">
      <select v-model="currentGoalId" @change="onGoalChange">
        <option value="">🎯 选择目标</option>
        <option v-for="goal in goals" :key="goal.id" :value="goal.id">{{ goal.name }}</option>
      </select>
      <button @click="showNewGoalModal = true">➕ 新建</button>
      <button v-if="currentGoal" @click="openEditGoalModal">✏️ 编辑</button>
      <button v-if="currentGoal" @click="confirmDeleteGoal">🗑️ 删除</button>
    </div>

    <div v-if="currentGoal" class="history-sticky">
      <div class="history-header">
        <span @click="toggleHistory" style="cursor: pointer;">
          📝 历史 ({{ currentGoal.messages.length }})
        </span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button
            v-if="currentGoal.messages.length >= 2"
            class="analyze-all-btn"
            :disabled="isAnalyzingAll"
            @click.stop="analyzeAllMessages"
          >
            {{ isAnalyzingAll ? '🔄 分析中...' : '🔮 整体分析' }}
          </button>
          <span class="toggle" @click="toggleHistory">{{ showHistory ? '▲' : '▼' }}</span>
        </div>
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
      <!-- 顶部技能选择器 -->
      <div class="skill-selector">
        <span class="skill-label">🎯 军师技能</span>
        <select v-model="selectedSkill" class="skill-select">
          <option value="">默认分析</option>
          <option v-for="skill in availableSkills" :key="skill">{{ skill }}</option>
        </select>
      </div>

      <!-- 胜率 + 意图 合并卡片 -->
      <div class="card status-card">
        <div class="status-left">
          <div class="card-title">📊 胜率</div>
          <div class="winrate-compact">
            <span class="winrate-num">{{ latestAnalysis?.winRate || '--' }}%</span>
            <div class="progress-small">
              <div class="progress-bar" :style="{ width: (latestAnalysis?.winRate || 0) + '%' }"></div>
            </div>
          </div>
          <div class="situation-compact">
            <div class="good-tag">✓ {{ latestAnalysis?.advantages || '暂无' }}</div>
            <div class="bad-tag">⚠ {{ latestAnalysis?.disadvantages || '暂无' }}</div>
          </div>
        </div>
        <div class="status-divider"></div>
        <div class="status-right">
          <div class="card-title">🎭 意图</div>
          <div class="intent-list">
            <div class="intent-item"><span class="intent-label">情绪</span><span class="orange">{{ latestAnalysis?.emotion || '--' }}</span></div>
            <div class="intent-item"><span class="intent-label">真实</span><span class="red">{{ latestAnalysis?.realIntent || '--' }}</span></div>
            <div class="intent-item"><span class="intent-label">需求</span><span>{{ latestAnalysis?.needs || '--' }}</span></div>
          </div>
        </div>
      </div>

      <!-- 策略建议 -->
      <div class="card strategy">
        <div class="card-title">💡 策略建议</div>
        <div class="strategy-split">
          <div class="strategy-col">
            <div class="col-title good">✅ 应该做</div>
            <div class="strategy-list">
              <div v-for="(item, idx) in (latestAnalysis?.shouldDo || [])" :key="idx" class="strategy-item">{{ item }}</div>
            </div>
          </div>
          <div class="strategy-col">
            <div class="col-title bad">❌ 不要做</div>
            <div class="strategy-list">
              <div v-for="(item, idx) in (latestAnalysis?.shouldNotDo || [])" :key="idx" class="strategy-item">{{ item }}</div>
            </div>
          </div>
        </div>
        <div class="tone">🎨 语气：{{ latestAnalysis?.recommendedTone || '--' }}</div>
      </div>

      <!-- 推荐话术 -->
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
      <textarea v-model="inputText" placeholder="输入对方说的话..." rows="3" @keydown.ctrl.enter="sendMessage"></textarea>
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

    <div v-if="showEditGoalModal" class="modal" @click="showEditGoalModal = false">
      <div @click.stop>
        <div class="modal-title">✏️ 编辑目标</div>
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
        <div class="modal-title">⚠️ 删除目标</div>
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
          <div class="modal-title">🔮 整体对话分析</div>
          <button class="close-btn" @click="showAnalysisModal = false">✕</button>
        </div>

        <div v-if="isAnalyzingAll" class="loading-state">
          <div class="loading-spinner">🔄</div>
          <p>正在深度分析历史对话...</p>
        </div>

        <div v-else class="analysis-result">
          <div class="analysis-section">
            <div class="section-title">📊 总体评估</div>
            <div class="winrate-display">
              <span class="winrate-value">{{ overallAnalysis.winRate || 0 }}%</span>
              <span class="winrate-label">当前成功率</span>
            </div>
          </div>

          <div class="analysis-section">
            <div class="section-title">💡 关系现状</div>
            <div class="status-text">{{ overallAnalysis.relationshipStatus || '暂无分析' }}</div>
          </div>

          <div class="analysis-section">
            <div class="section-title">🎭 对方画像</div>
            <div class="personality-tags">
              <span v-for="(t, i) in overallAnalysis.personality || []" :key="i" class="personality-tag">{{ t }}</span>
            </div>
          </div>

          <div class="analysis-section">
            <div class="section-title">⚠️ 潜在风险</div>
            <ul class="risk-list">
              <li v-for="(r, i) in overallAnalysis.risks || []" :key="i">{{ r }}</li>
            </ul>
          </div>

          <div class="analysis-section">
            <div class="section-title">🚀 下一步建议</div>
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
const showEditGoalModal = ref(false)
const newGoalName = ref('')
const newGoalContent = ref('')
const editGoalName = ref('')
const editGoalContent = ref('')
const selectedSkill = ref('')
const availableSkills = ref<string[]>([])
const showHistory = ref(false)
const showAnalysisModal = ref(false)
const isAnalyzingAll = ref(false)
const overallAnalysis = ref<any>({})

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
      alert('聊天记录太少，无法进行整体分析')
      isAnalyzingAll.value = false
      return
    }

    // 调用 AI 整体分析
    const result = await window.electronAPI?.ai?.analyzeOverall(history, currentGoal.value.goal)

    if (result) {
      overallAnalysis.value = result
    }
  } catch (e) {
    console.error('整体分析失败:', e)
  } finally {
    isAnalyzingAll.value = false
  }
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
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  align-items: center;
}

.top-bar select {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-md);
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

.top-bar button {
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: var(--font-sm);
  font-weight: 500;
  transition: all var(--transition);
}

.top-bar button:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

/* 技能选择器 - 移到内容区顶部 */
.skill-selector {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.skill-label {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  font-weight: 600;
}

.skill-select {
  flex: 1;
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
  max-height: 120px;
  overflow-y: auto;
  padding: var(--space-2) var(--space-4);
}

.msg-item {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-1);
  transition: all var(--transition);
}

.msg-item:hover {
  transform: translateX(2px);
}

.msg-item.user {
  background: var(--info-bg);
  border-left: 2px solid var(--info);
}

.msg-item.send {
  background: var(--success-bg);
  border-left: 2px solid var(--success);
}

.msg-item.copy {
  background: var(--secondary-bg);
  border-left: 2px solid var(--secondary);
}

.msg-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 1px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.msg-content {
  font-size: var(--font-xs);
  color: var(--text-primary);
  line-height: 1.4;
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

/* 输入区域 */
.input-area {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-primary);
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
}

.input-area textarea {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  resize: none;
  outline: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: all var(--transition);
}

.input-area textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
  background: var(--bg-primary);
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
</style>

<template>
  <div class="contact-page">
    <!-- SVIP Banner -->
    <div class="svip-banner">
      <div class="banner-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
      </div>
      <div class="banner-content">
        <h3 class="banner-title">联系人画像</h3>
        <p class="banner-desc">深度分析聊天记录，建立专属沟通档案</p>
      </div>
      <button class="upgrade-btn">SVIP</button>
    </div>

    <!-- 联系人列表 -->
    <div v-if="!selectedContact" class="contact-list-container">
      <div class="list-header">
        <h3 class="list-title">我的联系人</h3>
        <button class="add-btn" @click="showAddModal = true">
          <span>+</span>
        </button>
      </div>

      <div class="contact-list">
        <div
          v-for="contact in contacts"
          :key="contact.id"
          class="contact-item"
          @click="selectContact(contact)"
        >
          <div class="contact-avatar">
            {{ contact.name.charAt(0) }}
          </div>
          <div class="contact-info">
            <div class="contact-name">
              {{ contact.name }}
              <span v-if="contact.remark" class="contact-remark">({{ contact.remark }})</span>
            </div>
            <div class="contact-meta">
              <span class="chat-count">{{ contact.chatCount }} 次对话</span>
              <span v-if="contact.lastChatTime" class="last-time">
                {{ formatTime(contact.lastChatTime) }}
              </span>
            </div>
            <div v-if="contact.tags.length > 0" class="contact-tags">
              <span v-for="tag in contact.tags.slice(0, 3)" :key="tag" class="tag">
                {{ tag }}
              </span>
            </div>
          </div>
          <div class="contact-arrow">›</div>
        </div>

        <div v-if="contacts.length === 0" class="empty-list">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <p>暂无联系人，点击右上角添加</p>
        </div>
      </div>
    </div>

    <!-- 联系人详情 -->
    <div v-else class="contact-detail">
      <div class="detail-header">
        <button class="back-btn" @click="selectedContact = null">‹</button>
        <h3 class="detail-title">{{ selectedContact.name }}</h3>
        <button class="analyze-btn" @click="analyzeContact" :disabled="isAnalyzing">
          {{ isAnalyzing ? '分析中...' : 'AI 分析' }}
        </button>
      </div>

      <div class="detail-content">
        <!-- 分析结果卡片 -->
        <div v-if="analysis" class="analysis-card">
          <div class="analysis-header">
            <h4 class="analysis-title">🧠 画像分析</h4>
            <span class="analysis-time">{{ formatTime(analysis.analyzedAt) }}</span>
          </div>

          <div class="analysis-item">
            <span class="analysis-label">性格特点</span>
            <p class="analysis-value">{{ analysis.personality }}</p>
          </div>

          <div class="analysis-item">
            <span class="analysis-label">沟通风格</span>
            <p class="analysis-value">{{ analysis.communicationStyle }}</p>
          </div>

          <div class="analysis-item">
            <span class="analysis-label">情绪倾向</span>
            <p class="analysis-value">{{ analysis.emotionalTendency }}</p>
          </div>

          <div class="analysis-item">
            <span class="analysis-label">最佳回复时间</span>
            <p class="analysis-value">{{ analysis.bestResponseTime }}</p>
          </div>

          <div class="analysis-item">
            <span class="analysis-label">常见话题</span>
            <div class="topic-tags">
              <span v-for="topic in analysis.commonTopics" :key="topic" class="topic-tag">
              {{ topic }}
            </span>
            </div>
          </div>

          <div class="analysis-item">
            <span class="analysis-label">⚠️ 避讳话题</span>
            <div class="topic-tags">
              <span v-for="topic in analysis.tabooTopics" :key="topic" class="taboo-tag">
              {{ topic }}
            </span>
            </div>
          </div>

          <div class="analysis-item">
            <span class="analysis-label">💡 沟通建议</span>
            <ul class="suggestion-list">
              <li v-for="(s, i) in analysis.suggestions" :key="i">{{ s }}</li>
            </ul>
          </div>
        </div>

        <div v-else class="no-analysis">
          <div class="no-analysis-icon">🔍</div>
          <p>点击右上角「AI 分析」生成画像</p>
        </div>

        <!-- 聊天记录区域 -->
        <div class="chat-section">
          <h4 class="section-title">📝 聊天记录</h4>

          <div class="chat-input-area">
            <textarea
              v-model="newChatContent"
              class="chat-textarea"
              placeholder="粘贴聊天内容，用于 AI 分析..."
              rows="3"
            ></textarea>
            <div class="chat-input-actions">
              <select v-model="newChatSender" class="sender-select">
                <option value="contact">对方说</option>
                <option value="me">我说</option>
              </select>
              <button class="add-chat-btn" @click="addChatRecord">
                添加
              </button>
            </div>
          </div>

          <div class="chat-records">
            <div
              v-for="record in chatRecords"
              :key="record.id"
              :class="['chat-record', record.sender]"
            >
              <div class="chat-bubble">
                <div class="chat-content">{{ record.content }}</div>
                <div class="chat-time">{{ formatTime(record.timestamp) }}</div>
              </div>
            </div>

            <div v-if="chatRecords.length === 0" class="no-records">
              暂无聊天记录
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加联系人弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <h3 class="modal-title">添加联系人</h3>

        <div class="form-group">
          <label class="form-label">姓名 / 昵称</label>
          <input v-model="newContact.name" class="form-input" placeholder="请输入姓名" type="text">
        </div>

        <div class="form-group">
          <label class="form-label">备注</label>
          <input v-model="newContact.remark" class="form-input" placeholder="备注信息" type="text">
        </div>

        <div class="modal-actions">
          <button class="cancel-btn" @click="showAddModal = false">取消</button>
          <button class="confirm-btn" @click="addContact">确认添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ContactStorage, Contact, ContactAnalysis } from '../utils/contact-storage'

const contacts = ref<Contact[]>([])
const selectedContact = ref<Contact | null>(null)
const analysis = ref<ContactAnalysis | null>(null)
const chatRecords = ref<any[]>([])
const showAddModal = ref(false)
const isAnalyzing = ref(false)
const newChatContent = ref('')
const newChatSender = ref<'me' | 'contact'>('contact')
const newContact = ref({
  name: '',
  remark: ''
})

onMounted(async () => {
  await loadContacts()
})

async function loadContacts() {
  contacts.value = await ContactStorage.getContacts()
}

async function selectContact(contact: Contact) {
  if (!contact.id) return
  selectedContact.value = contact
  analysis.value = await ContactStorage.getLatestAnalysis(contact.id)
  chatRecords.value = await ContactStorage.getChatRecords(contact.id)
}

async function addContact() {
  if (!newContact.value.name.trim()) return

  await ContactStorage.createContact(
    newContact.value.name.trim(),
    newContact.value.remark.trim()
  )

  newContact.value = { name: '', remark: '' }
  showAddModal.value = false
  await loadContacts()
}

async function addChatRecord() {
  if (!selectedContact.value?.id || !newChatContent.value.trim()) return

  await ContactStorage.addChatRecord(
    selectedContact.value.id,
    newChatContent.value.trim(),
    newChatSender.value
  )

  newChatContent.value = ''
  chatRecords.value = await ContactStorage.getChatRecords(selectedContact.value.id)
  await loadContacts()
}

async function analyzeContact() {
  if (!selectedContact.value?.id) return

  isAnalyzing.value = true

  try {
    // 使用 AI 引擎分析
    const records = await ContactStorage.getChatRecords(selectedContact.value.id)

    if (records.length < 3) {
      alert('请先添加至少 3 条聊天记录后再分析')
      return
    }

    // 构造分析数据 - 这里先模拟分析结果
    // 实际项目中调用主进程 AI 分析
    const mockAnalysis: Omit<ContactAnalysis, 'id' | 'analyzedAt'> = {
      contactId: selectedContact.value.id,
      personality: '性格开朗乐观，喜欢分享生活，比较健谈',
      communicationStyle: '偏向感性沟通，喜欢用表情符号',
      commonTopics: ['美食', '旅行', '电影'],
      emotionalTendency: '偏积极向上，偶尔会吐槽工作压力',
      bestResponseTime: '中午 12:00-14:00 和晚上 20:00-23:00 回复最快',
      tabooTopics: ['不喜欢讨论工作细节', '避免提前任'],
      suggestions: [
        '多聊生活话题，增加亲切感',
        '回复时适当使用表情符号',
        '避免在工作时间发太长的消息',
        '对方说话时多倾听，少打断'
      ]
    }

    await ContactStorage.saveAnalysis(mockAnalysis)
    analysis.value = await ContactStorage.getLatestAnalysis(selectedContact.value.id)

  } catch (error) {
    console.error('分析失败:', error)
  } finally {
    isAnalyzing.value = false
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`

  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<style scoped>
.contact-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  background: #f9fafb;
}

.svip-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.banner-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border-radius: 10px;
  color: white;
}

.banner-icon svg {
  width: 20px;
  height: 20px;
}

.banner-content {
  flex: 1;
}

.banner-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.banner-desc {
  font-size: 12px;
  color: #6b7280;
}

.upgrade-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: none;
}

.contact-list-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.add-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #10b981;
  color: white;
  border: none;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-list {
  padding: 8px 0;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.contact-item:hover {
  background: #f9fafb;
}

.contact-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.contact-remark {
  font-size: 13px;
  font-weight: normal;
  color: #6b7280;
  margin-left: 4px;
}

.contact-meta {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 6px;
  display: flex;
  gap: 12px;
}

.contact-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  padding: 2px 8px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 10px;
  font-size: 11px;
}

.contact-arrow {
  color: #d1d5db;
  font-size: 20px;
}

.empty-list {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

.empty-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 12px;
  color: #d1d5db;
}

/* 详情页 */
.contact-detail {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  gap: 12px;
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f3f4f6;
  border: none;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.analyze-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.analyze-btn:disabled {
  opacity: 0.5;
}

.detail-content {
  padding: 16px;
}

.analysis-card {
  background: #fafafa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.analysis-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.analysis-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.analysis-time {
  font-size: 12px;
  color: #9ca3af;
}

.analysis-item {
  margin-bottom: 14px;
}

.analysis-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
  font-weight: 500;
}

.analysis-value {
  font-size: 14px;
  color: #1f2937;
  margin: 0;
  line-height: 1.6;
}

.topic-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.topic-tag {
  padding: 4px 12px;
  background: #dbeafe;
  color: #2563eb;
  border-radius: 12px;
  font-size: 12px;
}

.taboo-tag {
  padding: 4px 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 12px;
  font-size: 12px;
}

.suggestion-list {
  margin: 0;
  padding-left: 16px;
  font-size: 14px;
  color: #1f2937;
  line-height: 1.8;
}

.no-analysis {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  margin-bottom: 20px;
  background: #fafafa;
  border-radius: 12px;
}

.no-analysis-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

/* 聊天记录 */
.chat-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
}

.chat-input-area {
  margin-bottom: 16px;
}

.chat-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.chat-input-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.sender-select {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.add-chat-btn {
  padding: 6px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.chat-records {
  max-height: 300px;
  overflow-y: auto;
}

.chat-record {
  display: flex;
  margin-bottom: 12px;
}

.chat-record.me {
  justify-content: flex-end;
}

.chat-record.contact {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
}

.chat-record.me .chat-bubble {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-record.contact .chat-bubble {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

.chat-content {
  word-break: break-word;
}

.chat-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
  text-align: right;
}

.no-records {
  text-align: center;
  padding: 30px;
  color: #9ca3af;
  font-size: 13px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 320px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.cancel-btn {
  flex: 1;
  padding: 10px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.confirm-btn {
  flex: 1;
  padding: 10px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
</style>

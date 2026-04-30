<template>
  <div class="contact-page">
    <div class="svip-banner surface-panel">
      <div class="banner-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
      </div>
      <div class="banner-content">
        <p class="banner-kicker">Contact Intelligence</p>
        <h3 class="banner-title">联系人画像</h3>
        <p class="banner-desc">沉淀聊天记录、识别沟通风格，并形成可复用的关系档案。</p>
      </div>
    </div>

    <!-- 联系人列表 -->
    <div v-if="!selectedContact" class="contact-list-container">
      <div class="list-header">
        <h3 class="list-title">我的联系人</h3>
        <div class="header-actions">
          <button v-if="contacts.length > 0" class="export-btn" @click="exportContacts">导出</button>
          <button class="import-btn" @click="triggerImport">导入</button>
          <button class="add-btn" @click="openAddContact">
            <span>+</span>
          </button>
        </div>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleImport"
      >

      <!-- 搜索框 -->
      <div class="search-container">
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索联系人..."
          type="text"
        >
      </div>

      <div class="contact-list">
        <div
          v-for="contact in filteredContacts"
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
          <button
            class="coach-quick-btn"
            @click.stop="openCoachByContactId(contact.id)"
          >
            军师
          </button>
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
        <div class="detail-actions">
          <button class="action-btn coach-btn" @click="openCoachForContact">军师</button>
          <button class="action-btn edit-btn" @click="editContact">编辑</button>
          <button class="action-btn delete-btn" @click="confirmDeleteContact">删除</button>
          <button class="analyze-btn" @click="analyzeContact" :disabled="isAnalyzing">
            {{ isAnalyzing ? '分析中...' : 'AI 分析' }}
          </button>
        </div>
      </div>

      <div class="detail-content">
        <!-- 分析结果卡片 -->
        <div v-if="analysis" class="analysis-card">
          <div class="analysis-header">
            <h4 class="analysis-title">画像分析</h4>
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
            <span class="analysis-label">避讳话题</span>
            <div class="topic-tags">
              <span v-for="topic in analysis.tabooTopics" :key="topic" class="taboo-tag">
              {{ topic }}
            </span>
            </div>
          </div>

          <div class="analysis-item">
            <span class="analysis-label">沟通建议</span>
            <ul class="suggestion-list">
              <li v-for="(s, i) in analysis.suggestions" :key="i">{{ s }}</li>
            </ul>
          </div>
        </div>

        <div v-else class="no-analysis">
          <div class="no-analysis-icon"></div>
          <p>点击右上角「AI 分析」生成画像</p>
        </div>

        <!-- 聊天记录区域 -->
        <div class="chat-section">
          <h4 class="section-title">聊天记录</h4>

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
                <div class="chat-meta">
                  <span class="chat-time">{{ formatTime(record.timestamp) }}</span>
                  <button class="delete-record-btn" @click="deleteChatRecord(record.id)">×</button>
                </div>
              </div>
            </div>

            <div v-if="chatRecords.length === 0" class="no-records">
              暂无聊天记录
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑联系人弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <h3 class="modal-title">{{ isEditMode ? '编辑联系人' : '添加联系人' }}</h3>

        <div class="form-group">
          <label class="form-label">姓名 / 昵称</label>
          <input v-model="editingContact.name" class="form-input" placeholder="请输入姓名" type="text">
        </div>

        <div class="form-group">
          <label class="form-label">备注</label>
          <input v-model="editingContact.remark" class="form-input" placeholder="备注信息" type="text">
        </div>

        <div class="form-group">
          <label class="form-label">标签（用逗号分隔）</label>
          <input v-model="editingContact.tagsStr" class="form-input" placeholder="朋友, 客户, 家人" type="text">
        </div>

        <div class="modal-actions">
          <button class="cancel-btn" @click="showAddModal = false">取消</button>
          <button class="confirm-btn" @click="saveContact">确认保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-content">
        <h3 class="modal-title">确认删除</h3>
        <p class="delete-text">确定要删除「{{ selectedContact?.name }}」吗？所有聊天记录和分析结果也将被删除。</p>
        <div class="modal-actions">
          <button class="cancel-btn" @click="showDeleteModal = false">取消</button>
          <button class="confirm-btn delete-confirm" @click="deleteContact">删除</button>
        </div>
      </div>
    </div>

    <!-- 导入预览弹窗 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-content import-modal">
        <h3 class="modal-title">导入联系人</h3>

        <div v-if="importPreview.length > 0">
          <p class="import-count">检测到 {{ importPreview.length }} 个联系人</p>
          <div class="import-list">
            <div v-for="(item, index) in importPreview.slice(0, 5)" :key="index" class="import-item">
              <span class="import-name">{{ item.name }}</span>
              <span v-if="item.remark" class="import-remark">{{ item.remark }}</span>
            </div>
            <p v-if="importPreview.length > 5" class="import-more">还有 {{ importPreview.length - 5 }} 个联系人...</p>
          </div>
        </div>

        <div class="modal-actions">
          <button class="cancel-btn" @click="showImportModal = false">取消</button>
          <button v-if="importPreview.length > 0" class="confirm-btn" @click="confirmImport">确认导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ContactStorage, Contact, ContactAnalysis } from '../utils/contact-storage'
import { useToast } from '../composables/useToast'

const toast = useToast()
const router = useRouter()

const contacts = ref<Contact[]>([])
const selectedContact = ref<Contact | null>(null)
const analysis = ref<ContactAnalysis | null>(null)
const chatRecords = ref<any[]>([])
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const showImportModal = ref(false)
const isEditMode = ref(false)
const isAnalyzing = ref(false)
const newChatContent = ref('')
const newChatSender = ref<'me' | 'contact'>('contact')
const searchKeyword = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const importPreview = ref<any[]>([])

const filteredContacts = computed(() => {
  if (!searchKeyword.value.trim()) {
    return contacts.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return contacts.value.filter(contact =>
    contact.name.toLowerCase().includes(keyword) ||
    (contact.remark && contact.remark.toLowerCase().includes(keyword)) ||
    contact.tags.some(tag => tag.toLowerCase().includes(keyword))
  )
})

const editingContact = ref({
  id: 0,
  name: '',
  remark: '',
  tagsStr: ''
})

onMounted(async () => {
  await loadContacts()
})

async function loadContacts() {
  contacts.value = await ContactStorage.getContacts()
}

function openAddContact() {
  isEditMode.value = false
  editingContact.value = {
    id: 0,
    name: '',
    remark: '',
    tagsStr: ''
  }
  showAddModal.value = true
}

async function selectContact(contact: Contact) {
  if (!contact.id) return
  selectedContact.value = contact
  analysis.value = await ContactStorage.getLatestAnalysis(contact.id)
  chatRecords.value = await ContactStorage.getChatRecords(contact.id)
}

function openCoachByContactId(contactId?: number) {
  if (!contactId) return
  router.push(`/coach?contactId=${contactId}`)
}

function editContact() {
  if (!selectedContact.value) return
  isEditMode.value = true
  editingContact.value = {
    id: selectedContact.value.id || 0,
    name: selectedContact.value.name,
    remark: selectedContact.value.remark || '',
    tagsStr: selectedContact.value.tags.join(', ')
  }
  showAddModal.value = true
}

async function saveContact() {
  if (!editingContact.value.name.trim()) {
    toast.error('请先填写联系人姓名')
    return
  }

  if (isEditMode.value && editingContact.value.id) {
    // 更新现有联系人
    await ContactStorage.updateContact(editingContact.value.id, {
      name: editingContact.value.name.trim(),
      remark: editingContact.value.remark.trim(),
      tags: editingContact.value.tagsStr.split(',').map(t => t.trim()).filter(t => t)
    })
    toast.success('联系人已更新')
  } else {
    // 添加新联系人
    await ContactStorage.createContact(
      editingContact.value.name.trim(),
      editingContact.value.remark.trim()
    )
    toast.success('联系人已添加')
  }

  editingContact.value = { id: 0, name: '', remark: '', tagsStr: '' }
  showAddModal.value = false
  isEditMode.value = false
  await loadContacts()
  if (selectedContact.value) {
    await selectContact(selectedContact.value)
  }
}

function confirmDeleteContact() {
  showDeleteModal.value = true
}

async function deleteContact() {
  if (!selectedContact.value?.id) return
  await ContactStorage.deleteContact(selectedContact.value.id)
  toast.success('联系人已删除')
  showDeleteModal.value = false
  selectedContact.value = null
  await loadContacts()
}

function exportContacts() {
  try {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      count: contacts.value.length,
      contacts: contacts.value.map(c => ({
        name: c.name,
        remark: c.remark,
        tags: c.tags,
        chatCount: c.chatCount,
        lastChatTime: c.lastChatTime
      }))
    }

    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `联系人_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`成功导出 ${contacts.value.length} 个联系人`)
  } catch (error) {
    console.error('导出失败:', error)
    toast.error('导出失败，请重试')
  }
}

function triggerImport() {
  importPreview.value = []
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    let data: any = JSON.parse(text)

    let contactsToImport: any[] = []
    if (Array.isArray(data)) {
      contactsToImport = data
    } else if (Array.isArray(data.contacts)) {
      contactsToImport = data.contacts
    } else if (Array.isArray(data.items)) {
      contactsToImport = data.items
    } else if (Array.isArray(data.data)) {
      contactsToImport = data.data
    } else {
      toast.error('文件格式不正确，请检查')
      return
    }

    if (contactsToImport.length === 0) {
      toast.error('文件中没有联系人数据')
      return
    }

    // 验证数据格式
    importPreview.value = contactsToImport.filter(c =>
      c.name && typeof c.name === 'string' && c.name.trim()
    ).map(c => ({
      name: c.name.trim(),
      remark: c.remark || '',
      tags: Array.isArray(c.tags) ? c.tags : []
    }))

    if (importPreview.value.length === 0) {
      toast.error('没有有效的联系人数据')
      return
    }

    showImportModal.value = true
    toast.success(`检测到 ${importPreview.value.length} 个联系人`)
  } catch (error) {
    console.error('解析文件失败:', error)
    toast.error('文件解析失败，请检查格式')
  } finally {
    if (target) {
      target.value = ''
    }
  }
}

async function confirmImport() {
  if (importPreview.value.length === 0) return

  try {
    let count = 0
    for (const item of importPreview.value) {
      await ContactStorage.createContact(item.name, item.remark)
      count++
    }
    await loadContacts()
    importPreview.value = []
    showImportModal.value = false
    toast.success(`成功导入 ${count} 个联系人`)
  } catch (error) {
    console.error('导入失败:', error)
    toast.error('导入失败，请重试')
  }
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
  toast.success('聊天记录已添加')
}

async function deleteChatRecord(recordId: number) {
  if (!selectedContact.value?.id) return
  if (!confirm('确定要删除这条聊天记录吗？')) return

  await ContactStorage.deleteChatRecord(selectedContact.value.id, recordId)
  chatRecords.value = await ContactStorage.getChatRecords(selectedContact.value.id)
  toast.success('聊天记录已删除')
}

async function analyzeContact() {
  if (!selectedContact.value?.id) return

  isAnalyzing.value = true

  try {
    // 获取聊天记录
    const records = await ContactStorage.getChatRecords(selectedContact.value.id)

    if (records.length < 3) {
      toast.error('请先添加至少 3 条聊天记录后再分析')
      return
    }

    // 将聊天记录格式化为军师分析需要的格式
    const chatHistory = records.map((r: any) => ({
      role: r.sender === 'me' ? 'assistant' : 'user',
      content: r.content
    }))

    // 调用主进程 AI 进行整体分析
    const result = await window.electronAPI?.ai?.analyzeOverall(chatHistory, '建立良好关系')

    if (result?.success === false && result?.error) {
      toast.error('分析失败：' + result.error)
      return
    }

    if (result) {
      // 保存分析结果 - 从返回的数据中提取并转换
      const analysisData: Omit<ContactAnalysis, 'id' | 'analyzedAt'> = {
        contactId: selectedContact.value.id,
        personality: result.personality?.length ? result.personality.join('，') : '暂无分析结果',
        communicationStyle: result.relationshipStatus || '暂无分析结果',
        commonTopics: Array.isArray(result.personality) ? result.personality.slice(0, 3) : [],
        emotionalTendency: '暂无分析结果',
        bestResponseTime: '暂无分析结果',
        tabooTopics: Array.isArray(result.risks) ? result.risks : [],
        suggestions: Array.isArray(result.nextSteps) ? result.nextSteps : []
      }

      await ContactStorage.saveAnalysis(analysisData)
      analysis.value = await ContactStorage.getLatestAnalysis(selectedContact.value.id)
      toast.success('分析完成！')
    } else {
      toast.error('分析失败，请稍后重试')
    }

  } catch (error: any) {
    console.error('分析失败:', error)
    toast.error('分析失败：' + (error.message || '未知错误'))
  } finally {
    isAnalyzing.value = false
  }
}

function openCoachForContact() {
  if (!selectedContact.value?.id) return
  openCoachByContactId(selectedContact.value.id)
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
  background: var(--bg-secondary);
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
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
  transition: background var(--transition);
}

.search-container {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color var(--transition);
}

.search-input:focus {
  outline: none;
  border-color: var(--secondary);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.export-btn,
.import-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.export-btn {
  background: #dbeafe;
  color: #1d4ed8;
}

.export-btn:hover {
  background: #bfdbfe;
}

.import-btn {
  background: #fef3c7;
  color: #d97706;
}

.import-btn:hover {
  background: #fde68a;
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

.detail-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn {
  flex: 0 0 auto;
  min-width: 52px;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  word-break: keep-all;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.edit-btn {
  background: #fef3c7;
  color: #d97706;
}

.edit-btn:hover {
  background: #fde68a;
}

.coach-btn {
  background: #dcfce7;
  color: #166534;
}

.coach-btn:hover {
  background: #bbf7d0;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}

.analyze-btn {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 14px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  word-break: keep-all;
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

.chat-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.chat-time {
  font-size: 11px;
  opacity: 0.7;
}

.delete-record-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.delete-record-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: white;
}

.chat-record.contact .delete-record-btn {
  color: rgba(0, 0, 0, 0.4);
}

.chat-record.contact .delete-record-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #1f2937;
}

.delete-text {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  margin: 16px 0;
  line-height: 1.6;
}

.delete-confirm {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
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

/* 导入弹窗样式 */
.import-modal {
  max-width: 380px;
}

.import-count {
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 12px;
  text-align: center;
}

.import-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  background: #fafafa;
}

.import-item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: white;
  margin-bottom: 6px;
  border: 1px solid #e5e7eb;
}

.import-item:last-child {
  margin-bottom: 0;
}

.import-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.import-remark {
  font-size: 13px;
  color: #6b7280;
}

.import-more {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  padding: 8px;
  margin: 0;
}

/* 设计升级覆盖 */
.contact-page {
  height: auto;
  min-height: 100%;
  overflow: visible;
  padding: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeIn 0.28s ease;
}

.svip-banner {
  padding: var(--space-5);
  gap: var(--space-4);
  margin-bottom: 0;
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at top right, rgba(47, 107, 102, 0.14), transparent 28%),
    radial-gradient(circle at bottom left, rgba(179, 138, 99, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 243, 237, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.58);
}

.banner-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: var(--primary-gradient);
  box-shadow: 0 18px 34px rgba(15, 118, 110, 0.18);
}

.banner-kicker {
  margin-bottom: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.banner-title {
  font-size: var(--font-xl);
  line-height: 1.25;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.banner-desc {
  max-width: 560px;
  font-size: var(--font-md);
  line-height: 1.65;
  color: var(--text-secondary);
}

.upgrade-btn,
.analyze-btn,
.confirm-btn {
  min-height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  background: var(--primary-gradient);
  color: var(--text-inverse);
  font-size: var(--font-sm);
  font-weight: 700;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.18);
  transition: all var(--transition);
}

.upgrade-btn:hover,
.analyze-btn:hover:not(:disabled),
.confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 36px rgba(15, 118, 110, 0.24);
}

.contact-list-container,
.contact-detail {
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 242, 234, 0.86) 100%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(22px);
}

.list-header,
.detail-header {
  padding: 0 0 var(--space-4);
  border-bottom: 1px solid rgba(72, 57, 41, 0.08);
}

.list-title,
.detail-title,
.analysis-title,
.section-title,
.modal-title {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.header-actions,
.detail-actions,
.chat-input-actions,
.modal-actions {
  gap: var(--space-3);
}

.detail-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.export-btn,
.import-btn,
.cancel-btn,
.action-btn,
.back-btn,
.add-chat-btn {
  min-height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
  transition: all var(--transition);
}

.export-btn:hover,
.import-btn:hover,
.cancel-btn:hover,
.action-btn:hover,
.back-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.9);
  border-color: var(--border-strong);
}

.add-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  background: var(--primary-gradient);
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.16);
}

.search-container {
  padding: var(--space-4) 0;
  border-bottom: none;
}

.search-input,
.chat-textarea,
.sender-select,
.form-input {
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  transition: all var(--transition);
}

.search-input:focus,
.chat-textarea:focus,
.sender-select:focus,
.form-input:focus {
  border-color: rgba(47, 107, 102, 0.32);
  box-shadow: 0 0 0 4px rgba(47, 107, 102, 0.12);
  background: rgba(255, 255, 255, 0.92);
}

.contact-list {
  display: grid;
  gap: var(--space-3);
  padding: 0;
}

.contact-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.54);
  transition: all var(--transition);
}

.contact-item:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: var(--shadow-sm);
}

.contact-avatar {
  border-radius: var(--radius-lg);
  background: var(--primary-gradient);
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.16);
}

.contact-info {
  min-width: 0;
}

.coach-quick-btn {
  min-height: 30px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(15, 118, 110, 0.22);
  background: rgba(15, 118, 110, 0.1);
  color: var(--primary-dark);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.coach-quick-btn:hover {
  background: rgba(15, 118, 110, 0.16);
}

.contact-arrow {
  justify-self: end;
}

.contact-name,
.analysis-value,
.suggestion-list,
.chat-record.contact .chat-bubble {
  color: var(--text-primary);
}

.contact-remark,
.contact-meta,
.analysis-label,
.analysis-time,
.form-label,
.delete-text,
.empty-list,
.no-records {
  color: var(--text-secondary);
}

.tag,
.topic-tag,
.taboo-tag {
  border-radius: var(--radius-full);
  background: var(--primary-bg);
  color: var(--primary-dark);
  font-size: var(--font-xs);
  font-weight: 700;
}

.taboo-tag {
  background: var(--error-bg);
  color: var(--error);
}

.detail-content {
  padding: var(--space-5) 0 0;
}

.analysis-card,
.no-analysis,
.chat-input-area,
.import-list {
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.54);
}

.analysis-card {
  margin-bottom: var(--space-5);
}

.analysis-item {
  padding: var(--space-3) 0;
  margin-bottom: 0;
  border-bottom: 1px solid rgba(72, 57, 41, 0.08);
}

.analysis-item:last-child {
  border-bottom: none;
}

.no-analysis-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto var(--space-3);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(47, 107, 102, 0.12) 0%, rgba(179, 138, 99, 0.12) 100%);
  border: 1px solid rgba(47, 107, 102, 0.12);
}

.chat-section {
  border-top: 1px solid rgba(72, 57, 41, 0.08);
  padding-top: var(--space-5);
}

.chat-textarea {
  min-height: 112px;
  margin-bottom: var(--space-3);
  resize: vertical;
}

.add-chat-btn {
  background: var(--primary-gradient);
  color: var(--text-inverse);
  border-color: transparent;
}

.chat-records {
  max-height: none;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.chat-record {
  margin-bottom: 0;
}

.chat-bubble {
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.chat-record.me .chat-bubble {
  background: var(--primary-gradient);
  border-bottom-right-radius: var(--radius-sm);
}

.chat-record.contact .chat-bubble {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.54);
  border-bottom-left-radius: var(--radius-sm);
}

.modal-overlay {
  background: rgba(17, 14, 12, 0.36);
  backdrop-filter: blur(8px);
}

.modal-content {
  max-width: 420px;
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 242, 234, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(22px);
}

.modal-title {
  text-align: left;
}

.delete-confirm {
  background: linear-gradient(135deg, #c25a4f 0%, #9d3c34 100%);
}

:global(.dark-theme) .svip-banner {
  background:
    radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 28%),
    radial-gradient(circle at bottom left, rgba(179, 138, 99, 0.1), transparent 24%),
    linear-gradient(180deg, rgba(39, 32, 27, 0.96) 0%, rgba(25, 20, 17, 0.94) 100%);
}

:global(.dark-theme) .contact-list-container,
:global(.dark-theme) .contact-detail,
:global(.dark-theme) .modal-content {
  background: var(--surface-main) !important;
  border-color: var(--border-color) !important;
  backdrop-filter: none;
}

:global(.dark-theme) .export-btn,
:global(.dark-theme) .import-btn,
:global(.dark-theme) .cancel-btn,
:global(.dark-theme) .action-btn,
:global(.dark-theme) .back-btn,
:global(.dark-theme) .search-input,
:global(.dark-theme) .chat-textarea,
:global(.dark-theme) .sender-select,
:global(.dark-theme) .form-input,
:global(.dark-theme) .contact-item,
:global(.dark-theme) .analysis-card,
:global(.dark-theme) .no-analysis,
:global(.dark-theme) .chat-input-area,
:global(.dark-theme) .chat-record.contact .chat-bubble,
:global(.dark-theme) .import-list {
  background: var(--surface-muted) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary);
}

:global(.dark-theme) .search-input,
:global(.dark-theme) .chat-textarea,
:global(.dark-theme) .sender-select,
:global(.dark-theme) .form-input {
  background: var(--surface-control) !important;
}

@media (max-width: 760px) {
  .svip-banner,
  .list-header,
  .chat-input-actions,
  .modal-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions,
  .detail-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .detail-header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas:
      "back title"
      "actions actions";
    align-items: center;
    gap: 10px 12px;
  }

  .back-btn {
    grid-area: back;
  }

  .detail-title {
    grid-area: title;
    min-width: 0;
  }

  .detail-actions {
    grid-area: actions;
    justify-content: flex-start;
  }

  .detail-actions .action-btn,
  .detail-actions .analyze-btn {
    min-height: 32px;
    padding: 0 10px;
    white-space: nowrap;
    word-break: keep-all;
    flex: 0 0 auto;
  }

  .contact-item {
    grid-template-columns: auto minmax(0, 1fr) auto;
    row-gap: 8px;
  }

  .coach-quick-btn {
    grid-column: 2 / 3;
    justify-self: start;
  }
}
</style>

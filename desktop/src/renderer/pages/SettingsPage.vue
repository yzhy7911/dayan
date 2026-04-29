<template>
  <div class="settings-page">
    <section class="settings-hero surface-panel">
      <div>
        <p class="hero-kicker">Workspace Controls</p>
        <h1 class="hero-title">把模型、桌面行为和数据管理，收进一套安静的控制台。</h1>
      </div>
      <div class="hero-status-grid">
        <div class="hero-status-item">
          <span class="hero-status-label">主题</span>
          <strong class="hero-status-value">{{ isDarkMode ? '深色' : '浅色' }}</strong>
        </div>
        <div class="hero-status-item">
          <span class="hero-status-label">吸附</span>
          <strong class="hero-status-value">{{ isDockingEnabled ? '已开启' : '已关闭' }}</strong>
        </div>
        <div class="hero-status-item">
          <span class="hero-status-label">备份体积</span>
          <strong class="hero-status-value">{{ exportSize }}</strong>
        </div>
        <div class="hero-status-item">
          <span class="hero-status-label">授权</span>
          <strong class="hero-status-value">{{ currentLicense.isValid ? getLicenseTypeName(currentLicense.type) : '未激活' }}</strong>
        </div>
      </div>
    </section>

    <section class="settings-card surface-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">Appearance</p>
          <h3 class="section-title">界面风格</h3>
        </div>
      </div>
      <div class="setting-row">
        <div class="setting-copy">
          <span class="setting-name">暗色模式</span>
          <span class="setting-desc">切换整套工作台的亮暗主题。</span>
        </div>
        <button class="toggle-switch" :class="{ active: isDarkMode }" @click="toggleDarkMode">
          <span class="toggle-knob"></span>
        </button>
      </div>
    </section>

    <section class="settings-card surface-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">Shortcuts</p>
          <h3 class="section-title">快捷键</h3>
        </div>
      </div>

      <div class="shortcut-grid">
        <div class="shortcut-card">
          <span class="shortcut-name">显示 / 隐藏窗口</span>
          <span class="shortcut-desc">快速唤起桌面工作台。</span>
          <input
            v-model="shortcutConfig.toggleWindow"
            class="shortcut-input"
            placeholder="Ctrl+Shift+S"
            @keydown="captureShortcut($event, 'toggleWindow')"
          />
        </div>
        <div class="shortcut-card">
          <span class="shortcut-name">快速回复</span>
          <span class="shortcut-desc">直接进入智能回复页面。</span>
          <input
            v-model="shortcutConfig.quickReply"
            class="shortcut-input"
            placeholder="Ctrl+Shift+R"
            @keydown="captureShortcut($event, 'quickReply')"
          />
        </div>
        <div class="shortcut-card">
          <span class="shortcut-name">快速润色</span>
          <span class="shortcut-desc">直接进入文本润色页面。</span>
          <input
            v-model="shortcutConfig.quickPolish"
            class="shortcut-input"
            placeholder="Ctrl+Shift+P"
            @keydown="captureShortcut($event, 'quickPolish')"
          />
        </div>
      </div>

      <div class="button-group compact">
        <button class="btn btn-secondary" @click="resetShortcuts">重置</button>
        <button class="btn btn-primary" @click="saveShortcuts">保存</button>
      </div>
    </section>

    <section class="settings-card surface-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">Window</p>
          <h3 class="section-title">桌面行为</h3>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-copy">
          <span class="setting-name">吸附到微信窗口</span>
          <span class="setting-desc">跟随微信窗口移动，保持贴边工作。</span>
        </div>
        <button class="toggle-switch" :class="{ active: isDockingEnabled }" @click="toggleDocking">
          <span class="toggle-knob"></span>
        </button>
      </div>

      <div class="setting-row">
        <div class="setting-copy">
          <span class="setting-name">窗口置顶</span>
          <span class="setting-desc">让工作台始终停留在前景层。</span>
        </div>
        <button class="toggle-switch" :class="{ active: isAlwaysOnTop }" @click="toggleAlwaysOnTop">
          <span class="toggle-knob"></span>
        </button>
      </div>
    </section>

    <section class="settings-card surface-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">Model</p>
          <h3 class="section-title">AI 模型配置</h3>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">API 服务商</label>
        <select v-model="settings.provider" class="form-select">
          <option value="openai">OpenAI</option>
          <option value="qwen">通义千问 (阿里云)</option>
          <option value="deepseek">DeepSeek</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">API Key</label>
        <div class="input-with-icon">
          <input
            v-model="settings.apiKey"
            :type="showApiKey ? 'text' : 'password'"
            class="form-input"
            placeholder="sk-..."
          />
          <button
            type="button"
            class="icon-btn"
            @click="showApiKey = !showApiKey"
            :title="showApiKey ? '隐藏密钥' : '显示密钥'"
          >
            {{ showApiKey ? '隐藏' : '显示' }}
          </button>
        </div>
        <p class="form-hint">密钥仅保存在本地，不会被上传。</p>
      </div>

      <div class="form-group">
        <label class="form-label">API 地址</label>
        <input
          v-model="settings.baseUrl"
          type="text"
          class="form-input"
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div class="form-group">
        <label class="form-label">模型名称</label>
        <input
          v-model="settings.model"
          type="text"
          class="form-input"
          placeholder="gpt-4o-mini"
        />
      </div>

      <div class="button-group">
        <button class="btn btn-secondary" @click="resetToDefault">恢复默认</button>
        <button
          class="btn btn-secondary"
          :class="{ loading: isTesting }"
          :disabled="isTesting || !settings.apiKey"
          @click="testConnection"
        >
          {{ isTesting ? '测试中...' : '测试连接' }}
        </button>
        <button
          class="btn btn-primary"
          :class="{ loading: isSaving }"
          :disabled="isSaving"
          @click="saveSettings"
        >
          {{ isSaving ? '保存中...' : '保存配置' }}
        </button>
      </div>

      <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
        <span class="result-text">{{ testResult.message }}</span>
      </div>
    </section>

    <section class="settings-card surface-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">Prompt</p>
          <h3 class="section-title">自定义系统提示</h3>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">自定义回复 Prompt</label>
        <textarea
          v-model="customPrompt"
          class="form-textarea"
          rows="4"
          placeholder="输入你希望模型长期遵循的系统提示。"
        ></textarea>
        <p class="form-hint">留空时使用内置默认 Prompt。</p>
      </div>

      <div class="button-group">
        <button class="btn btn-secondary" @click="resetPrompt">恢复默认</button>
      </div>
    </section>

    <section class="settings-card surface-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">License</p>
          <h3 class="section-title">授权信息</h3>
        </div>
      </div>

      <div v-if="currentLicense.isValid" class="license-info">
        <div class="license-status active">
          <span class="status-text">已激活</span>
        </div>
        <div class="license-detail">
          <span class="detail-label">版本类型</span>
          <span class="detail-value" :class="currentLicense.type">{{ getLicenseTypeName(currentLicense.type) }}</span>
        </div>
        <div v-if="currentLicense.expireDate" class="license-detail">
          <span class="detail-label">到期时间</span>
          <span class="detail-value">{{ formatDate(currentLicense.expireDate) }}</span>
        </div>
        <button class="btn btn-secondary" @click="showLicenseInput = true">更换激活码</button>
      </div>

      <div v-else class="license-input-area">
        <div class="license-status">
          <span class="status-text">未激活</span>
        </div>

        <div v-if="showLicenseInput" class="form-group">
          <label class="form-label">输入激活码</label>
          <input
            v-model="licenseKey"
            type="text"
            class="form-input"
            placeholder="请输入激活码..."
            @keyup.enter="activateLicense"
          />
          <p class="form-hint">机器码：{{ machineId }}</p>
        </div>

        <div class="button-group">
          <button v-if="!showLicenseInput" class="btn btn-primary" @click="showLicenseInput = true">
            输入激活码
          </button>
          <button v-else class="btn btn-primary" :class="{ loading: isActivating }" :disabled="isActivating || !licenseKey" @click="activateLicense">
            {{ isActivating ? '激活中...' : '立即激活' }}
          </button>
          <button v-if="showLicenseInput" class="btn btn-secondary" @click="cancelActivation">取消</button>
        </div>

        <div v-if="activationResult" class="test-result" :class="activationResult.success ? 'success' : 'error'">
          <span class="result-text">{{ activationResult.message }}</span>
        </div>
      </div>
    </section>

    <section class="settings-card surface-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">Learning</p>
          <h3 class="section-title">个性化学习</h3>
        </div>
      </div>

      <div class="learning-info">
        <div class="learning-progress">
          <span class="progress-label">学习进度</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: learningProgress + '%' }"></div>
          </div>
          <span class="progress-value">{{ Math.round(learningProgress) }}%</span>
        </div>

        <p class="learning-desc" v-if="!hasEnoughData">
          继续使用回复功能，系统会逐步学习你的表达偏好。
        </p>
        <p class="learning-desc" v-else>
          已积累足够数据，系统会优先推荐更贴近你习惯的风格。
        </p>
      </div>

      <div class="style-stats" v-if="styleStats.length > 0">
        <h4 class="stats-title">风格偏好统计</h4>
        <div class="stats-list">
          <div v-for="stat in styleStats" :key="stat.style" class="style-stat-card">
            <div class="stat-info">
              <span class="stat-style">{{ getStyleLabel(stat.style) }}</span>
              <span class="stat-count">{{ stat.count }} 次</span>
            </div>
            <div class="stat-bar-container">
              <div class="stat-bar" :style="{ width: getStylePercentage(stat.style) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="learning-actions">
        <button class="btn btn-secondary" @click="resetLearning">重置学习数据</button>
      </div>
    </section>

    <section class="settings-card surface-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">Backup</p>
          <h3 class="section-title">数据同步</h3>
        </div>
      </div>

      <div class="data-stats" v-if="dataStats">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ dataStats.knowledgeBase }}</span>
            <span class="stat-label">话术</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ dataStats.replyHistory }}</span>
            <span class="stat-label">回复记录</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ dataStats.contacts }}</span>
            <span class="stat-label">联系人</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ dataStats.chatRecords }}</span>
            <span class="stat-label">聊天记录</span>
          </div>
        </div>
        <p class="data-size">当前备份体积约 {{ exportSize }}</p>
      </div>

      <div class="sync-actions">
        <button class="btn btn-secondary" @click="exportData" :disabled="isExporting">
          {{ isExporting ? '导出中...' : '导出备份' }}
        </button>
        <button class="btn btn-secondary" @click="triggerImport">
          导入恢复
        </button>
        <input
          ref="importFileRef"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImport"
        />
      </div>

      <div v-if="importResult" class="test-result" :class="importResult.success ? 'success' : 'error'">
        <span class="result-text">{{ importResult.message }}</span>
      </div>
    </section>

    <section class="about-card surface-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">About</p>
          <h3 class="section-title">产品信息</h3>
        </div>
      </div>
      <div class="about-info">
        <p class="app-name">搭言</p>
        <p class="app-version">Version 1.0.0</p>
        <p class="app-desc">桌面沟通工作台</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getAIConfig, saveAIConfig, DEFAULT_CONFIG } from '../utils/storage'
import { getTheme, saveTheme, applyTheme } from '../utils/theme'
import { StyleLearner } from '../utils/style-learning'
import { DataSync, type DataStats, type ImportResult } from '../utils/data-sync'
import { useToast } from '../composables/useToast'

const toast = useToast()

const settings = ref({
  provider: 'openai',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo'
})

const isSaving = ref(false)
const isTesting = ref(false)
const showApiKey = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)
const isDockingEnabled = ref(true)
const isAlwaysOnTop = ref(false)
const isDarkMode = ref(false)

const shortcutConfig = ref({
  toggleWindow: 'CommandOrControl+Shift+S',
  quickReply: 'CommandOrControl+Shift+R',
  quickPolish: 'CommandOrControl+Shift+P'
})

const showLicenseInput = ref(false)
const licenseKey = ref('')
const isActivating = ref(false)
const machineId = ref('')
const activationResult = ref<{ success: boolean; message: string } | null>(null)
const currentLicense = ref({
  isValid: false,
  type: 'free' as const,
  expireDate: null as string | null
})

const styleStats = computed(() => StyleLearner.getStyleStats())
const learningProgress = computed(() => StyleLearner.getLearningProgress())
const hasEnoughData = computed(() => StyleLearner.hasEnoughData())

const CUSTOM_PROMPT_KEY = 'dayan-custom-prompt'
const customPrompt = ref('')

const loadCustomPrompt = () => {
  const saved = localStorage.getItem(CUSTOM_PROMPT_KEY)
  if (saved) {
    customPrompt.value = saved
  }
}

const saveCustomPrompt = () => {
  localStorage.setItem(CUSTOM_PROMPT_KEY, customPrompt.value)
  toast.success('自定义 Prompt 已保存')
}

const dataStats = ref<DataStats | null>(null)
const exportSize = ref('计算中...')
const isExporting = ref(false)
const importResult = ref<ImportResult | null>(null)
const importFileRef = ref<HTMLInputElement | null>(null)

const syncDockStatus = async () => {
  try {
    const status = await window.electronAPI?.window?.getDockStatus?.()
    if (status) {
      isDockingEnabled.value = status.enabled
      return status
    }
  } catch (e) {
    console.warn('[Settings] 获取窗口吸附状态失败:', e)
  }
  return null
}

const loadDataStats = async () => {
  try {
    dataStats.value = await DataSync.getDataStats()
    exportSize.value = await DataSync.getExportSizeEstimate()
  } catch (e) {
    console.warn('[Settings] 加载数据统计失败:', e)
  }
}

const exportData = async () => {
  isExporting.value = true
  try {
    await DataSync.exportToFile()
    toast.success('数据备份已导出')
  } catch (e) {
    toast.error('导出失败，请重试')
    console.error('[Settings] 导出失败:', e)
  } finally {
    isExporting.value = false
  }
}

const triggerImport = () => {
  importResult.value = null
  if (importFileRef.value) {
    importFileRef.value.click()
  }
}

const handleImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!confirm('导入数据将追加到现有数据中，不会覆盖。确定要继续吗？')) {
    target.value = ''
    return
  }

  try {
    const result = await DataSync.importFromFile(file)
    importResult.value = result
    if (result.success) {
      toast.success(result.message)
      await loadDataStats()
    } else {
      toast.error(result.message)
    }
  } catch (e) {
    toast.error('导入失败，请重试')
    console.error('[Settings] 导入失败:', e)
  } finally {
    target.value = ''
  }
}

const resetPrompt = () => {
  customPrompt.value = ''
  localStorage.removeItem(CUSTOM_PROMPT_KEY)
  toast.success('已恢复默认 Prompt')
}

onMounted(async () => {
  await loadSettings()
  await loadLicenseInfo()
  await loadShortcuts()
  await syncDockStatus()
  loadCustomPrompt()
  StyleLearner.init()
  const theme = getTheme()
  isDarkMode.value = theme === 'dark'
  applyTheme(theme)
  loadDataStats()
})

const getStyleLabel = (style: string): string => {
  const styleMap: Record<string, string> = {
    friendly: '友好',
    formal: '正式',
    humorous: '幽默',
    concise: '简洁',
    empathetic: '共情',
    warm: '温暖'
  }
  return styleMap[style] || style
}

const getStylePercentage = (style: string): number => {
  return StyleLearner.getStylePercentage(style)
}

const resetLearning = () => {
  if (!confirm('确定要重置所有学习数据吗？这将清除您的风格偏好记录。')) {
    return
  }
  StyleLearner.reset()
  toast.success('学习数据已重置')
}

const loadShortcuts = async () => {
  try {
    const config = await window.electronAPI?.shortcuts?.getConfig()
    if (config) {
      shortcutConfig.value = { ...shortcutConfig.value, ...config }
    }
    console.log('[Settings] ✅ 快捷键配置已加载')
  } catch (e) {
    console.error('[Settings] 加载快捷键配置失败:', e)
  }
}

const captureShortcut = (event: KeyboardEvent, key: string) => {
  event.preventDefault()

  const keys: string[] = []
  if (event.ctrlKey || event.metaKey) keys.push('CommandOrControl')
  if (event.shiftKey) keys.push('Shift')
  if (event.altKey) keys.push('Alt')

  const keyMap: Record<string, string> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ' ': 'Space',
    Escape: 'Esc'
  }

  let keyValue = event.key
  if (keyMap[keyValue]) {
    keyValue = keyMap[keyValue]
  } else if (keyValue.length === 1) {
    keyValue = keyValue.toUpperCase()
  }

  if (!['Control', 'Shift', 'Alt', 'Meta', 'CommandOrControl'].includes(keyValue)) {
    keys.push(keyValue)
  }

  shortcutConfig.value[key as keyof typeof shortcutConfig.value] = keys.join('+')
}

const saveShortcuts = async () => {
  try {
    await window.electronAPI?.shortcuts?.setConfig(shortcutConfig.value)
    toast.success('快捷键配置已保存！')
    console.log('[Settings] ✅ 快捷键配置已保存')
  } catch (e) {
    console.error('[Settings] 保存快捷键配置失败:', e)
    toast.error('保存失败')
  }
}

const resetShortcuts = async () => {
  try {
    const config = await window.electronAPI?.shortcuts?.reset()
    if (config) {
      shortcutConfig.value = { ...config }
    }
    toast.success('快捷键已重置为默认！')
    console.log('[Settings] ✅ 快捷键已重置')
  } catch (e) {
    console.error('[Settings] 重置快捷键失败:', e)
    toast.error('重置失败')
  }
}

const loadSettings = async () => {
  console.log('[Settings] 📂 从本地存储加载配置...')
  const saved = getAIConfig()
  settings.value = { ...settings.value, ...saved }
  console.log('[Settings] ✅ 配置加载完成')
}

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  saveTheme(isDarkMode.value ? 'dark' : 'light')
  applyTheme(isDarkMode.value ? 'dark' : 'light')
}

const saveSettings = async () => {
  isSaving.value = true
  testResult.value = null

  try {
    saveAIConfig(settings.value)
    saveCustomPrompt()

    testResult.value = {
      success: true,
      message: '配置已保存！'
    }
    console.log('[Settings] ✅ 配置已保存到本地存储')

    setTimeout(() => {
      testResult.value = null
    }, 3000)
  } catch (e) {
    testResult.value = {
      success: false,
      message: '保存失败: ' + (e as Error).message
    }
    console.error('[Settings] ❌ 保存失败:', e)
  } finally {
    isSaving.value = false
  }
}

const testConnection = async () => {
  isTesting.value = true
  testResult.value = null

  try {
    saveAIConfig(settings.value)

    await window.electronAPI?.ai?.setConfig?.({
      provider: settings.value.provider,
      apiKey: settings.value.apiKey,
      baseUrl: settings.value.baseUrl,
      model: settings.value.model
    })

    const result = await window.electronAPI?.ai?.testConnection?.()

    if (result?.success) {
      testResult.value = {
        success: true,
        message: `连接成功！模型: ${settings.value.model}`
      }
    } else {
      testResult.value = {
        success: false,
        message: result?.error || '连接失败，请检查配置'
      }
    }
  } catch (e) {
    testResult.value = {
      success: false,
      message: '测试失败: ' + (e as Error).message
    }
    console.error('[Settings] ❌ 测试连接失败:', e)
  } finally {
    isTesting.value = false
  }
}

const toggleDocking = async () => {
  try {
    const result = await window.electronAPI?.window?.toggleDock?.()
    isDockingEnabled.value = result
    console.log('[Settings] 窗口吸附:', result ? '已开启' : '已关闭')

    const status = await syncDockStatus()
    if (!result) {
      toast.success('窗口吸附已关闭')
    } else if (status?.wechatFound) {
      toast.success('窗口吸附已开启，请将窗口靠近微信或直接观察是否已贴边')
    } else {
      toast.error('未检测到微信窗口，或当前没有辅助功能权限')
    }
  } catch (e) {
    console.error('[Settings] 切换吸附状态失败:', e)
    toast.error('切换窗口吸附失败')
  }
}

const toggleAlwaysOnTop = async () => {
  try {
    isAlwaysOnTop.value = !isAlwaysOnTop.value
    await window.electronAPI?.window?.setAlwaysOnTop?.(isAlwaysOnTop.value)
    console.log('[Settings] 窗口置顶:', isAlwaysOnTop.value ? '已开启' : '已关闭')
  } catch (e) {
    console.error('[Settings] 切换置顶状态失败:', e)
    isAlwaysOnTop.value = !isAlwaysOnTop.value
  }
}

const loadLicenseInfo = async () => {
  try {
    machineId.value = await window.electronAPI?.license?.getMachineId?.() || ''
    const isActivated = await window.electronAPI?.license?.isActivated?.()
    currentLicense.value.isValid = isActivated
  } catch (e) {
    console.error('[Settings] 加载授权信息失败:', e)
  }
}

const activateLicense = async () => {
  if (!licenseKey.value.trim()) return

  isActivating.value = true
  activationResult.value = null

  try {
    const result = await window.electronAPI?.license?.verify?.(licenseKey.value.trim())
    if (result?.isValid) {
      currentLicense.value = result
      activationResult.value = {
        success: true,
        message: '激活成功！'
      }
      showLicenseInput.value = false
      licenseKey.value = ''
    } else {
      activationResult.value = {
        success: false,
        message: '激活失败，请检查激活码是否正确'
      }
    }
  } catch (e) {
    activationResult.value = {
      success: false,
      message: '激活失败: ' + (e as Error).message
    }
    console.error('[Settings] 激活失败:', e)
  } finally {
    isActivating.value = false
  }
}

const cancelActivation = () => {
  showLicenseInput.value = false
  licenseKey.value = ''
  activationResult.value = null
}

const getLicenseTypeName = (type: string) => {
  const names: Record<string, string> = {
    free: '免费版',
    pro: 'Pro 专业版',
    svip: 'SVIP 超级会员'
  }
  return names[type] || type
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const resetToDefault = () => {
  settings.value = {
    provider: DEFAULT_CONFIG.ai_provider,
    apiKey: '',
    baseUrl: DEFAULT_CONFIG.ai_base_url,
    model: DEFAULT_CONFIG.ai_model
  }
  testResult.value = null
  console.log('[Settings] 🔄 已恢复默认配置')
}
</script>

<style scoped>
.settings-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeIn 0.28s ease;
}

.settings-hero,
.settings-card,
.about-card {
  padding: var(--space-5);
}

.settings-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background:
    radial-gradient(circle at top right, rgba(47, 107, 102, 0.14), transparent 28%),
    radial-gradient(circle at bottom left, rgba(179, 138, 99, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 243, 237, 0.92) 100%);
}

.hero-kicker,
.section-kicker {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.hero-title,
.section-title {
  margin-top: 8px;
  font-size: var(--font-xl);
  line-height: 1.32;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.hero-status-item {
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.58);
}

.hero-status-label {
  display: block;
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.hero-status-value {
  display: block;
  margin-top: 6px;
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--text-primary);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.setting-row + .setting-row {
  border-top: 1px solid rgba(43, 39, 34, 0.08);
}

.setting-copy {
  min-width: 0;
}

.setting-name {
  display: block;
  font-size: var(--font-base);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.setting-desc {
  display: block;
  font-size: var(--font-sm);
  color: var(--text-secondary);
  line-height: 1.55;
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
  letter-spacing: 0.03em;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: var(--font-md);
  color: var(--text-primary);
  outline: none;
  transition: all var(--transition);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.6;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus,
.shortcut-input:focus {
  border-color: rgba(47, 107, 102, 0.32);
  box-shadow: 0 0 0 4px rgba(47, 107, 102, 0.12);
  background: rgba(255, 255, 255, 0.92);
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon .form-input {
  padding-right: 62px;
}

.icon-btn {
  position: absolute;
  right: var(--space-3);
  padding: 4px 6px;
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-secondary);
  transition: color var(--transition);
}

.icon-btn:hover {
  color: var(--text-primary);
}

.form-hint {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-2);
  line-height: 1.5;
}

.button-group {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.button-group.compact {
  margin-top: var(--space-3);
}

.btn {
  flex: 1;
}

.btn:disabled,
.btn.loading {
  opacity: 0.6;
  cursor: not-allowed;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.shortcut-card {
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.56);
}

.shortcut-name {
  display: block;
  font-size: var(--font-base);
  font-weight: 700;
  color: var(--text-primary);
}

.shortcut-desc {
  display: block;
  margin-top: 5px;
  margin-bottom: var(--space-3);
  font-size: var(--font-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.shortcut-input {
  width: 100%;
  min-height: 40px;
  padding: 0 var(--space-3);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: var(--font-sm);
  color: var(--text-primary);
  text-align: center;
  outline: none;
  transition: all var(--transition);
  font-family: 'Monaco', 'Menlo', monospace;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: rgba(43, 39, 34, 0.12);
  border-radius: var(--radius-full);
  position: relative;
  cursor: pointer;
  transition: all var(--transition);
  flex-shrink: 0;
}

.toggle-switch.active {
  background: var(--primary);
}

.toggle-knob {
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: all var(--transition);
  box-shadow: var(--shadow-sm);
}

.toggle-switch.active .toggle-knob {
  left: 22px;
}

.test-result {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
}

.test-result.success {
  background: rgba(79, 122, 93, 0.12);
  border: 1px solid rgba(79, 122, 93, 0.16);
}

.test-result.error {
  background: rgba(168, 92, 87, 0.12);
  border: 1px solid rgba(168, 92, 87, 0.16);
}

.result-text {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.learning-info {
  margin-bottom: var(--space-4);
}

.learning-progress {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.progress-label,
.progress-value {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  font-weight: 600;
}

.progress-bar {
  flex: 1;
  height: 10px;
  background: rgba(43, 39, 34, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  border-radius: var(--radius-full);
  transition: width var(--transition);
}

.learning-desc {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

.style-stats {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid rgba(43, 39, 34, 0.08);
}

.stats-title {
  font-size: var(--font-base);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.style-stat-card {
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.56);
}

.stat-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.stat-style,
.stat-count {
  font-size: var(--font-sm);
  color: var(--text-primary);
}

.stat-count {
  color: var(--text-secondary);
}

.stat-bar-container {
  width: 100%;
  height: 8px;
  background: rgba(43, 39, 34, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-top: var(--space-3);
}

.stat-bar {
  height: 100%;
  background: var(--primary-gradient);
  border-radius: var(--radius-full);
}

.learning-actions {
  display: flex;
  margin-top: var(--space-4);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.stat-item {
  text-align: center;
  padding: var(--space-3);
  background: rgba(255, 255, 255, 0.62);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.56);
}

.stat-value {
  display: block;
  font-size: var(--font-xl);
  font-weight: 700;
  color: var(--primary-dark);
}

.stat-label,
.data-size {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.data-size {
  margin-top: var(--space-3);
}

.sync-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.license-info,
.license-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.license-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: rgba(255, 255, 255, 0.64);
  border-radius: var(--radius-lg);
}

.license-status.active {
  background: rgba(79, 122, 93, 0.12);
}

.status-text {
  font-size: var(--font-base);
  font-weight: 700;
  color: var(--text-primary);
}

.license-detail {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid rgba(43, 39, 34, 0.08);
}

.detail-label,
.detail-value {
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

.detail-value {
  color: var(--text-primary);
  font-weight: 700;
}

.detail-value.pro {
  color: var(--secondary-dark);
}

.detail-value.svip {
  color: var(--primary-dark);
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.app-name {
  font-size: var(--font-xl);
  font-weight: 700;
  color: var(--text-primary);
}

.app-version,
.app-desc {
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

:global(.dark-theme) .settings-hero {
  background:
    radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 28%),
    radial-gradient(circle at bottom left, rgba(179, 138, 99, 0.1), transparent 24%),
    linear-gradient(180deg, rgba(38, 31, 26, 0.96) 0%, rgba(26, 22, 18, 0.94) 100%);
}

:global(.dark-theme) .hero-status-item,
:global(.dark-theme) .shortcut-card,
:global(.dark-theme) .style-stat-card,
:global(.dark-theme) .stat-item,
:global(.dark-theme) .license-status,
:global(.dark-theme) .form-input,
:global(.dark-theme) .form-select,
:global(.dark-theme) .form-textarea,
:global(.dark-theme) .shortcut-input {
  background: rgba(255, 255, 255, 0.04);
}

:global(.dark-theme) .toggle-switch {
  background: rgba(255, 255, 255, 0.14);
}

:global(html.dark-theme) .settings-hero {
  background: var(--surface-main) !important;
  border-color: var(--border-color) !important;
}

:global(html.dark-theme) .settings-card,
:global(html.dark-theme) .about-card {
  background: var(--surface-main) !important;
  border-color: var(--border-color) !important;
}

:global(html.dark-theme) .hero-status-item,
:global(html.dark-theme) .shortcut-card,
:global(html.dark-theme) .style-stat-card,
:global(html.dark-theme) .stat-item,
:global(html.dark-theme) .license-status {
  background: rgba(16, 12, 9, 0.72) !important;
  border-color: rgba(255, 237, 213, 0.1) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

:global(html.dark-theme) .form-input,
:global(html.dark-theme) .form-select,
:global(html.dark-theme) .form-textarea,
:global(html.dark-theme) .shortcut-input {
  background: rgba(10, 8, 6, 0.7) !important;
  border-color: rgba(255, 237, 213, 0.12) !important;
  color: var(--text-primary) !important;
}

:global(html.dark-theme) .form-input:focus,
:global(html.dark-theme) .form-select:focus,
:global(html.dark-theme) .form-textarea:focus,
:global(html.dark-theme) .shortcut-input:focus {
  background: rgba(12, 10, 8, 0.88) !important;
  border-color: rgba(45, 212, 191, 0.34);
  box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.12);
}

:global(html.dark-theme) .setting-row + .setting-row,
:global(html.dark-theme) .style-stats,
:global(html.dark-theme) .license-detail {
  border-color: rgba(255, 255, 255, 0.08);
}

:global(html.dark-theme) .progress-bar,
:global(html.dark-theme) .stat-bar-container {
  background: rgba(255, 255, 255, 0.08);
}

:global(html.dark-theme) .hero-title,
:global(html.dark-theme) .section-title,
:global(html.dark-theme) .setting-name,
:global(html.dark-theme) .shortcut-name,
:global(html.dark-theme) .hero-status-value,
:global(html.dark-theme) .stat-value,
:global(html.dark-theme) .app-name,
:global(html.dark-theme) .status-text,
:global(html.dark-theme) .detail-value,
:global(html.dark-theme) .result-text,
:global(html.dark-theme) .stat-style {
  color: var(--text-primary);
}

:global(html.dark-theme) .section-kicker,
:global(html.dark-theme) .hero-kicker,
:global(html.dark-theme) .hero-status-label,
:global(html.dark-theme) .form-hint,
:global(html.dark-theme) .data-size,
:global(html.dark-theme) .stat-label {
  color: var(--text-tertiary);
}

:global(html.dark-theme) .setting-desc,
:global(html.dark-theme) .shortcut-desc,
:global(html.dark-theme) .form-label,
:global(html.dark-theme) .learning-desc,
:global(html.dark-theme) .progress-label,
:global(html.dark-theme) .progress-value,
:global(html.dark-theme) .detail-label,
:global(html.dark-theme) .app-version,
:global(html.dark-theme) .app-desc,
:global(html.dark-theme) .stat-count {
  color: var(--text-secondary);
}

:global(.dark-theme) .hero-status-item,
:global(.dark-theme) .shortcut-card,
:global(.dark-theme) .style-stat-card,
:global(.dark-theme) .stat-item,
:global(.dark-theme) .license-status {
  background: rgba(16, 12, 9, 0.72) !important;
  border-color: rgba(255, 237, 213, 0.1) !important;
}

:global(.dark-theme) .form-input,
:global(.dark-theme) .form-select,
:global(.dark-theme) .form-textarea,
:global(.dark-theme) .shortcut-input {
  background: rgba(10, 8, 6, 0.7) !important;
  border-color: rgba(255, 237, 213, 0.12) !important;
  color: var(--text-primary) !important;
}
</style>

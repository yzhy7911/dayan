<template>
  <div class="settings-page">
    <!-- 外观设置区域 -->
    <div class="section">
      <h3 class="section-title">🎨 外观设置</h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">暗色模式</span>
          <span class="setting-desc">切换深色/浅色主题</span>
        </div>
        <div class="toggle-switch" :class="{ active: isDarkMode }" @click="toggleDarkMode">
          <div class="toggle-knob"></div>
        </div>
      </div>
    </div>

    <!-- 快捷键设置区域 -->
    <div class="section">
      <h3 class="section-title">⌨️ 快捷键设置</h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">显示/隐藏窗口</span>
          <span class="setting-desc">快速显示或隐藏搭言窗口</span>
        </div>
        <div class="shortcut-input-wrapper">
          <input
            v-model="shortcutConfig.toggleWindow"
            class="shortcut-input"
            placeholder="Ctrl+Shift+S"
            @keydown="captureShortcut($event, 'toggleWindow')"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">快速回复</span>
          <span class="setting-desc">直接跳转到回复页面</span>
        </div>
        <div class="shortcut-input-wrapper">
          <input
            v-model="shortcutConfig.quickReply"
            class="shortcut-input"
            placeholder="Ctrl+Shift+R"
            @keydown="captureShortcut($event, 'quickReply')"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">快速润色</span>
          <span class="setting-desc">直接跳转到润色页面</span>
        </div>
        <div class="shortcut-input-wrapper">
          <input
            v-model="shortcutConfig.quickPolish"
            class="shortcut-input"
            placeholder="Ctrl+Shift+P"
            @keydown="captureShortcut($event, 'quickPolish')"
          />
        </div>
      </div>

      <div class="button-group" style="margin-top: 16px;">
        <button class="btn btn-secondary" @click="resetShortcuts">
          重置快捷键
        </button>
        <button class="btn btn-primary" @click="saveShortcuts">
          保存快捷键
        </button>
      </div>
    </div>

    <!-- 窗口设置区域 -->
    <div class="section">
      <h3 class="section-title">🪟 窗口设置</h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">吸附到微信窗口</span>
          <span class="setting-desc">自动跟随微信窗口移动和调整大小</span>
        </div>
        <div class="toggle-switch" :class="{ active: isDockingEnabled }" @click="toggleDocking">
          <div class="toggle-knob"></div>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">窗口置顶</span>
          <span class="setting-desc">保持搭言窗口在最上层</span>
        </div>
        <div class="toggle-switch" :class="{ active: isAlwaysOnTop }" @click="toggleAlwaysOnTop">
          <div class="toggle-knob"></div>
        </div>
      </div>
    </div>

    <!-- AI 配置区域 -->
    <div class="section">
      <h3 class="section-title">🤖 AI 模型配置</h3>

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
            {{ showApiKey ? '🙈' : '👁️' }}
          </button>
        </div>
        <p class="form-hint">你的密钥仅保存在本地，不会上传到任何服务器</p>
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
          placeholder="gpt-3.5-turbo"
        />
      </div>

      <div class="button-group">
        <button class="btn btn-secondary" @click="resetToDefault">
          恢复默认
        </button>
        <button
          class="btn btn-primary"
          :class="{ loading: isTesting }"
          :disabled="isTesting || !settings.apiKey"
          @click="testConnection"
        >
          {{ isTesting ? '测试中...' : '测试连接' }}
        </button>
        <button
          class="btn btn-success"
          :class="{ loading: isSaving }"
          :disabled="isSaving"
          @click="saveSettings"
        >
          {{ isSaving ? '保存中...' : '保存配置' }}
        </button>
      </div>

      <!-- 测试结果 -->
      <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
        <span class="result-icon">{{ testResult.success ? '✅' : '❌' }}</span>
        <span class="result-text">{{ testResult.message }}</span>
      </div>
    </div>

    <!-- 自定义 Prompt -->
    <div class="section">
      <h3 class="section-title">⚙️ 自定义 Prompt</h3>

      <div class="form-group">
        <label class="form-label">自定义回复 Prompt</label>
        <textarea
          v-model="customPrompt"
          class="form-textarea"
          rows="4"
          placeholder="在这里输入自定义的系统 prompt，用于 AI 生成回复..."
        ></textarea>
        <p class="form-hint">留空则使用默认的 prompt，自定义 prompt 将覆盖默认配置</p>
      </div>

      <div class="button-group">
        <button class="btn-secondary" @click="resetPrompt">
          恢复默认
        </button>
      </div>
    </div>

    <!-- 激活码区域 -->
    <div class="section">
      <h3 class="section-title">🔑 激活码</h3>

      <div v-if="currentLicense.isValid" class="license-info">
        <div class="license-status active">
          <span class="status-icon">✅</span>
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
          <span class="status-icon">⚪</span>
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
          <p class="form-hint">机器码: {{ machineId }}</p>
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
          <span class="result-icon">{{ activationResult.success ? '✅' : '❌' }}</span>
          <span class="result-text">{{ activationResult.message }}</span>
        </div>
      </div>
    </div>

    <!-- 个性化学习 -->
    <div class="section">
      <h3 class="section-title">🧠 个性化学习</h3>

      <div class="learning-info">
        <div class="learning-progress">
          <span class="progress-label">学习进度</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: learningProgress + '%' }"></div>
          </div>
          <span class="progress-value">{{ Math.round(learningProgress) }}%</span>
        </div>

        <p class="learning-desc" v-if="!hasEnoughData">
          继续使用AI回复功能，系统将学习您的风格偏好（约需10次使用）
        </p>
        <p class="learning-desc" v-else>
          🎉 已掌握您的偏好！系统会根据您的使用习惯推荐回复风格
        </p>
      </div>

      <div class="style-stats" v-if="styleStats.length > 0">
        <h4 class="stats-title">风格偏好统计</h4>
        <div class="stats-list">
          <div v-for="stat in styleStats" :key="stat.style" class="stat-item">
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
        <button class="btn-secondary" @click="resetLearning">
          重置学习数据
        </button>
      </div>
    </div>

    <!-- 关于 -->
    <div class="section">
      <h3 class="section-title">ℹ️ 关于</h3>
      <div class="about-info">
        <p class="app-name">搭言</p>
        <p class="app-version">版本 1.0.0</p>
        <p class="app-desc">懂你的智能聊天助手</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getAIConfig, saveAIConfig, DEFAULT_CONFIG } from '../utils/storage'
import { getTheme, saveTheme, applyTheme } from '../utils/theme'
import { StyleLearner } from '../utils/style-learning'
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

// 快捷键配置
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

// 个性化学习相关
const styleStats = computed(() => StyleLearner.getStyleStats())
const learningProgress = computed(() => StyleLearner.getLearningProgress())
const hasEnoughData = computed(() => StyleLearner.hasEnoughData())

// 自定义 Prompt 相关
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

const resetPrompt = () => {
  customPrompt.value = ''
  localStorage.removeItem(CUSTOM_PROMPT_KEY)
  toast.success('已恢复默认 Prompt')
}

onMounted(async () => {
  await loadSettings()
  await loadLicenseInfo()
  await loadShortcuts()
  loadCustomPrompt()
  StyleLearner.init()
  const theme = getTheme()
  isDarkMode.value = theme === 'dark'
  applyTheme(theme)
})

// 个性化学习相关函数
const getStyleLabel = (style: string): string => {
  const styleMap: Record<string, string> = {
    friendly: '💬 友好',
    formal: '💼 正式',
    humorous: '😄 幽默',
    concise: '⚡ 简洁',
    empathetic: '💝 共情',
    warm: '🔥 温暖',
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

// 快捷键相关函数
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

  // 获取实际按键
  const keyMap: Record<string, string> = {
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    ' ': 'Space',
    'Escape': 'Esc'
  }

  let keyValue = event.key
  if (keyMap[keyValue]) {
    keyValue = keyMap[keyValue]
  } else if (keyValue.length === 1) {
    keyValue = keyValue.toUpperCase()
  }

  // 避免只添加修饰键
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

    // 3 秒后自动隐藏提示
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
    // 先保存当前配置
    saveAIConfig(settings.value)

    // 更新主进程的 AI 配置
    await window.electronAPI?.ai?.setConfig?.({
      provider: settings.value.provider,
      apiKey: settings.value.apiKey,
      baseUrl: settings.value.baseUrl,
      model: settings.value.model
    })

    // 调用主进程测试连接
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
  } catch (e) {
    console.error('[Settings] 切换吸附状态失败:', e)
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
  padding: var(--space-4);
  background: var(--bg-secondary);
  transition: background var(--transition);
}

.section {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.section-title {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  font-size: var(--font-base);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-md);
  color: var(--text-primary);
  outline: none;
  transition: all var(--transition);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  line-height: 1.6;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon .form-input {
  padding-right: 40px;
}

.icon-btn {
  position: absolute;
  right: var(--space-2);
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
  transition: opacity var(--transition);
}

.icon-btn:hover {
  opacity: 1;
}

.form-hint {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

.button-group {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.btn {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-base);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.loading {
  opacity: 0.7;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--info);
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-success {
  background: var(--primary-gradient);
  color: white;
}

.btn-success:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.test-result {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.test-result.success {
  background: var(--success-bg);
  border: 1px solid var(--primary-bg);
}

.test-result.error {
  background: var(--error-bg);
  border: 1px solid #fecaca;
}

.result-icon {
  font-size: var(--font-lg);
}

.result-text {
  font-size: var(--font-base);
  color: var(--text-primary);
}

.shortcut-input-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.shortcut-input {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  color: var(--text-primary);
  text-align: center;
  min-width: 160px;
  outline: none;
  transition: all var(--transition);
  font-family: 'Monaco', 'Menlo', monospace;
}

.shortcut-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
  background: var(--bg-primary);
}

.learning-info {
  margin-bottom: var(--space-4);
}

.learning-progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.progress-label {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  border-radius: var(--radius-full);
  transition: width var(--transition);
}

.progress-value {
  font-size: var(--font-sm);
  color: var(--text-primary);
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.learning-desc {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.style-stats {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-light);
}

.stats-title {
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stat-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-style {
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.stat-count {
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

.stat-bar-container {
  width: 100%;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.stat-bar {
  height: 100%;
  background: var(--primary-gradient);
  border-radius: var(--radius-full);
  transition: width var(--transition);
}

.learning-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.btn-secondary {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-secondary:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.about-info {
  text-align: center;
  padding: var(--space-5) 0;
}

.app-name {
  font-size: var(--font-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.app-version {
  font-size: var(--font-base);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.app-desc {
  font-size: var(--font-base);
  color: var(--text-tertiary);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-light);
  transition: all var(--transition);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-name {
  display: block;
  font-size: var(--font-md);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.setting-desc {
  display: block;
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: var(--border-color);
  border-radius: var(--radius-full);
  position: relative;
  cursor: pointer;
  transition: all var(--transition);
}

.toggle-switch.active {
  background: var(--primary);
}

.toggle-knob {
  width: 20px;
  height: 20px;
  background: white;
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

.license-info,
.license-input-area {
  padding: var(--space-2) 0;
}

.license-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  transition: all var(--transition);
}

.license-status.active {
  background: var(--success-bg);
}

.status-icon {
  font-size: var(--font-xl);
}

.status-text {
  font-size: var(--font-md);
  font-weight: 500;
  color: var(--text-primary);
}

.license-detail {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-light);
  transition: all var(--transition);
}

.license-detail:last-of-type {
  border-bottom: none;
  margin-bottom: var(--space-4);
}

.detail-label {
  font-size: var(--font-base);
  color: var(--text-secondary);
}

.detail-value {
  font-size: var(--font-base);
  font-weight: 500;
  color: var(--text-primary);
}

.detail-value.pro {
  color: var(--warning);
}

.detail-value.svip {
  color: var(--secondary);
}
</style>

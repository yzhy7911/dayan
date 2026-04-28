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
import { ref, onMounted } from 'vue'
import { getAIConfig, saveAIConfig, DEFAULT_CONFIG } from '../utils/storage'
import { getTheme, saveTheme, applyTheme } from '../utils/theme'

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

onMounted(async () => {
  await loadSettings()
  await loadLicenseInfo()
  const theme = getTheme()
  isDarkMode.value = theme === 'dark'
  applyTheme(theme)
})

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
.form-select {
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

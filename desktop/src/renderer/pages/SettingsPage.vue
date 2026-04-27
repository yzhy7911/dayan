<template>
  <div class="settings-page">
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

    <!-- 关于 -->
    <div class="section">
      <h3 class="section-title">ℹ️ 关于</h3>
      <div class="about-info">
        <p class="app-name">嗒言</p>
        <p class="app-version">版本 1.0.0</p>
        <p class="app-desc">懂你的智能聊天助手</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAIConfig, saveAIConfig, DEFAULT_CONFIG } from '../utils/storage'

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

onMounted(async () => {
  await loadSettings()
})

const loadSettings = async () => {
  console.log('[Settings] 📂 从本地存储加载配置...')
  const saved = getAIConfig()
  settings.value = { ...settings.value, ...saved }
  console.log('[Settings] ✅ 配置加载完成')
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
  padding: 16px;
  background: #f9fafb;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
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
  right: 10px;
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.icon-btn:hover {
  opacity: 1;
}

.form-hint {
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.loading {
  opacity: 0.7;
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.test-result {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-result.success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.test-result.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.result-icon {
  font-size: 16px;
}

.result-text {
  font-size: 13px;
  color: #374151;
}

.about-info {
  text-align: center;
  padding: 20px 0;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.app-version {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.app-desc {
  font-size: 13px;
  color: #9ca3af;
}
</style>

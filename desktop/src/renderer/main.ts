import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { getAIConfig } from './utils/storage'
import './styles/theme.css'
import './styles/global.css'

console.log('[Main] 🚀 正在初始化 Vue 应用...')

async function bootstrap() {
  try {
    // 先挂载 Vue 应用，让界面尽快显示
    const app = createApp(App)
    const pinia = createPinia()

    app.use(pinia)
    app.use(router)

    // 路由就绪后再挂载
    await router.isReady()
    app.mount('#app')
    console.log('[Main] ✅ Vue 应用已挂载')

    // 隐藏加载指示器
    const spinner = document.getElementById('loading-spinner')
    if (spinner) {
      spinner.style.display = 'none'
    }

    // 异步同步 AI 配置到主进程（不阻塞界面显示）
    const aiConfig = getAIConfig()
    if (aiConfig.apiKey) {
      window.electronAPI?.ai?.initConfig?.({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model
      }).then(() => {
        console.log('[Main] ✅ AI 配置已同步到主进程')
      }).catch((e: Error) => {
        console.warn('[Main] ⚠️ AI 配置同步失败:', e)
      })
    }

  } catch (e) {
    console.error('[Main] ❌ Vue 初始化失败:', e)
  }
}

bootstrap()

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { initDatabase, getAIConfig } from './utils/storage'
import './styles/global.css'

console.log('[Main] 🚀 正在初始化 Vue 应用...')

async function bootstrap() {
  try {
    // 初始化数据库
    await initDatabase()
    console.log('[Main] ✅ 数据库初始化完成')

    // 同步 AI 配置到主进程
    const aiConfig = getAIConfig()
    if (aiConfig.apiKey) {
      await window.electronAPI?.ai?.initConfig?.({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model
      })
      console.log('[Main] ✅ AI 配置已同步到主进程')
    }

    const app = createApp(App)
    const pinia = createPinia()

    app.use(pinia)
    app.use(router)

    // 路由就绪后再挂载
    await router.isReady()
    app.mount('#app')
    console.log('[Main] ✅ Vue 应用初始化完成！')

    // 隐藏加载指示器
    const spinner = document.getElementById('loading-spinner')
    if (spinner) {
      spinner.style.display = 'none'
    }

  } catch (e) {
    console.error('[Main] ❌ Vue 初始化失败:', e)
  }
}

bootstrap()

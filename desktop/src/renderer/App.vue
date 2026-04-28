<template>
  <div class="app-container">
    <TitleBar />
    <div class="main-content">
      <router-view />
    </div>
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import TabBar from './components/TabBar.vue'
import { getTheme, applyTheme } from './utils/theme'

onMounted(() => {
  console.log('[App] ✅ App 组件已挂载')
  const theme = getTheme()
  applyTheme(theme)
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  transition: background var(--transition);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: 40px;
  padding-bottom: 60px;
  min-height: 0;
}
</style>

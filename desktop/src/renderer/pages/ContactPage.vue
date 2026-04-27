<template>
  <div class="contact-page">
    <div class="svip-banner">
      <div class="banner-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
      </div>
      <div class="banner-content">
        <h3 class="banner-title">联系人画像</h3>
        <p class="banner-desc">深度分析聊天记录，建立联系人专属档案</p>
      </div>
      <button class="upgrade-btn">升级 SVIP</button>
    </div>

    <div class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <h3 class="empty-title">暂无联系人分析</h3>
      <p class="empty-desc">导入聊天记录，AI自动分析对方性格和沟通习惯</p>
      <button class="import-btn">导入聊天记录</button>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.contact-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.svip-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.banner-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--svip-start) 0%, var(--svip-end) 100%);
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
  color: var(--text-primary);
  margin-bottom: 2px;
}

.banner-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.upgrade-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--svip-start) 0%, var(--svip-end) 100%);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  max-width: 240px;
}

.import-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
}
</style>

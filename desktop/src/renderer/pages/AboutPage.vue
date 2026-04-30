<template>
  <div class="about-page">
    <section class="about-hero surface-panel">
      <p class="hero-kicker">ABOUT</p>
      <h1 class="hero-title">关于搭言</h1>
      <p class="hero-version">版本信息：v{{ appVersion }}</p>
    </section>

    <section class="about-card surface-panel">
      <p>本桌面 AI 聊天伴侣永久免费使用、无广告、无套路、不阉割基础功能。</p>
      <p>软件由个人业余独立开发、自费维护更新，持续优化体验与新功能迭代。</p>
      <p>如果你觉得这款软件对你有帮助、用得喜欢，可以下方扫码自愿随缘小额打赏，仅作为对开发者的创作鼓励。</p>
      <p class="notice-title">郑重说明：</p>
      <p>所有打赏完全自愿，不标价、不强制、不解锁任何功能，不属于商品交易与经营性付费，纯粹是善意支持。</p>
      <p>感谢每一位愿意认可与鼓励我的朋友！</p>
    </section>

    <section class="qrcode-grid">
      <article class="qrcode-card surface-panel">
        <h3 class="qrcode-title">支付宝</h3>
        <img class="qrcode-image" :src="alipayImage" alt="支付宝收款码">
      </article>
      <article class="qrcode-card surface-panel">
        <h3 class="qrcode-title">微信支付</h3>
        <img class="qrcode-image" :src="wechatImage" alt="微信收款码">
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import alipayImage from '../assets/alipay.jpg'
import wechatImage from '../assets/wechat.jpg'

const appVersion = ref('1.0.0')

onMounted(async () => {
  try {
    const version = await window.electronAPI?.app?.getVersion?.()
    if (version) appVersion.value = version
  } catch (error) {
    console.warn('[About] 读取版本号失败:', error)
  }
})
</script>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeIn 0.28s ease;
}

.about-hero,
.about-card,
.qrcode-card {
  padding: var(--space-5);
}

.hero-kicker {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0;
}

.hero-title {
  margin: 0;
  font-size: var(--font-2xl);
  color: var(--text-primary);
}

.hero-version {
  margin: 10px 0 0;
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

.about-card p {
  margin: 0 0 12px;
  font-size: var(--font-md);
  line-height: 1.75;
  color: var(--text-secondary);
}

.about-card p:last-child {
  margin-bottom: 0;
}

.notice-title {
  margin-top: 4px;
  font-weight: 700;
  color: var(--text-primary) !important;
}

.qrcode-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.qrcode-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.qrcode-title {
  margin: 0;
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.qrcode-image {
  width: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  background: #fff;
}

@media (max-width: 760px) {
  .qrcode-grid {
    grid-template-columns: 1fr;
  }
}
</style>

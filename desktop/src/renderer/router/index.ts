import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/reply'
  },
  {
    path: '/reply',
    name: 'Reply',
    component: () => import('../pages/ReplyPage.vue')
  },
  {
    path: '/coach',
    name: 'Coach',
    component: () => import('../pages/CoachPage.vue')
  },
  {
    path: '/polish',
    name: 'Polish',
    component: () => import('../pages/PolishPage.vue')
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('../pages/ContactPage.vue')
  },
  {
    path: '/knowledge',
    name: 'Knowledge',
    component: () => import('../pages/KnowledgePage.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../pages/SettingsPage.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../pages/AboutPage.vue')
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../pages/HistoryPage.vue')
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

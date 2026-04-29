import { ref, createApp, type App, type Component } from 'vue'
import Toast from '../components/Toast.vue'

interface ToastInstance {
  success(message: string): void
  error(message: string): void
  info(message: string): void
  warning(message: string): void
  loading(message?: string): number
  remove(id: number): void
}

const toasts = ref<Array<{ id: number; type: string; message: string }>>([])
let idCounter = 0
let toastApp: App | null = null

function getOrCreateToastApp() {
  if (toastApp) return toastApp

  const container = document.createElement('div')
  container.id = 'toast-container'
  document.body.appendChild(container)

  toastApp = createApp(Toast as Component, {
    toasts: toasts.value
  })
  toastApp.mount(container)
  return toastApp
}

export function useToast(): ToastInstance {
  getOrCreateToastApp()

  function show(message: string, type: string = 'info', duration: number = 3000): number {
    const id = ++idCounter
    toasts.value.push({ id, type, message })

    if (type !== 'loading' && duration > 0) {
      setTimeout(() => remove(id), duration)
    }

    return id
  }

  function remove(id: number) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error', 4000),
    info: (message: string) => show(message, 'info'),
    warning: (message: string) => show(message, 'warning', 4000),
    loading: (message: string = '加载中...') => show(message, 'loading', 0),
    remove
  }
}

export { toasts }

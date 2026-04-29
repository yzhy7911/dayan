import { ref, onMounted, onUnmounted } from 'vue'

export function useDragScroll() {
  const containerRef = ref<HTMLElement | null>(null)
  const isDragging = ref(false)
  let startY = 0
  let scrollTop = 0

  const handleMouseDown = (e: MouseEvent) => {
    if (!containerRef.value) return
    
    const target = e.target as HTMLElement
    const isInput = target.closest('input, textarea, button, [role="button"]')
    if (isInput) return

    isDragging.value = true
    startY = e.clientY
    scrollTop = containerRef.value.scrollTop
    containerRef.value.classList.add('dragging')
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value || !containerRef.value) return
    const deltaY = e.clientY - startY
    containerRef.value.scrollTop = scrollTop - deltaY
  }

  const handleMouseUp = () => {
    if (!containerRef.value) return
    isDragging.value = false
    containerRef.value.classList.remove('dragging')
  }

  onMounted(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  })

  return {
    containerRef,
    isDragging,
    handleMouseDown
  }
}
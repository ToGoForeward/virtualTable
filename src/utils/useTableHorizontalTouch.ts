import { onMounted, onUnmounted, type Ref } from 'vue'

const HORIZONTAL_THRESHOLD = 6

/**
 * scroll.x 时横向滚动在 .ant-table-body 上；表头通过 ant-table 同步 scrollLeft。
 * 移动端在表头/表身区域横滑时，显式驱动 body.scrollLeft，保证表头表身都能横滑且 fixed 列正常。
 */
export function useTableHorizontalTouch(containerRef: Ref<HTMLElement | null>) {
  let bodyEl: HTMLElement | null = null
  let headerEl: HTMLElement | null = null

  let startX = 0
  let startY = 0
  let startScrollLeft = 0
  let active = false
  let horizontal = false

  const reset = () => {
    active = false
    horizontal = false
  }

  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (!bodyEl || !touch) {
      return
    }
    startX = touch.clientX
    startY = touch.clientY
    startScrollLeft = bodyEl.scrollLeft
    active = true
    horizontal = false
  }

  const onTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (!active || !bodyEl || !touch) {
      return
    }

    const x = touch.clientX
    const y = touch.clientY
    const dx = x - startX
    const dy = y - startY

    if (!horizontal) {
      if (Math.abs(dx) < HORIZONTAL_THRESHOLD && Math.abs(dy) < HORIZONTAL_THRESHOLD) {
        return
      }
      if (Math.abs(dx) <= Math.abs(dy)) {
        reset()
        return
      }
      horizontal = true
    }

    bodyEl.scrollLeft = startScrollLeft - dx
    e.preventDefault()
  }

  const bind = () => {
    const root = containerRef.value
    if (!root) {
      return false
    }

    bodyEl = root.querySelector<HTMLElement>('.ant-table-body')
    headerEl = root.querySelector<HTMLElement>('.ant-table-header')
    if (!bodyEl) {
      return false
    }

    const targets = [bodyEl, headerEl].filter(Boolean) as HTMLElement[]
    for (const el of targets) {
      el.addEventListener('touchstart', onTouchStart, { passive: true })
      el.addEventListener('touchmove', onTouchMove, { passive: false })
      el.addEventListener('touchend', reset)
      el.addEventListener('touchcancel', reset)
    }

    return true
  }

  const unbind = () => {
    if (!bodyEl && !headerEl) {
      return
    }

    const targets = [bodyEl, headerEl].filter(Boolean) as HTMLElement[]
    for (const el of targets) {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', reset)
      el.removeEventListener('touchcancel', reset)
    }

    bodyEl = null
    headerEl = null
    reset()
  }

  const refresh = () => {
    unbind()
    requestAnimationFrame(() => {
      if (!bind()) {
        window.setTimeout(bind, 80)
        window.setTimeout(bind, 200)
      }
    })
  }

  onMounted(() => {
    refresh()
  })

  onUnmounted(unbind)

  return { refresh }
}

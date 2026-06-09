import { onMounted, onUnmounted, watch, type Ref } from 'vue'

const HORIZONTAL_THRESHOLD = 6
const MOMENTUM_FRICTION = 0.92
const MOMENTUM_MIN_VELOCITY = 0.35

const BODY_FIXED_CELL_SELECTOR =
  '.ant-table-tbody tr:not(.virtual-table-spacer):not(.ant-table-measure-row) .ant-table-cell-fix-left'

const HEADER_FIXED_CELL_SELECTOR = '.ant-table-thead .ant-table-cell-fix-left'

/**
 * 横向滚动在外层容器：
 * - 表头：CSS sticky + 按 columns fixed:left 设置 left
 * - 表身 fixed 列：外层横滑时用 transform 补偿（tbody 在纵向滚动容器内 sticky 无效）
 * - 表身横滑：触摸驱动外层 + 松手惯性
 */
export function useOuterHorizontalScroll(
  containerRef: Ref<HTMLElement | null>,
  options: {
    outerSelector?: string
    /** 左侧固定列 left 偏移，由 getFixedLeftColumns(columns) 得出 */
    fixedLeftOffsets?: Ref<number[]>
  } = {},
) {
  const { outerSelector = '.table-horizontal-scroll', fixedLeftOffsets } = options

  let outerEl: HTMLElement | null = null
  let bodyEl: HTMLElement | null = null
  let bodyFixedCells: HTMLElement[] = []
  let lastBodyFixedTransform = ''

  let startX = 0
  let startY = 0
  let startScrollLeft = 0
  let active = false
  let horizontal = false
  let lastMoveX = 0
  let lastMoveTime = 0
  let velocity = 0
  let momentumRaf = 0

  const getConfiguredOffsets = () => fixedLeftOffsets?.value ?? []

  const queryBodyFixedCells = () => {
    const offsets = getConfiguredOffsets()
    const root = containerRef.value
    if (!root || offsets.length === 0) {
      bodyFixedCells = []
      return
    }

    bodyFixedCells = Array.from(root.querySelectorAll<HTMLElement>(BODY_FIXED_CELL_SELECTOR))
    lastBodyFixedTransform = ''
  }

  const syncHeaderFixedColumns = () => {
    const offsets = getConfiguredOffsets()
    const root = containerRef.value
    if (!root || offsets.length === 0) {
      return
    }

    const headerCells = root.querySelectorAll<HTMLElement>(HEADER_FIXED_CELL_SELECTOR)
    headerCells.forEach((cell, index) => {
      const left = offsets[index]
      if (left !== undefined) {
        cell.style.left = `${left}px`
      }
    })
  }

  const clearBodyFixedTransforms = () => {
    for (const cell of bodyFixedCells) {
      cell.style.transform = ''
    }
    lastBodyFixedTransform = ''
  }

  const syncBodyFixedColumns = () => {
    if (!outerEl) {
      return
    }

    const offsets = getConfiguredOffsets()
    if (offsets.length === 0) {
      clearBodyFixedTransforms()
      bodyFixedCells = []
      return
    }

    const firstCell = bodyFixedCells[0]
    if (firstCell && !firstCell.isConnected) {
      queryBodyFixedCells()
    }

    const scrollLeft = outerEl.scrollLeft
    const transform = scrollLeft ? `translate3d(${scrollLeft}px, 0, 0)` : ''
    if (transform === lastBodyFixedTransform) {
      return
    }
    lastBodyFixedTransform = transform

    for (const cell of bodyFixedCells) {
      cell.style.transform = transform
    }
  }

  const syncFixedColumns = () => {
    queryBodyFixedCells()
    syncHeaderFixedColumns()
    syncBodyFixedColumns()
  }

  const onOuterScroll = () => syncBodyFixedColumns()

  const stopMomentum = () => {
    cancelAnimationFrame(momentumRaf)
    momentumRaf = 0
    velocity = 0
  }

  const resetDrag = () => {
    active = false
    horizontal = false
  }

  const onBodyTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (!outerEl || !touch) {
      return
    }
    stopMomentum()
    startX = touch.clientX
    startY = touch.clientY
    startScrollLeft = outerEl.scrollLeft
    lastMoveX = touch.clientX
    lastMoveTime = performance.now()
    velocity = 0
    active = true
    horizontal = false
  }

  const onBodyTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (!active || !outerEl || !touch) {
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
        resetDrag()
        return
      }
      horizontal = true
    }

    const now = performance.now()
    const dt = now - lastMoveTime
    if (dt > 0) {
      velocity = ((x - lastMoveX) / dt) * 16
    }
    lastMoveX = x
    lastMoveTime = now

    outerEl.scrollLeft = startScrollLeft - dx
    syncBodyFixedColumns()
    e.preventDefault()
  }

  const startMomentum = () => {
    if (!outerEl || Math.abs(velocity) < MOMENTUM_MIN_VELOCITY) {
      return
    }

    const maxScroll = outerEl.scrollWidth - outerEl.clientWidth
    if (maxScroll <= 0) {
      return
    }

    const step = () => {
      if (!outerEl || Math.abs(velocity) < MOMENTUM_MIN_VELOCITY) {
        stopMomentum()
        return
      }

      const next = outerEl.scrollLeft - velocity
      if (next <= 0) {
        outerEl.scrollLeft = 0
        syncBodyFixedColumns()
        stopMomentum()
        return
      }
      if (next >= maxScroll) {
        outerEl.scrollLeft = maxScroll
        syncBodyFixedColumns()
        stopMomentum()
        return
      }

      outerEl.scrollLeft = next
      syncBodyFixedColumns()
      velocity *= MOMENTUM_FRICTION
      momentumRaf = requestAnimationFrame(step)
    }

    momentumRaf = requestAnimationFrame(step)
  }

  const onBodyTouchEnd = () => {
    if (horizontal) {
      startMomentum()
    }
    resetDrag()
  }

  const bind = () => {
    const root = containerRef.value
    if (!root) {
      return false
    }

    outerEl = root.querySelector<HTMLElement>(outerSelector)
    bodyEl = root.querySelector<HTMLElement>('.ant-table-body')
    if (!outerEl || !bodyEl) {
      return false
    }

    queryBodyFixedCells()
    outerEl.addEventListener('scroll', onOuterScroll, { passive: true })

    bodyEl.addEventListener('touchstart', onBodyTouchStart, { passive: true })
    bodyEl.addEventListener('touchmove', onBodyTouchMove, { passive: false })
    bodyEl.addEventListener('touchend', onBodyTouchEnd)
    bodyEl.addEventListener('touchcancel', onBodyTouchEnd)

    syncFixedColumns()
    return true
  }

  const unbind = () => {
    stopMomentum()

    if (outerEl) {
      outerEl.removeEventListener('scroll', onOuterScroll)
    }

    if (bodyEl) {
      bodyEl.removeEventListener('touchstart', onBodyTouchStart)
      bodyEl.removeEventListener('touchmove', onBodyTouchMove)
      bodyEl.removeEventListener('touchend', onBodyTouchEnd)
      bodyEl.removeEventListener('touchcancel', onBodyTouchEnd)
    }

    clearBodyFixedTransforms()

    outerEl = null
    bodyEl = null
    bodyFixedCells = []
    resetDrag()
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

  if (fixedLeftOffsets) {
    watch(fixedLeftOffsets, () => {
      requestAnimationFrame(syncFixedColumns)
    })
  }

  onMounted(() => {
    refresh()
  })

  onUnmounted(unbind)

  return { refresh, syncFixedColumns }
}

import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type Ref,
  type ShallowRef,
} from 'vue'

function createSpacerRow(className: string) {
  const tr = document.createElement('tr')
  tr.className = className
  tr.setAttribute('aria-hidden', 'true')
  const td = document.createElement('td')
  td.colSpan = 64
  td.style.padding = '0'
  td.style.border = '0'
  tr.appendChild(td)
  return tr
}

export function useVirtualTable<T>(
  source: Ref<T[]>,
  options: {
    height: number
    rowHeight?: number
    overscan?: number
    containerRef?: Ref<HTMLElement | null> | ShallowRef<HTMLElement | null>
    tableSelector?: string
  },
) {
  const {
    height,
    rowHeight = 39,
    overscan = 3,
    containerRef,
    tableSelector = '.virtual-table',
  } = options

  const scrollTop = ref(0)

  const range = computed(() => {
    const len = source.value.length
    if (!len) {
      return { start: 0, end: 0, offset: 0, bottom: 0 }
    }
    const start = Math.max(0, Math.floor(scrollTop.value / rowHeight) - overscan)
    const visibleCount = Math.ceil(height / rowHeight) + overscan * 2
    const end = Math.min(start + visibleCount, len)
    return {
      start,
      end,
      offset: start * rowHeight,
      bottom: Math.max(0, (len - end) * rowHeight),
    }
  })

  const tableData = computed(() => source.value.slice(range.value.start, range.value.end))

  let scrollEl: HTMLElement | null = null
  let topSpacer: HTMLTableRowElement | null = null
  let bottomSpacer: HTMLTableRowElement | null = null
  let rafId = 0

  const getRoot = () => containerRef?.value ?? document.querySelector<HTMLElement>(tableSelector)

  const onScroll = () => {
    if (!scrollEl) {
      return
    }
    scrollTop.value = scrollEl.scrollTop
  }

  const unbind = () => {
    scrollEl?.removeEventListener('scroll', onScroll)
    scrollEl = null
    topSpacer = null
    bottomSpacer = null
  }

  const bind = () => {
    const root = getRoot()
    if (!root) {
      return false
    }

    const nextScrollEl =
      root.querySelector<HTMLElement>('.ant-table-content .ant-table-body') ??
      root.querySelector<HTMLElement>('.ant-table-body')

    if (!nextScrollEl) {
      return false
    }

    if (scrollEl !== nextScrollEl) {
      scrollEl?.removeEventListener('scroll', onScroll)
      scrollEl = nextScrollEl
      scrollEl.addEventListener('scroll', onScroll, { passive: true })
      topSpacer = null
      bottomSpacer = null
    }

    return true
  }

  const syncSpacer = (
    tbody: HTMLTableSectionElement,
    spacer: HTMLTableRowElement | null,
    className: string,
    heightPx: number,
    position: 'top' | 'bottom',
  ) => {
    if (heightPx <= 0) {
      spacer?.remove()
      return null
    }

    let row = spacer
    if (!row || !tbody.contains(row)) {
      row = createSpacerRow(className)
      if (position === 'top') {
        const measureRow = tbody.querySelector('.ant-table-measure-row')
        if (measureRow?.nextSibling) {
          tbody.insertBefore(row, measureRow.nextSibling)
        } else {
          tbody.prepend(row)
        }
      } else {
        tbody.appendChild(row)
      }
    }

    const td = row.firstElementChild as HTMLTableCellElement
    td.style.height = `${heightPx}px`
    row.style.display = ''
    return row
  }

  const updateLayout = () => {
    if (!bind()) {
      return
    }

    const tbody = scrollEl?.querySelector('tbody')
    if (!tbody || !source.value.length) {
      return
    }

    const { offset, bottom } = range.value
    topSpacer = syncSpacer(
      tbody,
      topSpacer,
      'virtual-table-spacer virtual-table-spacer-top',
      offset,
      'top',
    )
    bottomSpacer = syncSpacer(
      tbody,
      bottomSpacer,
      'virtual-table-spacer virtual-table-spacer-bottom',
      bottom,
      'bottom',
    )
  }

  const scheduleLayout = () => {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      updateLayout()
    })
  }

  const refresh = () => {
    const currentScrollEl = scrollEl
    unbind()
    scrollTop.value = 0
    if (currentScrollEl) {
      currentScrollEl.scrollTop = 0
    }
    scheduleLayout()
  }

  onMounted(() => {
    scheduleLayout()
    window.setTimeout(scheduleLayout, 50)
    window.setTimeout(scheduleLayout, 200)
  })

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    unbind()
    topSpacer?.remove()
    bottomSpacer?.remove()
  })

  watch(
    () => [source.value.length, range.value.start, range.value.end] as const,
    () => {
      scheduleLayout()
    },
    { flush: 'post' },
  )

  watch(
    () => source.value.length,
    (len, prevLen) => {
      if (len !== prevLen) {
        scrollTop.value = 0
        if (scrollEl) {
          scrollEl.scrollTop = 0
        }
        unbind()
        scheduleLayout()
      }
    },
  )

  return {
    scrollTop,
    range,
    tableData,
    refresh,
  }
}

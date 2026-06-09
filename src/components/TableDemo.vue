<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import { fetchUsers, type User } from '../api/mockUsers'
import { getFixedLeftColumns } from '../utils/tableFixedColumns'
import { useOuterHorizontalScroll } from '../utils/useOuterHorizontalScroll'
import { useVirtualTable } from '../utils/useVirtualTable'

const PAGE_SIZE = 1000

const NAME_COL_WIDTH = 100
const SCROLL_X = 1070
const TABLE_HEIGHT = 600
const ROW_HEIGHT = 39

const columns: TableColumnsType<User> = [
  { title: '姓名', dataIndex: 'name', key: 'name', width: NAME_COL_WIDTH, fixed: 'left', ellipsis: true },
  { title: '年龄', dataIndex: 'age', key: 'age', width: 80, sorter: (a, b) => a.age - b.age },
  { title: '性别', dataIndex: 'gender', key: 'gender', width: 70 },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130, ellipsis: true },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180, ellipsis: true },
  { title: '部门', dataIndex: 'department', key: 'department', width: 100, ellipsis: true },
  { title: '职位', dataIndex: 'position', key: 'position', width: 100, ellipsis: true },
  { title: '薪资', dataIndex: 'salary', key: 'salary', width: 100, sorter: (a, b) => a.salary - b.salary },
  { title: '入职日期', dataIndex: 'joinDate', key: 'joinDate', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
]

const dataSource = ref<User[]>([])
const renderTime = ref('')
const currentPage = ref(0)
const hasMore = ref(true)

const loading = ref(false)
const loadingMore = ref(false)
const selectedRowKeys = ref<Key[]>([])

const tableContainerRef = ref<HTMLElement | null>(null)

const fixedLeftOffsets = computed(() =>
  getFixedLeftColumns(columns).map((col) => col.left),
)

const { refresh: refreshOuterScroll, syncFixedColumns } = useOuterHorizontalScroll(
  tableContainerRef,
  { fixedLeftOffsets },
)

const { tableData, range, refresh } = useVirtualTable(dataSource, {
  height: TABLE_HEIGHT,
  rowHeight: ROW_HEIGHT,
  overscan: 4,
  containerRef: tableContainerRef,
  hasMore,
  loadingMore,
  onReachEnd: loadMore,
})

const rowSelection = computed(() => ({
  columnWidth: 48,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: Key[]) => {
    selectedRowKeys.value = keys
  },
}))

async function loadFirstPage() {
  const renderStart = performance.now()
  loading.value = true
  currentPage.value = 0
  hasMore.value = true

  const result = await fetchUsers(1, PAGE_SIZE)
  currentPage.value = result.page
  hasMore.value = result.hasMore
  dataSource.value = result.list

  await nextTick()
  refresh()
  refreshOuterScroll()
  await nextTick()
  renderTime.value = `${(performance.now() - renderStart).toFixed(1)} ms`
  loading.value = false
}

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) {
    return
  }

  loadingMore.value = true
  const nextPage = currentPage.value + 1

  try {
    const result = await fetchUsers(nextPage, PAGE_SIZE)
    currentPage.value = result.page
    hasMore.value = result.hasMore
    dataSource.value = [...dataSource.value, ...result.list]
    await nextTick()
    refreshOuterScroll()
  } finally {
    loadingMore.value = false
  }
}

async function handleRefresh() {
  selectedRowKeys.value = []
  await loadFirstPage()
}

watch(
  () => [range.value.start, range.value.end] as const,
  async () => {
    await nextTick()
    syncFixedColumns()
  },
)

onMounted(() => {
  void loadFirstPage()
})
</script>

<template>
  <div class="table-demo">
    <h2>用户列表（虚拟滚动 · 滚动加载更多）</h2>
    <a-space style="margin-bottom: 16px" wrap>
      <a-button type="primary" @click="handleRefresh">重新加载</a-button>
      <span>已加载 {{ dataSource.length }} 条</span>
      <span>当前第 {{ currentPage }} 页</span>
      <span>已选 {{ selectedRowKeys.length }} 条</span>
      <span>渲染耗时：{{ renderTime || '计算中...' }}</span>
      <span>当前渲染：{{ range.end ? range.start + 1 : 0 }}-{{ range.end }} / {{ dataSource.length }}</span>
      <a-tag v-if="loadingMore" color="processing">加载下一批...</a-tag>
      <a-tag v-else-if="!hasMore" color="default">已全部加载</a-tag>
    </a-space>

    <!--
      最终方案：外层横向原生滚动（表头+表身同步、系统惯性、零 JS 表头同步）
      scroll.x 启用 fixed 列样式；body 禁止横向滚动，避免 ant onScroll 横滑掉帧
      表头 sticky；表身 fixed 列由 JS transform 补偿外层横滑
    -->
    <div ref="tableContainerRef" class="virtual-table-wrapper">
      <div
        class="table-horizontal-scroll"
        :style="{ '--table-min-width': `${SCROLL_X}px` }"
      >
        <a-table
          class="virtual-table"
          table-layout="fixed"
          row-key="key"
          :columns="columns"
          :data-source="tableData"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: SCROLL_X, y: TABLE_HEIGHT }"
          bordered
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-demo {
  max-width: 100%;
  margin: 0 auto;
  padding: 24px;
}

h2 {
  margin-bottom: 16px;
}

.virtual-table-wrapper {
  width: 100%;
  max-width: 100%;
}

/* 横向唯一滚动容器：表头表身一体、系统惯性 */
.table-horizontal-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  width: 100%;
}

.table-horizontal-scroll :deep(.ant-table-wrapper) {
  min-width: var(--table-min-width);
}

.virtual-table :deep(.ant-table-container),
.virtual-table :deep(.ant-table-content),
.virtual-table :deep(.ant-table-header),
.virtual-table :deep(.ant-table-header .ant-table-sticky-holder) {
  overflow: visible !important;
}

/* body 仅纵向 */
.virtual-table :deep(.ant-table-body) {
  overflow-x: visible !important;
  overflow-y: scroll !important;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

/* 表头：sticky 相对外层横滑容器 */
.table-horizontal-scroll :deep(.ant-table-thead .ant-table-cell-fix-left) {
  position: sticky !important;
  z-index: 4;
  background: #fafafa;
}

/* 表头 left 由 getFixedLeftColumns + JS 按 fixed:left 列宽累加设置 */

/* 表身：sticky 在纵向滚动容器内无效，由 JS transform 补偿 */
.table-horizontal-scroll :deep(.ant-table-tbody .ant-table-cell-fix-left) {
  position: relative !important;
  left: auto !important;
  z-index: 2;
  background: #fff;
  will-change: transform;
}

.table-horizontal-scroll :deep(.ant-table-tbody .ant-table-cell-fix-left-last) {
  box-shadow: inset 10px 0 8px -8px rgba(0, 0, 0, 0.12);
}

.virtual-table :deep(.ant-table-sticky-scroll) {
  display: none;
}

.virtual-table :deep(.ant-table-container::before),
.virtual-table :deep(.ant-table-container::after) {
  display: none !important;
}

.virtual-table :deep(.ant-table-cell-fix-left-last::after),
.virtual-table :deep(.ant-table-cell-fix-right-first::after) {
  transition: none !important;
}

.virtual-table :deep(.virtual-table-spacer td) {
  background: transparent !important;
  pointer-events: none;
  padding: 0 !important;
  border: 0 !important;
}
</style>

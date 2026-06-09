<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import { fetchUsers, type User } from '../api/mockUsers'
import { useTableHorizontalTouch } from '../utils/useTableHorizontalTouch'
import { useVirtualTable } from '../utils/useVirtualTable'

const PAGE_SIZE = 1000

const SCROLL_X = 1070
const TABLE_HEIGHT = 600
const ROW_HEIGHT = 39

const columns: TableColumnsType<User> = [
  { title: '姓名', dataIndex: 'name', key: 'name', width: 100, fixed: 'left', ellipsis: true },
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

const { refresh: refreshHorizontalTouch } = useTableHorizontalTouch(tableContainerRef)

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
  refreshHorizontalTouch()
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
  } finally {
    loadingMore.value = false
  }
}

async function handleRefresh() {
  selectedRowKeys.value = []
  await loadFirstPage()
}

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

    <div ref="tableContainerRef" class="virtual-table-wrapper">
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

.virtual-table :deep(.ant-table-body) {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-x pan-y;
}

.virtual-table :deep(.ant-table-header) {
  touch-action: pan-x pan-y;
}

.virtual-table :deep(.ant-table-cell-fix-left) {
  z-index: 2;
  background: #fff;
}

.virtual-table :deep(.ant-table-thead .ant-table-cell-fix-left) {
  z-index: 3;
  background: #fafafa;
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

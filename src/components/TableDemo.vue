<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import { useVirtualTable } from '../utils/useVirtualTable'

interface User {
  key: string
  name: string
  age: number
  gender: string
  phone: string
  email: string
  department: string
  position: string
  salary: number
  joinDate: string
  status: string
}

const surnames = ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴']
const names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋']
const genders = ['男', '女']
const departments = ['技术部', '产品部', '市场部', '人事部', '财务部', '运营部', '设计部', '客服部']
const positions = ['工程师', '经理', '主管', '专员', '总监', '助理', '分析师', '顾问']
const statuses = ['在职', '离职', '试用期', '休假中']

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateData(count: number): User[] {
  const seed = Date.now()
  return Array.from({ length: count }, (_, i) => {
    const year = randomInt(2010, 2024)
    const month = randomInt(1, 12)
    const day = randomInt(1, 28)
    return {
      key: `${seed}-${i}`,
      name: randomPick(surnames) + randomPick(names) + randomInt(0, 999),
      age: randomInt(18, 65),
      gender: randomPick(genders),
      phone: `1${randomInt(3, 9)}${String(randomInt(100000000, 999999999))}`,
      email: `user${randomInt(1000, 99999)}@${randomPick(['qq', '163', 'gmail', 'outlook'])}.com`,
      department: randomPick(departments),
      position: randomPick(positions),
      salary: randomInt(5000, 50000),
      joinDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      status: randomPick(statuses),
    }
  })
}

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

const TOTAL = 1000
const dataSource = ref<User[]>([])
const renderTime = ref('')

const loading = ref(false)
const selectedRowKeys = ref<Key[]>([])

const tableContainerRef = ref<HTMLElement | null>(null)

const { tableData, range, refresh } = useVirtualTable(dataSource, {
  height: TABLE_HEIGHT,
  rowHeight: ROW_HEIGHT,
  overscan: 4,
  containerRef: tableContainerRef,
})

const rowSelection = computed(() => ({
  columnWidth: 48,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: Key[]) => {
    selectedRowKeys.value = keys
  },
}))

async function renderTable(data: User[]) {
  const renderStart = performance.now()
  dataSource.value = data
  await nextTick()
  refresh()
  await nextTick()
  renderTime.value = `${(performance.now() - renderStart).toFixed(1)} ms`
}

async function handleRefresh() {
  loading.value = true
  selectedRowKeys.value = []
  const newData = generateData(TOTAL)
  await renderTable(newData)
  loading.value = false
}

onMounted(async () => {
  await renderTable(generateData(TOTAL))
})
</script>

<template>
  <div class="table-demo">
    <h2>用户列表（{{ TOTAL }} 条 · 虚拟滚动）</h2>
    <a-space style="margin-bottom: 16px" wrap>
      <a-button type="primary" @click="handleRefresh">重新渲染</a-button>
      <span>已选 {{ selectedRowKeys.length }} 条</span>
      <span>渲染耗时：{{ renderTime || '计算中...' }}</span>
      <span>当前渲染：{{ range.end ? range.start + 1 : 0 }}-{{ range.end }} / {{ TOTAL }}</span>
    </a-space>

    <div ref="tableContainerRef" class="virtual-table-wrapper">
      <a-table
        class="virtual-table"
        table-layout="fixed"
        row-key="key"
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :row-selection="rowSelection"
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

.virtual-table :deep(.virtual-table-spacer td) {
  background: transparent !important;
  pointer-events: none;
  padding: 0 !important;
  border: 0 !important;
}
</style>

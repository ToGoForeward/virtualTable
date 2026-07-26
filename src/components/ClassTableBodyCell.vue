<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import { fetchClassTable, type ClassTableRow } from '../api/mockClassTable'
import arrowDownIcon from '../assets/icons/arrow-down.svg'
import arrowUpIcon from '../assets/icons/arrow-up.svg'
import { getDepartmentExpandedRowColor } from '../config/departmentRowColors'

interface DepartmentGroup {
  department: string
  subtotal?: ClassTableRow
  details: ClassTableRow[]
  collapsible: boolean
}

const props = withDefaults(
  defineProps<{
    columns: TableColumnsType<ClassTableRow>
    dataSource?: ClassTableRow[]
    autoFetch?: boolean
  }>(),
  {
    dataSource: () => [],
    autoFetch: false,
  },
)

const rawList = ref<ClassTableRow[]>([...props.dataSource])
const expandedDepartments = ref<Set<string>>(new Set())
const loading = ref(false)

watch(
  () => props.dataSource,
  (value) => {
    rawList.value = [...value]
  },
)

function buildDepartmentGroups(list: ClassTableRow[]): DepartmentGroup[] {
  const departmentOrder: string[] = []
  const groupMap = new Map<string, DepartmentGroup>()

  for (const row of list) {
    if (!groupMap.has(row.department)) {
      groupMap.set(row.department, {
        department: row.department,
        details: [],
        collapsible: false,
      })
      departmentOrder.push(row.department)
    }

    const group = groupMap.get(row.department)!
    if (row.rowType === 'subtotal') {
      group.subtotal = row
    } else {
      group.details.push(row)
    }
  }

  return departmentOrder.map((department) => {
    const group = groupMap.get(department)!
    group.collapsible = Boolean(group.subtotal && group.details.length > 0)
    return group
  })
}

const departmentGroups = computed(() => buildDepartmentGroups(rawList.value))

function getDepartmentGroup(department: string) {
  return departmentGroups.value.find((group) => group.department === department)
}

function buildDisplayList(groups: DepartmentGroup[], expanded: Set<string>): ClassTableRow[] {
  const result: ClassTableRow[] = []

  for (const group of groups) {
    if (group.collapsible && group.subtotal) {
      result.push(group.subtotal)
      if (expanded.has(group.department)) {
        result.push(...group.details)
      }
      continue
    }

    if (group.subtotal) {
      result.push(group.subtotal)
    }

    result.push(...group.details)
  }

  return result
}

const displayList = computed(() =>
  buildDisplayList(departmentGroups.value, expandedDepartments.value),
)

function isDepartmentExpanded(department: string) {
  return expandedDepartments.value.has(department)
}

function toggleDepartment(department: string) {
  const group = getDepartmentGroup(department)
  if (!group?.collapsible) {
    return
  }

  const next = new Set(expandedDepartments.value)
  if (next.has(department)) {
    next.delete(department)
  } else {
    next.add(department)
  }
  expandedDepartments.value = next
}

function getBodyCellProps(record: ClassTableRow, index?: number) {
  const classes: string[] = []
  const group = getDepartmentGroup(record.department)
  const isExpandedDetail =
    record.rowType === 'data' &&
    Boolean(group?.collapsible && isDepartmentExpanded(record.department))

  if (record.rowType === 'subtotal') {
    classes.push('subtotal-row')
  }

  if (isExpandedDetail) {
    classes.push('expanded-detail-row')
    return {
      class: classes.join(' '),
      style: {
        '--department-expanded-bg': getDepartmentExpandedRowColor(record.department),
      },
    }
  }

  if (typeof index === 'number') {
    classes.push((index + 1) % 2 === 0 ? 'stripe-even-row' : 'stripe-odd-row')
  }

  return classes.length ? { class: classes.join(' ') } : {}
}

const tableColumns = computed<TableColumnsType<ClassTableRow>>(() =>
  props.columns.map((column) => ({
    ...column,
    customCell: (record: ClassTableRow, index?: number) => getBodyCellProps(record, index),
  })),
)

function isCollapsibleSubtotal(record: ClassTableRow) {
  if (record.rowType !== 'subtotal') {
    return false
  }

  return Boolean(getDepartmentGroup(record.department)?.collapsible)
}

async function loadData() {
  loading.value = true
  try {
    const result = await fetchClassTable()
    rawList.value = result.list
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (props.autoFetch || rawList.value.length === 0) {
    void loadData()
  }
})
</script>

<template>
  <a-table
    class="class-table-body-cell"
    :columns="tableColumns"
    :data-source="displayList"
    :loading="loading"
    bordered
    size="middle"
    :pagination="false"
  >
    <template #bodyCell="{ column, record, text }">
      <template v-if="column.key === 'className' && isCollapsibleSubtotal(record)">
        <span class="class-name-cell">
          <span>{{ record.department }}</span>
          <button
            type="button"
            class="expand-btn"
            :aria-label="isDepartmentExpanded(record.department) ? '收起' : '展开'"
            @click.stop="toggleDepartment(record.department)"
          >
            <img
              :src="isDepartmentExpanded(record.department) ? arrowUpIcon : arrowDownIcon"
              :alt="isDepartmentExpanded(record.department) ? '收起' : '展开'"
              class="expand-icon"
            />
          </button>
        </span>
      </template>
      <template v-else-if="column.key === 'className'">
        {{ record.rowType === 'subtotal' ? record.department : text }}
      </template>
      <template v-else>
        {{ text }}
      </template>
    </template>
  </a-table>
</template>

<style scoped>
.class-table-body-cell :deep(.stripe-odd-row) {
  background: #fff;
}

.class-table-body-cell :deep(.stripe-even-row) {
  background: #fafafa;
}

.class-table-body-cell :deep(.subtotal-row) {
  font-weight: 500;
}

.class-table-body-cell :deep(.expanded-detail-row) {
  background: var(--department-expanded-bg, #fafafa);
}

.class-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.expand-icon {
  display: block;
  width: 12px;
  height: 12px;
}
</style>

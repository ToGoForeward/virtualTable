<script setup lang="ts">
/**
 * 通用分组展开表格：按 groupField 分组，支持小计行折叠/展开明细。
 * 业务字段名（如 department、className）由调用方通过 props 传入，组件内不包含业务语义。
 */
import { computed, ref, watch } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import arrowDownIcon from '../assets/icons/arrow-down.svg'
import arrowUpIcon from '../assets/icons/arrow-up.svg'

/** 表格行最小结构，其余字段由业务方自行扩展 */
export type GroupExpandRow = Record<string, unknown> & { key: string }

/** 单个分组的聚合信息 */
interface RowGroup {
  groupKey: string
  subtotal?: GroupExpandRow
  details: GroupExpandRow[]
  /** 同时存在小计行与明细行时可折叠 */
  collapsible: boolean
}

const props = withDefaults(
  defineProps<{
    columns: TableColumnsType<GroupExpandRow>
    dataSource?: GroupExpandRow[]
    /** 用于分组的字段名 */
    groupField: string
    /** 区分小计/明细的字段名 */
    rowTypeField: string
    /** 展示分组名与展开箭头的列 key */
    expandColumnKey: string
    /** rowTypeField 对应的小计行取值 */
    subtotalType?: string
    /** rowTypeField 对应的明细行取值 */
    dataType?: string
    /** 展开后明细行背景色，按 groupKey 映射 */
    expandedRowColors?: Record<string, string>
    defaultExpandedRowColor?: string
  }>(),
  {
    dataSource: () => [],
    subtotalType: 'subtotal',
    dataType: 'data',
    defaultExpandedRowColor: '#fafafa',
  },
)

/** 原始数据（含折叠前的全部行） */
const rawList = ref<GroupExpandRow[]>([...props.dataSource])
/** 当前处于展开状态的分组 key 集合 */
const expandedGroups = ref<Set<string>>(new Set())

watch(
  () => props.dataSource,
  (value) => {
    rawList.value = [...value]
  },
)

function getGroupKey(record: GroupExpandRow): string {
  return String(record[props.groupField])
}

function getRowType(record: GroupExpandRow): unknown {
  return record[props.rowTypeField]
}

function isSubtotalRow(record: GroupExpandRow): boolean {
  return getRowType(record) === props.subtotalType
}

function isDataRow(record: GroupExpandRow): boolean {
  return getRowType(record) === props.dataType
}

/** 将扁平 dataSource 按 groupField 聚合成 RowGroup，保持首次出现顺序 */
function buildRowGroups(list: GroupExpandRow[]): RowGroup[] {
  const groupOrder: string[] = []
  const groupMap = new Map<string, RowGroup>()

  for (const row of list) {
    const groupKey = getGroupKey(row)

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        groupKey,
        details: [],
        collapsible: false,
      })
      groupOrder.push(groupKey)
    }

    const group = groupMap.get(groupKey)!
    if (isSubtotalRow(row)) {
      group.subtotal = row
    } else {
      group.details.push(row)
    }
  }

  return groupOrder.map((groupKey) => {
    const group = groupMap.get(groupKey)!
    group.collapsible = Boolean(group.subtotal && group.details.length > 0)
    return group
  })
}

const rowGroups = computed(() => buildRowGroups(rawList.value))

function getRowGroup(groupKey: string) {
  return rowGroups.value.find((group) => group.groupKey === groupKey)
}

/**
 * 根据展开状态生成实际渲染行：
 * - 可折叠组：默认只显示小计行，展开后追加明细
 * - 不可折叠组：小计行（若有）+ 全部明细直接展示
 */
function buildDisplayList(groups: RowGroup[], expanded: Set<string>): GroupExpandRow[] {
  const result: GroupExpandRow[] = []

  for (const group of groups) {
    if (group.collapsible && group.subtotal) {
      result.push(group.subtotal)
      if (expanded.has(group.groupKey)) {
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

const displayList = computed(() => buildDisplayList(rowGroups.value, expandedGroups.value))

function isGroupExpanded(groupKey: string) {
  return expandedGroups.value.has(groupKey)
}

function toggleGroup(groupKey: string) {
  const group = getRowGroup(groupKey)
  if (!group?.collapsible) {
    return
  }

  const next = new Set(expandedGroups.value)
  if (next.has(groupKey)) {
    next.delete(groupKey)
  } else {
    next.add(groupKey)
  }
  expandedGroups.value = next
}

function getExpandedRowColor(groupKey: string) {
  return props.expandedRowColors?.[groupKey] ?? props.defaultExpandedRowColor
}

/** 通过 column.customCell 注入行样式，避免使用 customRow */
function getBodyCellProps(record: GroupExpandRow, index?: number) {
  const classes: string[] = []
  const groupKey = getGroupKey(record)
  const group = getRowGroup(groupKey)
  const isExpandedDetail =
    isDataRow(record) && Boolean(group?.collapsible && isGroupExpanded(groupKey))

  if (isSubtotalRow(record)) {
    classes.push('subtotal-row')
  }

  // 已展开的明细行使用分组专属背景色，不参与斑马纹
  if (isExpandedDetail) {
    classes.push('expanded-detail-row')
    return {
      class: classes.join(' '),
      style: {
        '--group-expanded-bg': getExpandedRowColor(groupKey),
      },
    }
  }

  // 小计行与可见明细行交替着色
  if (typeof index === 'number') {
    classes.push((index + 1) % 2 === 0 ? 'stripe-even-row' : 'stripe-odd-row')
  }

  return classes.length ? { class: classes.join(' ') } : {}
}

/** 为每列挂载 customCell，统一处理行级样式 */
const tableColumns = computed<TableColumnsType<GroupExpandRow>>(() =>
  props.columns.map((column) => ({
    ...column,
    customCell: (record: GroupExpandRow, index?: number) => getBodyCellProps(record, index),
  })),
)

/** 小计行且该组可折叠时，在 expandColumnKey 列显示箭头 */
function isCollapsibleSubtotal(record: GroupExpandRow) {
  if (!isSubtotalRow(record)) {
    return false
  }

  return Boolean(getRowGroup(getGroupKey(record))?.collapsible)
}

/**
 * expandColumnKey 列何时显示分组名而非单元格原值：
 * - 小计行：显示 groupKey
 * - 无小计行的分组：明细行也显示 groupKey
 * - 已展开的可折叠组明细：显示原列值
 */
function shouldShowGroupInExpandColumn(record: GroupExpandRow) {
  if (isSubtotalRow(record)) {
    return true
  }

  const group = getRowGroup(getGroupKey(record))
  return Boolean(group && !group.subtotal)
}

function isExpandColumn(columnKey: unknown) {
  return columnKey === props.expandColumnKey
}
</script>

<template>
  <a-table
    class="group-expand-table"
    :columns="tableColumns"
    :data-source="displayList"
    bordered
    size="middle"
    :pagination="false"
  >
    <!-- 可折叠小计行：分组名 + 展开/收起箭头 -->
    <template #bodyCell="{ column, record, text }">
      <template v-if="isExpandColumn(column.key) && isCollapsibleSubtotal(record)">
        <span class="expand-label-cell">
          <span>{{ getGroupKey(record) }}</span>
          <button
            type="button"
            class="expand-btn"
            :aria-label="isGroupExpanded(getGroupKey(record)) ? '收起' : '展开'"
            @click.stop="toggleGroup(getGroupKey(record))"
          >
            <img
              :src="isGroupExpanded(getGroupKey(record)) ? arrowUpIcon : arrowDownIcon"
              :alt="isGroupExpanded(getGroupKey(record)) ? '收起' : '展开'"
              class="expand-icon"
            />
          </button>
        </span>
      </template>
      <!-- expandColumnKey 列：按规则显示分组名或原值 -->
      <template v-else-if="isExpandColumn(column.key)">
        {{ shouldShowGroupInExpandColumn(record) ? getGroupKey(record) : text }}
      </template>
      <template v-else>
        {{ text }}
      </template>
    </template>
  </a-table>
</template>

<style scoped>
.group-expand-table :deep(.stripe-odd-row) {
  background: #fff;
}

.group-expand-table :deep(.stripe-even-row) {
  background: #fafafa;
}

.group-expand-table :deep(.subtotal-row) {
  font-weight: 500;
}

.group-expand-table :deep(.expanded-detail-row) {
  background: var(--group-expanded-bg, #fafafa);
}

.expand-label-cell {
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

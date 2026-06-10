<script setup lang="ts">
import { h, type VNode } from 'vue'
import { useRouter } from 'vue-router'
import type { TableColumnsType } from 'ant-design-vue'

interface LogicalBonusRow {
  fycRange: string
  businessDirector: string
  seniorDirector: string
  executiveDirector: string
}

interface SideGroup {
  k2: string
  adjustmentFactor: string
}

interface BonusRow {
  key: string
  fycRange: string
  businessDirector: string
  seniorDirector: string
  executiveDirector: string
  leftRowSpan: number
  k2: string
  k2RowSpan: number
  adjustmentFactor: string
  factorRowSpan: number
}

/** 左侧 5 行 × 右侧 3 格，LCM = 15 个子行；右侧每格 rowSpan 5 ≈ 1.5 倍单行（5÷3） */
const LEFT_LOGICAL_ROWS = 5
const RIGHT_LOGICAL_ROWS = 3
const SUB_ROW_COUNT = LEFT_LOGICAL_ROWS * RIGHT_LOGICAL_ROWS
const LEFT_ROW_SPAN = SUB_ROW_COUNT / LEFT_LOGICAL_ROWS
const RIGHT_ROW_SPAN = SUB_ROW_COUNT / RIGHT_LOGICAL_ROWS

const logicalRows: LogicalBonusRow[] = [
  {
    fycRange: '105,000≤FYC <157,500',
    businessDirector: '4.50%',
    seniorDirector: '5.50%',
    executiveDirector: '5.50%',
  },
  {
    fycRange: '157,500≤FYC <210,000',
    businessDirector: '5.00%',
    seniorDirector: '6.00%',
    executiveDirector: '6.00%',
  },
  {
    fycRange: '210,000≤FYC <315,000',
    businessDirector: '5.50%',
    seniorDirector: '6.50%',
    executiveDirector: '6.50%',
  },
  {
    fycRange: '315,000≤FYC <420,000',
    businessDirector: '5.75%',
    seniorDirector: '6.75%',
    executiveDirector: '6.75%',
  },
  {
    fycRange: '420,000≤FYC',
    businessDirector: '6.00%',
    seniorDirector: '7.00%',
    executiveDirector: '7.00%',
  },
]

const sideGroups: SideGroup[] = [
  { k2: '90%以上', adjustmentFactor: '1' },
  { k2: '75%≤K2 <90%', adjustmentFactor: '0.9' },
  { k2: '<75%', adjustmentFactor: '0.8' },
]

const dataSource: BonusRow[] = Array.from({ length: SUB_ROW_COUNT }, (_, index) => {
  const logicalIndex = Math.floor(index / LEFT_ROW_SPAN)
  const sideIndex = Math.floor(index / RIGHT_ROW_SPAN)
  const isLeftStart = index % LEFT_ROW_SPAN === 0
  const isSideStart = index % RIGHT_ROW_SPAN === 0
  const logical = logicalRows[logicalIndex]!
  const side = sideGroups[sideIndex]!

  return {
    key: String(index + 1),
    fycRange: isLeftStart ? logical.fycRange : '',
    businessDirector: isLeftStart ? logical.businessDirector : '',
    seniorDirector: isLeftStart ? logical.seniorDirector : '',
    executiveDirector: isLeftStart ? logical.executiveDirector : '',
    leftRowSpan: isLeftStart ? LEFT_ROW_SPAN : 0,
    k2: isSideStart ? side.k2 : '',
    k2RowSpan: isSideStart ? RIGHT_ROW_SPAN : 0,
    adjustmentFactor: isSideStart ? side.adjustmentFactor : '',
    factorRowSpan: isSideStart ? RIGHT_ROW_SPAN : 0,
  }
})

const router = useRouter()

function leftCellProps(record: BonusRow) {
  const className = [
    record.leftRowSpan > 0 ? 'merged-left-cell' : undefined,
    record.leftRowSpan > 0 ? 'benefit-table-edge-left' : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    rowSpan: record.leftRowSpan,
    class: className || undefined,
  }
}

function sideCellProps(record: BonusRow, rowSpan: number, edge?: 'right') {
  const className = [
    rowSpan > 0 ? 'merged-side-cell' : undefined,
    edge === 'right' && rowSpan > 0 ? 'benefit-table-edge-right' : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    rowSpan,
    class: className || undefined,
  }
}

function renderMultilineTitle(title: string): VNode {
  const lines = title.split('\n')

  return h(
    'span',
    { class: 'benefit-table-header-title' },
    lines.flatMap((line, index) => (index === 0 ? line : [h('br'), line])),
  )
}

function applyMultilineTitles<T>(cols: TableColumnsType<T>): TableColumnsType<T> {
  return cols.map((col) => {
    const next = { ...col }

    if (typeof next.title === 'string' && next.title.includes('\n')) {
      next.title = renderMultilineTitle(next.title)
    }

    if ('children' in next && next.children?.length) {
      next.children = applyMultilineTitles(next.children)
    }

    return next
  })
}

const columns: TableColumnsType<BonusRow> = applyMultilineTitles([
  {
    title: '每月本人\n营业部之FYC总额',
    dataIndex: 'fycRange',
    key: 'fycRange',
    width: 168,
    align: 'left',
    customCell: leftCellProps,
    customHeaderCell: () => ({ class: 'benefit-table-edge-left' }),
  },
  {
    title: '营业部业绩奖金(X%FYC)',
    key: 'bonusGroup',
    align: 'center',
    children: [
      {
        title: '业务\n总监',
        dataIndex: 'businessDirector',
        key: 'businessDirector',
        width: 72,
        align: 'center',
        customCell: leftCellProps,
      },
      {
        title: '资深业务总监',
        dataIndex: 'seniorDirector',
        key: 'seniorDirector',
        width: 88,
        align: 'center',
        customCell: leftCellProps,
      },
      {
        title: '执行业务总监/区域业务总监',
        dataIndex: 'executiveDirector',
        key: 'executiveDirector',
        width: 120,
        align: 'center',
        customCell: leftCellProps,
      },
    ],
  },
  {
    title: '季度末 K2',
    dataIndex: 'k2',
    key: 'k2',
    width: 96,
    align: 'center',
    customCell: (record) => sideCellProps(record, record.k2RowSpan),
  },
  {
    title: '调整因子',
    dataIndex: 'adjustmentFactor',
    key: 'adjustmentFactor',
    width: 72,
    align: 'center',
    customCell: (record) => sideCellProps(record, record.factorRowSpan, 'right'),
    customHeaderCell: () => ({ class: 'benefit-table-edge-right' }),
  },
])

function handleCancel() {
  router.back()
}
</script>

<template>
  <div class="benefit-details">
    <header class="page-header">
      <button type="button" class="cancel-btn" @click="handleCancel">取消</button>
      <h1 class="page-title">利益详情</h1>
      <span class="header-placeholder" aria-hidden="true" />
    </header>

    <main class="page-content">
      <section class="section-card">
        <div class="section-header">
          <div class="section-title">
            <span class="section-badge">2</span>
            <span>营业部业绩奖金</span>
          </div>
          <span class="section-condition">个人标准出席率≥60%</span>
        </div>

        <div class="table-scroll">
          <a-table
            class="benefit-table"
            :columns="columns"
            :data-source="dataSource"
            :pagination="false"
            :scroll="{ x: 616 }"
            bordered
            size="small"
            table-layout="fixed"
          />
        </div>

        <p class="section-footnote">① 营业部业绩奖金与绩效评级挂钩</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.benefit-details {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.cancel-btn {
  min-width: 48px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #1677ff;
  font-size: 14px;
  cursor: pointer;
}

.page-title {
  margin: 0;
  color: #262626;
  font-size: 16px;
  font-weight: 500;
}

.header-placeholder {
  min-width: 48px;
}

.page-content {
  padding: 12px;
}

.section-card {
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 12px 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #262626;
  font-size: 14px;
  font-weight: 500;
}

.section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  font-size: 12px;
  line-height: 1;
}

.section-condition {
  flex-shrink: 0;
  color: #8c8c8c;
  font-size: 12px;
}

.table-scroll {
  overflow-x: auto;
  margin: 10 10px 0 10px;
}

.section-footnote {
  margin: 0;
  padding: 8px 12px 12px;
  color: #8c8c8c;
  font-size: 12px;
}

.benefit-table {
  --benefit-sub-row-height: 14px;
  --benefit-table-border-color: #fadb14;
  --benefit-table-inner-border-color: #ffe58f;
}

.benefit-table :deep(.ant-table) {
  font-size: 12px;
  --ant-color-border: var(--benefit-table-inner-border-color);
  --ant-table-border-color: var(--benefit-table-inner-border-color);
}

.benefit-table :deep(.ant-table-cell) {
  border-color: var(--benefit-table-inner-border-color) !important;
}

/* 顶/左/右外框只由 container 绘制，避免与表头 th 顶边重叠 */
.benefit-table :deep(.ant-table-bordered > .ant-table-container) {
  border-top: 1px solid var(--benefit-table-border-color) !important;
  border-inline-start: 1px solid var(--benefit-table-border-color) !important;
  border-inline-end: 1px solid var(--benefit-table-border-color) !important;
}

.benefit-table :deep(.ant-table-thead > tr:first-child > th) {
  border-top: none !important;
  border-block-start: none !important;
}

/* 贴边单元格不再画外侧重边，避免与 container 外框叠色 */
.benefit-table :deep(.benefit-table-edge-left) {
  border-inline-start: none !important;
  border-left: none !important;
}

.benefit-table :deep(.benefit-table-edge-right) {
  border-inline-end: none !important;
  border-right: none !important;
}

/* 横向滚到尽头时去掉 ping 阴影，避免右侧看起来加粗 */
.benefit-table :deep(.ant-table-container::before),
.benefit-table :deep(.ant-table-container::after) {
  box-shadow: none !important;
}

.benefit-table :deep(.ant-table-thead > tr > th) {
  padding: 8px 6px;
  background: transparent !important;
  color: #595959;
  font-weight: 500;
  text-align: center;
  white-space: normal;
  line-height: 1.4;
}

.benefit-table :deep(.benefit-table-header-title) {
  display: inline-block;
  line-height: 1.4;
  text-align: center;
}

.benefit-table :deep(.ant-table-tbody > tr > td) {
  padding: 2px 6px;
  color: #262626;
  white-space: normal;
  line-height: 1.4;
}

.benefit-table :deep(.ant-table-tbody > tr) {
  height: var(--benefit-sub-row-height);
}

.benefit-table :deep(.ant-table-tbody > tr > td:first-child) {
  text-align: left;
}

.benefit-table :deep(.ant-table-tbody > tr > td.merged-left-cell),
.benefit-table :deep(.ant-table-tbody > tr > td.merged-side-cell) {
  vertical-align: middle;
}
</style>

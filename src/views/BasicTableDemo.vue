<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue'
import { classTableRawData } from '../api/mockClassTable'
import GroupExpandTable, { type GroupExpandRow } from '../components/GroupExpandTable.vue'
import {
  defaultDepartmentExpandedRowColor,
  departmentExpandedRowColors,
} from '../config/departmentRowColors'

const columns: TableColumnsType<GroupExpandRow> = [
  {
    title: '班级',
    dataIndex: 'className',
    key: 'className',
    width: 180,
  },
  {
    title: '班级人数',
    dataIndex: 'classSize',
    key: 'classSize',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
]

const dataSource = classTableRawData as unknown as GroupExpandRow[]
</script>

<template>
  <div class="basic-table-demo">
    <h2>基础表格 Demo</h2>
    <p class="desc">
      有小计的行在班级列显示部门名称和箭头，点击箭头展开或收起明细。
    </p>

    <GroupExpandTable
      :columns="columns"
      :data-source="dataSource"
      group-field="department"
      row-type-field="rowType"
      expand-column-key="className"
      subtotal-type="subtotal"
      data-type="data"
      :expanded-row-colors="departmentExpandedRowColors"
      :default-expanded-row-color="defaultDepartmentExpandedRowColor"
    />
  </div>
</template>

<style scoped>
.basic-table-demo {
  padding: 24px;
}

h2 {
  margin: 0 0 8px;
  color: #262626;
  font-size: 20px;
  font-weight: 500;
}

.desc {
  margin: 0 0 16px;
  color: #8c8c8c;
  font-size: 14px;
}
</style>

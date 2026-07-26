export interface ClassTableRow {
  key: string
  department: string
  className: string
  classSize: number
  status: string
  rowType: 'data' | 'subtotal'
}

/** 模拟服务端返回的完整表格数据（含各部门小计行） */
export const classTableRawData: ClassTableRow[] = [
  { key: '1', department: '技术部', className: '前端一班', classSize: 32, status: '在读', rowType: 'data' },
  { key: '2', department: '技术部', className: '前端二班', classSize: 28, status: '在读', rowType: 'data' },
  { key: '3', department: '技术部', className: '后端一班', classSize: 30, status: '在读', rowType: 'data' },
  { key: 'tech-subtotal', department: '技术部', className: '小计', classSize: 90, status: '', rowType: 'subtotal' },
  { key: '4', department: '产品部', className: '产品一班', classSize: 26, status: '在读', rowType: 'data' },
  { key: '5', department: '产品部', className: '产品二班', classSize: 24, status: '在读', rowType: 'data' },
  { key: '6', department: '产品部', className: '产品三班', classSize: 22, status: '已结课', rowType: 'data' },
  { key: 'product-subtotal', department: '产品部', className: '小计', classSize: 72, status: '', rowType: 'subtotal' },
  { key: '7', department: '设计部', className: 'UI 设计班', classSize: 20, status: '在读', rowType: 'data' },
  { key: '8', department: '运营部', className: '运营推广班', classSize: 25, status: '在读', rowType: 'data' },
]

export interface FetchClassTableResult {
  list: ClassTableRow[]
}

export function fetchClassTable(): Promise<FetchClassTableResult> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({ list: classTableRawData })
    }, 300)
  })
}

import type { TableColumnType } from 'ant-design-vue'

export interface FixedLeftColumn {
  key: string
  width: number
  left: number
}

/** 从 columns 配置解析连续左侧固定列（fixed: 'left'） */
export function getFixedLeftColumns(columns: TableColumnType[]): FixedLeftColumn[] {
  const result: FixedLeftColumn[] = []
  let offset = 0

  for (const col of columns) {
    if (col.fixed === 'left') {
      const width = Number(col.width) || 0
      result.push({
        key: String(col.key ?? col.dataIndex ?? result.length),
        width,
        left: offset,
      })
      offset += width
    } else if (result.length > 0) {
      break
    }
  }

  return result
}

/** 部门展开明细行背景色配置 */
export const departmentExpandedRowColors: Record<string, string> = {
  技术部: '#e6f4ff',
  产品部: '#f6ffed',
  设计部: '#fff7e6',
  运营部: '#f9f0ff',
}

/** 未配置部门时的默认展开行背景色 */
export const defaultDepartmentExpandedRowColor = '#fafafa'

export function getDepartmentExpandedRowColor(department: string): string {
  return departmentExpandedRowColors[department] ?? defaultDepartmentExpandedRowColor
}

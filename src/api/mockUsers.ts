export interface User {
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

function createUsers(page: number, pageSize: number): User[] {
  const seed = Date.now()
  const start = (page - 1) * pageSize
  return Array.from({ length: pageSize }, (_, i) => {
    const index = start + i
    const year = randomInt(2010, 2024)
    const month = randomInt(1, 12)
    const day = randomInt(1, 28)
    return {
      key: `p${page}-${seed}-${index}`,
      name: randomPick(surnames) + randomPick(names) + randomInt(0, 999),
      age: randomInt(18, 65),
      gender: randomPick(genders),
      phone: `1${randomInt(3, 9)}${String(randomInt(100000000, 999999999))}`,
      email: `user${index}@${randomPick(['qq', '163', 'gmail', 'outlook'])}.com`,
      department: randomPick(departments),
      position: randomPick(positions),
      salary: randomInt(5000, 50000),
      joinDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      status: randomPick(statuses),
    }
  })
}

export interface FetchUsersResult {
  list: User[]
  page: number
  pageSize: number
  hasMore: boolean
}

/** 模拟分页接口：每页 1000 条，最多 5 页 */
export function fetchUsers(page: number, pageSize = 1000): Promise<FetchUsersResult> {
  const maxPage = 5
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        list: createUsers(page, pageSize),
        page,
        pageSize,
        hasMore: page < maxPage,
      })
    }, 600)
  })
}

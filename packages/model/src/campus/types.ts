/** 校园卡的实例数据；不保存账号、凭据或未经用户录入的期限。 */
export type SchoolId = 'generic' | 'bupt' | 'bit' | 'xmu' | 'csu' | 'custom'
export type Degree = 'undergraduate' | 'master' | 'doctoral'
export type Due = { kind: 'date', date: string, timeZone: string } | { kind: 'instant', at: string, timeZone: string }
export type CampusStatus = 'todo' | 'done' | 'cancelled'
export interface CampusItem {
  id: string
  kind: 'deadline' | 'milestone'
  title: string
  category: string
  due: Due
  status: CampusStatus
  url?: string
  note?: string
  source: string
  sourceUid?: string
  createdAt: string
  updatedAt: string
}
export interface CampusLink { id: string, title: string, url: string }
export interface CampusState {
  schemaVersion: 1
  items: CampusItem[]
  links: CampusLink[]
  customCategories: string[]
  reminderLedger: Record<string, string>
}
export interface CampusProps {
  schoolPreset: SchoolId
  degree: Degree
  genericTheme: 'book' | 'tree' | 'clock'
  customSchool: { name: string, shortName: string, iconAlt: string }
  backgroundPosition: { x: number, y: number }
  backgroundStrength: number
  timeZone: string
  hasBackground: boolean
  hasIcon: boolean
  reminderEnabled: boolean
  reminderLeadHours: number
}
export interface SchoolPreset {
  id: SchoolId
  zh: string
  en: string
  short: string
  color: string
  pattern: string
  links: readonly CampusLink[]
  sources: readonly string[]
  checked: string
}

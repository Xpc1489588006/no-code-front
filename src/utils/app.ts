import { API_BASE_URL } from '@/request'

export const FEATURED_APP_PRIORITY = 99
export const DEFAULT_CODE_GEN_TYPE = 'html'
export const LOCAL_STATIC_HOST = API_BASE_URL.replace(/\/api$/, '')

export const normalizeAppName = (name?: string) => {
  const trimmed = name?.trim()
  return trimmed || '未命名应用'
}

export const deriveAppName = (prompt: string) => {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find(Boolean)

  const normalized = firstLine?.replace(/[，。！？、；：,.!?;:]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return '我的应用'
  }
  return normalized.slice(0, 18)
}

export const getAppPreviewUrl = (app?: Partial<API.AppVO> | Partial<API.App>) => {
  if (!app?.id) {
    return ''
  }
  const codeGenType = app.codeGenType || DEFAULT_CODE_GEN_TYPE
  return `${LOCAL_STATIC_HOST}/api/static/${codeGenType}_${app.id}/index.html`
}

export const formatDateTime = (value?: string) => {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

export const formatRelativeTime = (value?: string) => {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  if (diff < minute) {
    return '刚刚'
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)} 分钟前`
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`
  }
  if (diff < week) {
    return `${Math.floor(diff / day)} 天前`
  }
  return `${Math.floor(diff / week)} 周前`
}

export const getAppOwnerName = (app?: API.AppVO) => {
  return app?.user?.userName || app?.user?.userAccount || `用户 #${app?.userId ?? '-'}`
}

export const isAppEditableByUser = (
  app?: Partial<API.AppVO> | Partial<API.App>,
  user?: API.LoginUserVO,
) => {
  if (!app?.id || !user?.id) {
    return false
  }
  if (user.userRole === 'admin') {
    return true
  }
  return app.userId === user.id
}

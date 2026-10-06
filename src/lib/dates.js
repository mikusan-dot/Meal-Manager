import { TZ } from '../config'

const pad = (n) => String(n).padStart(2, '0')

/** Today's date in Bangladesh as YYYY-MM-DD. */
export function todayStr(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Minutes after midnight in Bangladesh. */
export function nowMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const h = Number(parts.find((p) => p.type === 'hour').value)
  const m = Number(parts.find((p) => p.type === 'minute').value)
  return h * 60 + m
}

export const currentMonthKey = () => todayStr().slice(0, 7)
export const monthOf = (dateStr) => String(dateStr).slice(0, 7)

const utc = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(utc(s))
  return d.toISOString().slice(0, 10) === s
}
export const isValidMonth = (k) => typeof k === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(k)

export function addDays(dateStr, n) {
  return new Date(utc(dateStr) + n * 86400000).toISOString().slice(0, 10)
}
export function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`
}
export const prevMonth = (key) => addMonths(key, -1)
export const nextMonth = (key) => addMonths(key, 1)

export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
export const monthStart = (key) => `${key}-01`
export const monthEnd = (key) => `${key}-${pad(daysInMonth(key))}`
export const datesOfMonth = (key) => Array.from({ length: daysInMonth(key) }, (_, i) => `${key}-${pad(i + 1)}`)

/** Number of days in `month` the member was resident (inclusive of join and leave dates). */
export function presentDays(month, joinDate, leaveDate) {
  const start = monthStart(month)
  const end = monthEnd(month)
  const from = joinDate && joinDate > start ? joinDate : start
  const to = leaveDate && leaveDate < end ? leaveDate : end
  if (from > to) return 0
  return Math.round((utc(to) - utc(from)) / 86400000) + 1
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** 05 Oct 2026 (Bangladesh style: day first) */
export function formatDate(s) {
  if (!s) return '—'
  const [y, m, d] = s.split('-').map(Number)
  return `${pad(d)} ${MONTHS[m - 1]} ${y}`
}
export const formatDayMonth = (s) => {
  if (!s) return '—'
  const [, m, d] = s.split('-').map(Number)
  return `${pad(d)} ${MONTHS[m - 1]}`
}
export function formatMonth(key) {
  if (!key) return '—'
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_LONG[m - 1]} ${y}`
}
export function weekday(s) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(new Date(utc(s)))
}
/** 12-hour clock from minutes after midnight: 840 → "2:00 PM" */
export function formatMinutes(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`
}
export const minutesToInput = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
export const inputToMinutes = (v) => {
  const [h, m] = v.split(':').map(Number)
  return h * 60 + m
}
/** Firestore Timestamp | Date | ms → "5 Oct 2026, 8:30 PM" */
export function formatDateTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
  const time = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(d)
  return `${formatDate(date)}, ${time}`
}

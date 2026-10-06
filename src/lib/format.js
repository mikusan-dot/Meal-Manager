import { CURRENCY } from '../config'

let nf
try {
  nf = new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
} catch {
  nf = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
const nf2 = new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** ৳1,25,000 (lakh grouping, as used in Bangladesh) */
export const taka = (n) => {
  const v = Number(n) || 0
  return `${v < 0 ? '−' : ''}${CURRENCY}${nf.format(Math.abs(v))}`
}
export const taka2 = (n) => {
  const v = Number(n) || 0
  return `${v < 0 ? '−' : ''}${CURRENCY}${nf2.format(Math.abs(v))}`
}
/** +৳2,000 / −৳90 */
export const signedTaka = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) < 0.005) return taka(0)
  return `${v > 0 ? '+' : '−'}${CURRENCY}${nf.format(Math.abs(v))}`
}
export const num = (n) => nf.format(Number(n) || 0)

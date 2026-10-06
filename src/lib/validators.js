import { BILL_TYPES, CATEGORIES, MEAL_TYPES, PAYMENT_METHODS, SPLIT_METHODS } from '../config'
import { isValidDate, isValidMonth, todayStr, addDays } from './dates'
import { round2 } from './calc'

/** Each validator returns { field: message } – empty object means valid. */
const positive = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function pastOrToday(date, errs, field = 'date') {
  if (!isValidDate(date)) errs[field] = 'Enter a valid date'
  else if (date > todayStr()) errs[field] = 'Date cannot be in the future'
}

export function validateDeposit(d) {
  const e = {}
  if (!d.memberId) e.memberId = 'Choose a member'
  if (!positive(d.amount)) e.amount = 'Amount must be greater than 0'
  else if (d.amount > 10_000_000) e.amount = 'Amount looks too large'
  pastOrToday(d.date, e)
  if (!PAYMENT_METHODS.includes(d.method)) e.method = 'Choose a payment method'
  return e
}

export function validateExpense(x) {
  const e = {}
  if (!x.itemName?.trim()) e.itemName = 'Item name is required'
  if (!positive(x.quantity)) e.quantity = 'Quantity must be greater than 0'
  if (!positive(x.unitPrice)) e.unitPrice = 'Unit price must be greater than 0'
  if (positive(x.quantity) && positive(x.unitPrice) && round2(x.quantity * x.unitPrice) > 10_000_000) e.unitPrice = 'Total looks too large'
  pastOrToday(x.date, e)
  if (!CATEGORIES.includes(x.category)) e.category = 'Choose a category'
  if (!PAYMENT_METHODS.includes(x.paymentMethod)) e.paymentMethod = 'Choose a payment method'
  return e
}

export function validateMealEntry({ memberId, date, breakfast, lunch, dinner }) {
  const e = {}
  if (!memberId) e.memberId = 'Missing member'
  if (!isValidDate(date)) e.date = 'Invalid date'
  else if (date > addDays(todayStr(), 14)) e.date = 'Too far ahead (max 14 days)'
  for (const [k, v] of Object.entries({ breakfast, lunch, dinner })) if (typeof v !== 'boolean') e[k] = 'Invalid meal value'
  return e
}

export function validateGuestMeal(g) {
  const e = {}
  if (!g.memberId) e.memberId = 'Missing host member'
  if (!g.guestName?.trim()) e.guestName = 'Guest name is required'
  if (!isValidDate(g.date)) e.date = 'Invalid date'
  if (!MEAL_TYPES.some((m) => m.key === g.mealType)) e.mealType = 'Choose a meal'
  if (!positive(g.weight) || g.weight > 3) e.weight = 'Weight must be between 0 and 3'
  return e
}

export function validateBill(b) {
  const e = {}
  if (!b.name?.trim()) e.name = 'Bill name is required'
  if (!BILL_TYPES.includes(b.type)) e.type = 'Choose a bill type'
  if (!positive(b.amount)) e.amount = 'Amount must be greater than 0'
  if (!isValidMonth(b.month)) e.month = 'Invalid month'
  if (!isValidDate(b.dueDate)) e.dueDate = 'Enter a valid due date'
  if (!SPLIT_METHODS.some((s) => s.key === b.splitMethod)) e.splitMethod = 'Choose how to split'
  return e
}

export function validateBillPayment(p) {
  const e = {}
  if (!p.memberId) e.memberId = 'Choose a member'
  if (!p.billId) e.billId = 'Choose a bill'
  if (!positive(p.amount)) e.amount = 'Amount must be greater than 0'
  pastOrToday(p.date, e)
  if (!PAYMENT_METHODS.includes(p.method)) e.method = 'Choose a payment method'
  return e
}

export function validateMember(m) {
  const e = {}
  if (!m.name?.trim()) e.name = 'Full name is required'
  if (!m.phone?.trim()) e.phone = 'Phone number is required'
  else if (!/^\+?[0-9\s-]{10,15}$/.test(m.phone.trim())) e.phone = 'Enter a valid phone number'
  if (!m.email?.trim()) e.email = 'Email is required (used for login)'
  else if (!emailRe.test(m.email.trim())) e.email = 'Enter a valid email'
  if (!m.roomNumber?.trim()) e.roomNumber = 'Room number is required'
  if (!isValidDate(m.joinDate)) e.joinDate = 'Enter a valid join date'
  if (m.leaveDate) {
    if (!isValidDate(m.leaveDate)) e.leaveDate = 'Invalid date'
    else if (isValidDate(m.joinDate) && m.leaveDate < m.joinDate) e.leaveDate = 'Leave date is before join date'
  }
  return e
}

export function validateManager({ month, memberId, startDate, endDate }) {
  const e = {}
  if (!isValidMonth(month)) e.month = 'Invalid month'
  if (!memberId) e.memberId = 'Choose a member'
  if (!isValidDate(startDate)) e.startDate = 'Invalid start date'
  if (!isValidDate(endDate)) e.endDate = 'Invalid end date'
  else if (isValidDate(startDate) && endDate < startDate) e.endDate = 'End date is before start date'
  return e
}

export const hasErrors = (e) => Object.keys(e).length > 0

export function validateInventory(x) {
  const e = {}
  if (!x.name?.trim()) e.name = 'Item name is required'
  if (!x.unit?.trim()) e.unit = 'Unit is required (kg, L, pcs)'
  if (!(Number(x.currentStock) >= 0)) e.currentStock = 'Stock cannot be negative'
  if (!(Number(x.minStock) >= 0)) e.minStock = 'Minimum stock cannot be negative'
  return e
}

export function validateShopping(x) {
  const e = {}
  if (!x.item?.trim()) e.item = 'Item name is required'
  if (!(Number(x.qty) > 0)) e.qty = 'Quantity must be greater than 0'
  return e
}

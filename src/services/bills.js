import { addDoc, collection, doc, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { AppError, assertMonthOpen, audit, createStamp, listen, updateStamp } from './common'
import { hasErrors, validateBill, validateBillPayment } from '../lib/validators'
import { monthOf } from '../lib/dates'
import { round2 } from '../lib/calc'

export const subscribeBills = (month, cb, onErr) => listen(query(collection(db, 'bills'), where('month', '==', month)), cb, onErr)
export const subscribeBillPayments = (month, cb, onErr) => listen(query(collection(db, 'billPayments'), where('month', '==', month)), cb, onErr)

const billBody = (b) => ({ name: b.name.trim(), type: b.type, amount: round2(b.amount), dueDate: b.dueDate, month: b.month, splitMethod: b.splitMethod, note: (b.note || '').trim(), status: 'active' })

export async function addBill(b) {
  const errs = validateBill(b)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  await assertMonthOpen(b.month)
  const r = await addDoc(collection(db, 'bills'), { ...billBody(b), ...createStamp() })
  await audit({ action: 'create', entity: 'bill', entityId: r.id, month: b.month, after: billBody(b), summary: `Bill ${b.name}` })
  return r.id
}

export async function updateBill(before, b) {
  const full = { ...b, month: before.month }
  const errs = validateBill(full)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  await assertMonthOpen(before.month)
  await updateDoc(doc(db, 'bills', before.id), { ...billBody(full), status: before.status, createdAt: before.createdAt, createdBy: before.createdBy ?? null, ...updateStamp() })
  await audit({ action: 'update', entity: 'bill', entityId: before.id, month: before.month, before: { amount: before.amount, splitMethod: before.splitMethod }, after: billBody(full), summary: `Bill ${before.name}: ${before.amount} → ${b.amount}` })
}

export async function voidBill(before) {
  await assertMonthOpen(before.month)
  await updateDoc(doc(db, 'bills', before.id), { status: 'void', ...updateStamp() })
  await audit({ action: 'void', entity: 'bill', entityId: before.id, month: before.month, before: { status: before.status }, after: { status: 'void' }, summary: `Voided bill ${before.name}` })
}

export async function addBillPayment(p) {
  const errs = validateBillPayment(p)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  const month = monthOf(p.date)
  await assertMonthOpen(month)
  const data = { billId: p.billId, memberId: p.memberId, amount: round2(p.amount), date: p.date, month, method: p.method, note: (p.note || '').trim(), status: 'active', ...createStamp() }
  const r = await addDoc(collection(db, 'billPayments'), data)
  await audit({ action: 'create', entity: 'billPayment', entityId: r.id, month, after: data, summary: `Bill payment ${data.amount}` })
  return r.id
}

export async function voidBillPayment(before) {
  await assertMonthOpen(before.month)
  await updateDoc(doc(db, 'billPayments', before.id), { status: 'void', ...updateStamp() })
  await audit({ action: 'void', entity: 'billPayment', entityId: before.id, month: before.month, before: { status: before.status, amount: before.amount }, after: { status: 'void' }, summary: 'Voided bill payment' })
}

import { collection, doc, runTransaction, updateDoc, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { AppError, assertMonthOpen, audit, createStamp, listen, updateStamp } from './common'
import { hasErrors, validateDeposit } from '../lib/validators'
import { monthOf } from '../lib/dates'
import { round2 } from '../lib/calc'

export const subscribeDeposits = (month, cb, onErr) => listen(query(collection(db, 'deposits'), where('month', '==', month)), cb, onErr)

const body = (d) => ({
  memberId: d.memberId, amount: round2(d.amount), date: d.date, month: monthOf(d.date),
  method: d.method, note: (d.note || '').trim(), status: 'active',
})

/** Creates DEP-YYYYMMDD-NNN. The per-day counter is bumped inside the same transaction, so ids never collide. */
export async function addDeposit(d) {
  const errs = validateDeposit(d)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  await assertMonthOpen(monthOf(d.date))
  const ymd = d.date.replaceAll('-', '')
  const id = await runTransaction(db, async (tx) => {
    const counterRef = doc(db, 'counters', `deposit-${ymd}`)
    const snap = await tx.get(counterRef)
    const n = snap.exists() ? snap.data().n + 1 : 1
    const newId = `DEP-${ymd}-${String(n).padStart(3, '0')}`
    tx.set(counterRef, { n })
    tx.set(doc(db, 'deposits', newId), { ...body(d), ...createStamp() })
    return newId
  })
  await audit({ action: 'create', entity: 'deposit', entityId: id, month: monthOf(d.date), after: body(d), summary: `Deposit ${id}` })
  return id
}

export async function updateDeposit(before, d) {
  const errs = validateDeposit(d)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  await assertMonthOpen(before.month, monthOf(d.date))
  const { status } = before
  await updateDoc(doc(db, 'deposits', before.id), { ...body(d), status, createdAt: before.createdAt, createdBy: before.createdBy ?? null, ...updateStamp() })
  await audit({ action: 'update', entity: 'deposit', entityId: before.id, month: before.month, before: { amount: before.amount, date: before.date, method: before.method }, after: body(d), summary: `Deposit ${before.id} amount ${before.amount} → ${d.amount}` })
}

export async function voidDeposit(before, reason = '') {
  await assertMonthOpen(before.month)
  await updateDoc(doc(db, 'deposits', before.id), { status: 'void', voidReason: reason, ...updateStamp() })
  await audit({ action: 'void', entity: 'deposit', entityId: before.id, month: before.month, before: { status: before.status, amount: before.amount }, after: { status: 'void' }, summary: `Voided ${before.id}` })
}

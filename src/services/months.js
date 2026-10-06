import { collection, doc, getDoc, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { AppError, audit, listen, session, updateStamp } from './common'
import { DEFAULT_CUTOFFS, DEFAULT_GUEST_WEIGHTS } from '../config'
import { hasErrors, validateManager } from '../lib/validators'
import { carryForward, settlementRows } from '../lib/calc'
import { monthEnd, monthStart } from '../lib/dates'

export const subscribeSettings = (month, cb, onErr) => listen(doc(db, 'monthlySettings', month), cb, onErr)
export const subscribeManagers = (cb, onErr) => listen(collection(db, 'monthlyManagers'), cb, onErr)
export const subscribeSettlements = (month, cb, onErr) => listen(query(collection(db, 'monthlySettlements'), where('month', '==', month)), cb, onErr)

/** Create the month's settings document (with defaults) if it does not exist yet. */
export async function ensureSettings(month) {
  const ref = doc(db, 'monthlySettings', month)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()
  const data = { month, cutoffs: DEFAULT_CUTOFFS, guestWeights: DEFAULT_GUEST_WEIGHTS, locked: false, createdAt: serverTimestamp(), ...updateStamp() }
  await setDoc(ref, data)
  return data
}

export async function saveMealSettings(month, { cutoffs, guestWeights }) {
  for (const k of Object.keys(DEFAULT_CUTOFFS)) {
    if (!Number.isFinite(cutoffs[k]) || cutoffs[k] < 0 || cutoffs[k] > 1439) throw new AppError('Enter a valid cutoff time for every meal.')
  }
  const w = guestWeights.filter((g) => g.label.trim())
  if (!w.length || w.some((g) => !(g.weight > 0 && g.weight <= 3))) throw new AppError('Guest weights must be between 0 and 3.')
  await ensureSettings(month)
  await updateDoc(doc(db, 'monthlySettings', month), { cutoffs, guestWeights: w.map((g) => ({ label: g.label.trim(), weight: Number(g.weight) })), ...updateStamp() })
  await audit({ action: 'update', entity: 'settings', entityId: month, month, after: { cutoffs, guestWeights: w }, summary: 'Meal settings changed' })
}

export async function saveActualCash(month, amount) {
  await ensureSettings(month)
  const clear = amount === '' || amount === null
  if (!clear && !(Number(amount) >= 0)) throw new AppError('Cash cannot be negative.')
  await updateDoc(doc(db, 'monthlySettings', month), clear
    ? { actualCash: null, actualCashAt: null, actualCashBy: null, ...updateStamp() }
    : { actualCash: Number(amount), actualCashAt: serverTimestamp(), actualCashBy: session.memberId || session.uid, ...updateStamp() })
}

/** Admin only (rules): opening balances/cash for the very first month, before any settlement exists. */
export async function saveOpening(month, { openingCash, openingBalances }) {
  await ensureSettings(month)
  await updateDoc(doc(db, 'monthlySettings', month), { openingCash: Number(openingCash) || 0, openingBalances, ...updateStamp() })
  await audit({ action: 'update', entity: 'settings', entityId: month, month, after: { openingCash, openingBalances }, summary: 'Opening balances set' })
}

export async function assignManager({ month, memberId, startDate, endDate }) {
  const errs = validateManager({ month, memberId, startDate, endDate })
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  const ref = doc(db, 'monthlyManagers', month)
  const existing = await getDoc(ref)
  await setDoc(ref, {
    month, memberId, startDate, endDate, assignedBy: session.memberId || session.uid,
    createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(), updatedAt: serverTimestamp(),
  })
  await audit({ action: existing.exists() ? 'update' : 'create', entity: 'manager', entityId: month, month, before: existing.exists() ? { memberId: existing.data().memberId } : null, after: { memberId }, summary: `Manager for ${month}` })
}
export const defaultManagerDates = (month) => ({ startDate: monthStart(month), endDate: monthEnd(month) })

/**
 * Generate the settlement snapshot, store each member's row, record closing cash,
 * and (when `lock` is true) lock the month – all in one atomic batch.
 */
export async function generateSettlement(month, result, { lock = false, openingCash = 0 } = {}) {
  await ensureSettings(month)
  const batch = writeBatch(db)
  settlementRows(result).forEach((row) => {
    batch.set(doc(db, 'monthlySettlements', `${month}_${row.memberId}`), { month, ...row, generatedAt: serverTimestamp(), generatedBy: session.memberId || session.uid })
  })
  const cf = carryForward(result)
  const patch = { closingCash: cf.cash, openingCashUsed: openingCash, settlementGeneratedAt: serverTimestamp(), ...updateStamp() }
  if (lock) Object.assign(patch, { locked: true, lockedAt: serverTimestamp(), lockedBy: session.memberId || session.uid })
  batch.update(doc(db, 'monthlySettings', month), patch)
  await batch.commit()
  await audit({ action: lock ? 'close' : 'settle', entity: 'month', entityId: month, month, after: { closingCash: cf.cash }, summary: lock ? `Closed ${month}` : `Settlement generated for ${month}` })
}

/** Admin only (rules). Settlements are kept, and are overwritten the next time the month is settled. */
export async function reopenMonth(month) {
  await updateDoc(doc(db, 'monthlySettings', month), { locked: false, reopenedAt: serverTimestamp(), reopenedBy: session.memberId || session.uid, ...updateStamp() })
  await audit({ action: 'reopen', entity: 'month', entityId: month, month, summary: `Reopened ${month}` })
}

import { addDoc, collection, doc, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { listen, session } from './common'

export const TYPES = ['low_balance', 'deposit_due', 'bill_due', 'meal_deadline', 'large_expense']

export const subscribeNotifications = (memberId, cb, onErr) => {
  if (!memberId) { cb([]); return () => {} }
  return listen(
    query(collection(db, 'notifications'), where('memberId', '==', memberId), orderBy('createdAt', 'desc')),
    cb, onErr,
  )
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, 'notifications', id), { read: true, readAt: serverTimestamp() })
}

export async function pushNotification({ memberId, type, title, body, dedupeKey }) {
  if (!memberId || !TYPES.includes(type)) return null
  const data = {
    memberId, type, title, body,
    read: false, dedupeKey: dedupeKey || null,
    createdAt: serverTimestamp(), createdBy: session.memberId || session.uid || null,
  }
  const r = await addDoc(collection(db, 'notifications'), data)
  return r.id
}

/**
 * Pure trigger evaluation from already-loaded month data.
 * Returns descriptors the UI can persist (with dedupe) or show ephemerally.
 */
export function evaluateTriggers({ members = [], result, cutoffs = {}, now = new Date() } = {}) {
  const out = []
  if (!result) return out
  // Low balance (< 500 remaining)
  Object.values(result.byMember || {}).forEach((m) => {
    if (m.finalBalance < 500) {
      out.push({
        memberId: m.memberId, type: 'low_balance',
        title: 'Low balance',
        body: `Remaining ${Math.round(m.finalBalance)} — consider a deposit.`,
        dedupeKey: `low_balance:${result.month}:${m.memberId}`,
      })
    }
  })
  // Unpaid / partial bills
  ;(result.bills || []).forEach((b) => {
    b.perMember.forEach((p) => {
      if (p.remaining > 0) {
        out.push({
          memberId: p.memberId, type: 'bill_due',
          title: `${b.name} due`,
          body: `${Math.round(p.remaining)} still due.`,
          dedupeKey: `bill_due:${b.id}:${p.memberId}`,
        })
      }
    })
  })
  // Large expenses (> 5000 single item)
  return out
}

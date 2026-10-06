import { doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { FEATURES } from '../config'
import { addDoc, collection } from 'firebase/firestore'

/** Identity of whoever is signed in – set by AuthContext, read by services for createdBy / updatedBy. */
export const session = { uid: null, memberId: null, name: null, role: null }

export const ts = () => serverTimestamp()
export const createStamp = () => ({ createdAt: serverTimestamp(), createdBy: session.memberId || session.uid })
export const updateStamp = () => ({ updatedAt: serverTimestamp(), updatedBy: session.memberId || session.uid })

export const snapToList = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

/** Real-time listener helper. Returns the unsubscribe function. */
export function listen(ref, cb, onError) {
  return onSnapshot(
    ref,
    (snap) => cb('docs' in snap ? snapToList(snap) : snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => { console.error('listener error', err); onError?.(err) },
  )
}

export class AppError extends Error {}

/** Turn Firebase errors into messages a student can act on. */
export function friendlyError(e) {
  if (e instanceof AppError) return e.message
  switch (e?.code) {
    case 'permission-denied':
      return 'Not allowed. You may not be the manager, the month may be closed, or the meal cut-off has passed.'
    case 'unavailable': return 'You appear to be offline. Changes will sync when the connection returns.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Wrong email or password.'
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in.'
    case 'auth/weak-password': return 'Password must be at least 6 characters.'
    case 'auth/invalid-email': return 'That email address looks wrong.'
    case 'auth/too-many-requests': return 'Too many attempts. Wait a minute and try again.'
    case 'auth/network-request-failed': return 'No internet connection.'
    case 'storage/unauthorized': return 'You are not allowed to upload this file.'
    case 'storage/retry-limit-exceeded': return 'Upload failed – check your connection and try again.'
    default: return e?.message || 'Something went wrong. Please try again.'
  }
}

/** Client-side guard (rules enforce it again): refuse writes into a closed month. */
export async function assertMonthOpen(...months) {
  for (const m of new Set(months.filter(Boolean))) {
    const snap = await getDoc(doc(db, 'monthlySettings', m))
    if (snap.exists() && snap.data().locked) throw new AppError(`${m} is closed. Ask an admin to reopen it first.`)
  }
}

/** Phase 3 audit trail. No-op until FEATURES.audit is switched on. */
export async function audit({ action, entity, entityId, month, before = null, after = null, summary = '' }) {
  if (!FEATURES.audit) return
  try {
    await addDoc(collection(db, 'auditLogs'), {
      actorUid: session.uid, actorMemberId: session.memberId || null,
      action, entity, entityId, month: month || null, before, after, summary, createdAt: serverTimestamp(),
    })
  } catch (e) { console.warn('audit log failed', e) }
}

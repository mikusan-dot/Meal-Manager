import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase'
import { AppError, audit, createStamp, listen, snapToList, updateStamp } from './common'
import { shrinkImage } from '../lib/image'
import { validateMember, hasErrors } from '../lib/validators'

export const subscribeMembers = (cb, onErr) => listen(collection(db, 'members'), cb, onErr)
export const subscribeUsers = (cb, onErr) => listen(collection(db, 'users'), cb, onErr)

const clean = (m) => ({
  name: m.name.trim(),
  phone: m.phone.trim(),
  email: m.email.trim().toLowerCase(),
  roomNumber: m.roomNumber.trim(),
  photoUrl: m.photoUrl || '',
  joinDate: m.joinDate,
  leaveDate: m.leaveDate || null,
  status: m.status || 'active',
})

export async function createMember(m) {
  const errs = validateMember(m)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  const email = m.email.trim().toLowerCase()
  const dup = await getDocs(query(collection(db, 'members'), where('email', '==', email)))
  if (!dup.empty) throw new AppError('A member with this email already exists.')
  const data = { ...clean(m), uid: null, ...createStamp() }
  const r = await addDoc(collection(db, 'members'), data)
  await audit({ action: 'create', entity: 'member', entityId: r.id, after: clean(m), summary: `Added member ${m.name}` })
  return r.id
}

export async function updateMember(id, m, before) {
  const errs = validateMember(m)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  await updateDoc(doc(db, 'members', id), { ...clean(m), uid: before?.uid ?? null, ...updateStamp() })
  await audit({ action: 'update', entity: 'member', entityId: id, before, after: clean(m), summary: `Edited member ${m.name}` })
}

/** Members are never erased – leaving or deactivating keeps their financial history. */
export async function setMemberStatus(member, status, leaveDate) {
  await updateDoc(doc(db, 'members', member.id), {
    status, leaveDate: status === 'inactive' ? leaveDate || member.leaveDate || null : null, ...updateStamp(),
  })
  await audit({ action: status === 'inactive' ? 'deactivate' : 'reactivate', entity: 'member', entityId: member.id, before: { status: member.status }, after: { status }, summary: `${member.name} → ${status}` })
}

/** Members may edit only their own phone and photo (enforced by rules). */
export const updateOwnProfile = (id, { phone, photoUrl }) =>
  updateDoc(doc(db, 'members', id), { phone: phone.trim(), ...(photoUrl !== undefined ? { photoUrl } : {}), ...updateStamp() })

export async function uploadProfilePhoto(memberId, file) {
  if (!storage) throw new AppError('Photo upload is not enabled for this project.')
  const blob = await shrinkImage(file, 512, 0.85)
  const r = ref(storage, `profiles/${memberId}/photo-${Date.now()}.jpg`)
  await uploadBytes(r, blob, { contentType: blob.type || 'image/jpeg' })
  return getDownloadURL(r)
}

/** First sign-in of a pre-registered member: attach the Auth account to their profile. */
export async function findMemberByEmail(email) {
  const snap = await getDocs(query(collection(db, 'members'), where('email', '==', email.toLowerCase())))
  return snapToList(snap)[0] || null
}

export async function claimMember(user, member) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'members', member.id), { uid: user.uid })
  batch.set(doc(db, 'users', user.uid), { email: user.email.toLowerCase(), role: 'member', memberId: member.id, createdAt: serverTimestamp() })
  await batch.commit()
}

/** The very first account becomes admin and gets its own member profile. */
export async function bootstrapAdmin(user, profile) {
  const errs = validateMember({ ...profile, email: user.email })
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  const memberRef = doc(collection(db, 'members'))
  const batch = writeBatch(db)
  batch.set(doc(db, 'config', 'bootstrap'), { uid: user.uid, createdAt: serverTimestamp() })
  batch.set(doc(db, 'users', user.uid), { email: user.email.toLowerCase(), role: 'admin', memberId: memberRef.id, createdAt: serverTimestamp() })
  batch.set(memberRef, { ...clean({ ...profile, email: user.email }), uid: user.uid, createdAt: serverTimestamp(), createdBy: user.uid })
  await batch.commit()
}

export async function setAdminRole(memberId, makeAdmin) {
  const snap = await getDocs(query(collection(db, 'users'), where('memberId', '==', memberId)))
  if (snap.empty) throw new AppError('This member has not signed in yet, so they have no account to promote.')
  await updateDoc(snap.docs[0].ref, { role: makeAdmin ? 'admin' : 'member' })
  await audit({ action: 'role', entity: 'user', entityId: snap.docs[0].id, after: { role: makeAdmin ? 'admin' : 'member' }, summary: makeAdmin ? 'Made admin' : 'Removed admin' })
}

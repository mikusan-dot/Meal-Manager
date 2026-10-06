import { addDoc, collection, doc, query, updateDoc, where } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase'
import { AppError, assertMonthOpen, audit, createStamp, listen, updateStamp } from './common'
import { hasErrors, validateExpense } from '../lib/validators'
import { monthOf } from '../lib/dates'
import { round2 } from '../lib/calc'
import { shrinkImage } from '../lib/image'

export const subscribeExpenses = (month, cb, onErr) => listen(query(collection(db, 'expenses'), where('month', '==', month)), cb, onErr)

export async function uploadReceipt(month, file) {
  if (!storage) throw new AppError('Receipt upload is not enabled for this project.')
  const blob = await shrinkImage(file)
  const path = `receipts/${month}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const r = ref(storage, path)
  await uploadBytes(r, blob, { contentType: blob.type || 'image/jpeg' })
  return { receiptUrl: await getDownloadURL(r), receiptPath: path }
}

const body = (x) => ({
  itemName: x.itemName.trim(), quantity: Number(x.quantity), unitPrice: Number(x.unitPrice),
  totalPrice: round2(Number(x.quantity) * Number(x.unitPrice)), // always derived – never typed in
  date: x.date, month: monthOf(x.date), vendor: (x.vendor || '').trim(), category: x.category,
  paymentMethod: x.paymentMethod, note: (x.note || '').trim(), status: 'active',
})

export async function addExpense(x, receiptFile) {
  const errs = validateExpense(x)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  const month = monthOf(x.date)
  await assertMonthOpen(month)
  const receipt = receiptFile ? await uploadReceipt(month, receiptFile) : {}
  const data = { ...body(x), ...receipt, ...createStamp() }
  const r = await addDoc(collection(db, 'expenses'), data)
  await audit({ action: 'create', entity: 'expense', entityId: r.id, month, after: body(x), summary: `Expense ${x.itemName} ${data.totalPrice}` })
  return r.id
}

export async function updateExpense(before, x, receiptFile) {
  const errs = validateExpense(x)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  const month = monthOf(x.date)
  await assertMonthOpen(before.month, month)
  const receipt = receiptFile ? await uploadReceipt(month, receiptFile) : { receiptUrl: before.receiptUrl || '', receiptPath: before.receiptPath || '' }
  const data = { ...body(x), ...receipt, status: before.status, createdAt: before.createdAt, createdBy: before.createdBy ?? null, ...updateStamp() }
  await updateDoc(doc(db, 'expenses', before.id), data)
  await audit({ action: 'update', entity: 'expense', entityId: before.id, month: before.month, before: { itemName: before.itemName, totalPrice: before.totalPrice, quantity: before.quantity, unitPrice: before.unitPrice }, after: body(x), summary: `Expense ${before.itemName}: ${before.totalPrice} → ${data.totalPrice}` })
}

export async function voidExpense(before, reason = '') {
  await assertMonthOpen(before.month)
  await updateDoc(doc(db, 'expenses', before.id), { status: 'void', voidReason: reason, ...updateStamp() })
  await audit({ action: 'void', entity: 'expense', entityId: before.id, month: before.month, before: { status: before.status, totalPrice: before.totalPrice }, after: { status: 'void' }, summary: `Voided expense ${before.itemName}` })
}

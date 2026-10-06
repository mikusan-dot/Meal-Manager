import { addDoc, collection, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { AppError, audit, createStamp, listen, updateStamp, session } from './common'
import { hasErrors, validateInventory, validateShopping } from '../lib/validators'

export const subscribeInventory = (cb, onErr) => listen(collection(db, 'inventory'), cb, onErr)
export const subscribeShopping = (cb, onErr) => listen(collection(db, 'shoppingList'), cb, onErr)

export const isLowStock = (item) => Number(item.currentStock) < Number(item.minStock)

const invBody = (x) => ({
  name: x.name.trim(),
  unit: x.unit.trim(),
  currentStock: Number(x.currentStock) || 0,
  minStock: Number(x.minStock) || 0,
})

export async function addInventoryItem(x) {
  const errs = validateInventory(x)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  const r = await addDoc(collection(db, 'inventory'), { ...invBody(x), ...createStamp() })
  await audit({ action: 'create', entity: 'inventory', entityId: r.id, after: invBody(x), summary: `Stock ${x.name}` })
  return r.id
}

export async function updateInventoryItem(before, x) {
  const errs = validateInventory(x)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  await updateDoc(doc(db, 'inventory', before.id), {
    ...invBody(x), createdAt: before.createdAt, createdBy: before.createdBy ?? null, ...updateStamp(),
  })
  await audit({
    action: 'update', entity: 'inventory', entityId: before.id,
    before: { currentStock: before.currentStock, minStock: before.minStock },
    after: invBody(x), summary: `Stock ${before.name}: ${before.currentStock} → ${x.currentStock}`,
  })
}

export async function adjustStock(item, delta, reason = '') {
  const next = Math.max(0, Number(item.currentStock) + Number(delta))
  await updateDoc(doc(db, 'inventory', item.id), { currentStock: next, ...updateStamp() })
  await audit({
    action: Number(delta) >= 0 ? 'stock_in' : 'stock_out', entity: 'inventory', entityId: item.id,
    before: { currentStock: item.currentStock }, after: { currentStock: next },
    summary: `${item.name} ${delta >= 0 ? '+' : ''}${delta}${reason ? ` (${reason})` : ''}`,
  })
  return next
}

const shopBody = (x, addedBy) => ({
  item: x.item.trim(),
  qty: Number(x.qty) || 1,
  unit: (x.unit || '').trim(),
  addedBy,
  done: false,
})

export async function addShoppingItem(x) {
  const errs = validateShopping(x)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  if (!session.memberId) throw new AppError('Your account is not linked to a member profile yet.')
  const r = await addDoc(collection(db, 'shoppingList'), { ...shopBody(x, session.memberId), ...createStamp() })
  return r.id
}

export async function toggleShoppingItem(item) {
  await updateDoc(doc(db, 'shoppingList', item.id), { done: !item.done, ...updateStamp() })
}

export async function removeShoppingItem(item) {
  await deleteDoc(doc(db, 'shoppingList', item.id))
}

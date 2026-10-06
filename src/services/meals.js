import { addDoc, collection, deleteDoc, doc, query, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { AppError, assertMonthOpen, audit, createStamp, listen, ts, session } from './common'
import { hasErrors, validateGuestMeal, validateMealEntry } from '../lib/validators'
import { monthOf } from '../lib/dates'

export const subscribeMeals = (month, cb, onErr) => listen(query(collection(db, 'meals'), where('month', '==', month)), cb, onErr)
export const subscribeGuestMeals = (month, cb, onErr) => listen(query(collection(db, 'guestMeals'), where('month', '==', month)), cb, onErr)

export const mealDocId = (memberId, date) => `${memberId}_${date}`

/** One document per member per day, so duplicate entries are impossible. Writing replaces the day. */
export async function saveMeal({ memberId, date, breakfast, lunch, dinner }, before) {
  const entry = { memberId, date, breakfast: !!breakfast, lunch: !!lunch, dinner: !!dinner }
  const errs = validateMealEntry(entry)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  const month = monthOf(date)
  await assertMonthOpen(month)
  await setDoc(doc(db, 'meals', mealDocId(memberId, date)), { ...entry, month, updatedAt: ts(), updatedBy: session.memberId || session.uid })
  if (before && session.memberId !== memberId) {
    await audit({ action: 'correct', entity: 'meal', entityId: mealDocId(memberId, date), month, before: { b: !!before.breakfast, l: !!before.lunch, d: !!before.dinner }, after: { b: entry.breakfast, l: entry.lunch, d: entry.dinner }, summary: `Meal corrected for ${date}` })
  }
}

export async function addGuestMeal(g) {
  const errs = validateGuestMeal(g)
  if (hasErrors(errs)) throw new AppError(Object.values(errs)[0])
  const month = monthOf(g.date)
  await assertMonthOpen(month)
  const data = { memberId: g.memberId, guestName: g.guestName.trim(), date: g.date, month, mealType: g.mealType, weight: Number(g.weight), ...createStamp() }
  const r = await addDoc(collection(db, 'guestMeals'), data)
  return r.id
}

export async function removeGuestMeal(g) {
  await assertMonthOpen(g.month)
  await deleteDoc(doc(db, 'guestMeals', g.id))
  await audit({ action: 'delete', entity: 'guestMeal', entityId: g.id, month: g.month, before: { guestName: g.guestName, weight: g.weight, mealType: g.mealType }, summary: `Removed guest ${g.guestName}` })
}

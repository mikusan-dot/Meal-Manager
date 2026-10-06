import { nowMinutes, todayStr } from './dates'

/** Can a regular member still change this meal? (Managers can always correct meals.) */
export function isMealOpen(date, mealKey, cutoffs, today = todayStr(), minutes = nowMinutes()) {
  if (date > today) return true
  if (date < today) return false
  return minutes < (cutoffs?.[mealKey] ?? 0)
}
export const isDayClosed = (date, cutoffs, mealKeys = ['breakfast', 'lunch', 'dinner']) =>
  mealKeys.every((k) => !isMealOpen(date, k, cutoffs))

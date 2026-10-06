import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { subscribeMembers } from '../services/members'
import { subscribeDeposits } from '../services/deposits'
import { subscribeExpenses } from '../services/expenses'
import { subscribeGuestMeals, subscribeMeals } from '../services/meals'
import { subscribeBillPayments, subscribeBills } from '../services/bills'
import { subscribeInventory, subscribeShopping } from '../services/inventory'
import { subscribeNotifications } from '../services/notifications'
import { subscribeManagers, subscribeSettings, subscribeSettlements } from '../services/months'
import { computeMonth, cashCheck } from '../lib/calc'
import { currentMonthKey, prevMonth } from '../lib/dates'
import { DEFAULT_CUTOFFS, DEFAULT_GUEST_WEIGHTS } from '../config'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

/** Subscribe to something and expose [data, loading]. `undefined` data = still loading. */
function useLive(subscribe, deps) {
  const [data, setData] = useState(undefined)
  const [error, setError] = useState(null)
  useEffect(() => {
    setData(undefined)
    setError(null)
    return subscribe(setData, setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return [data, error]
}

const byOpening = (settlements, pick) => {
  const out = {}
  settlements.forEach((s) => { out[s.memberId] = pick(s) })
  return out
}

/**
 * Real-time data for the selected month. Every figure in the app comes from `result`,
 * which is recomputed whenever any underlying record changes.
 */
export function DataProvider({ children }) {
  const { profile } = useAuth()
  const [month, setMonthState] = useState(() => {
    try { return sessionStorage.getItem('mm.month') || currentMonthKey() } catch { return currentMonthKey() }
  })
  const setMonth = (m) => { setMonthState(m); try { sessionStorage.setItem('mm.month', m) } catch { /* private mode */ } }
  const prev = prevMonth(month)

  const [members, e1] = useLive(subscribeMembers, [])
  const [managers, e2] = useLive(subscribeManagers, [])
  const [deposits, e3] = useLive((cb, er) => subscribeDeposits(month, cb, er), [month])
  const [expenses, e4] = useLive((cb, er) => subscribeExpenses(month, cb, er), [month])
  const [meals, e5] = useLive((cb, er) => subscribeMeals(month, cb, er), [month])
  const [guestMeals, e6] = useLive((cb, er) => subscribeGuestMeals(month, cb, er), [month])
  const [bills, e7] = useLive((cb, er) => subscribeBills(month, cb, er), [month])
  const [billPayments, e8] = useLive((cb, er) => subscribeBillPayments(month, cb, er), [month])
  const [settings, e9] = useLive((cb, er) => subscribeSettings(month, cb, er), [month])
  const [settlements, e10] = useLive((cb, er) => subscribeSettlements(month, cb, er), [month])
  const [prevSettings, e11] = useLive((cb, er) => subscribeSettings(prev, cb, er), [prev])
  const [prevSettlements, e12] = useLive((cb, er) => subscribeSettlements(prev, cb, er), [prev])
  const [inventory, e13] = useLive((cb, er) => subscribeInventory(cb, er), [])
  const [shopping, e14] = useLive((cb, er) => subscribeShopping(cb, er), [])
  const memberId = profile?.memberId || null
  const [notifications, e15] = useLive((cb, er) => subscribeNotifications(memberId, cb, er), [memberId])

  const error = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11 || e12 || e13 || e14 || e15
  const loading = [members, managers, deposits, expenses, meals, guestMeals, bills, billPayments, settings, settlements, prevSettings, prevSettlements, inventory, shopping, notifications].some((x) => x === undefined)

  const value = useMemo(() => {
    if (loading) return { month, setMonth, loading: true, error, members: members || [], managers: {} }

    const managerByMonth = Object.fromEntries(managers.map((m) => [m.id, m]))
    const locked = !!settings?.locked
    const cutoffs = { ...DEFAULT_CUTOFFS, ...(settings?.cutoffs || {}) }
    const guestWeights = settings?.guestWeights?.length ? settings.guestWeights : DEFAULT_GUEST_WEIGHTS

    // Opening balance: frozen copy when this month is closed, otherwise last month's settlement,
    // otherwise the admin's manual opening balances (first month only).
    let openingSource = 'none'
    let opening = {}
    if (locked && settlements.length) {
      opening = byOpening(settlements, (s) => ({ meal: s.openingMeal ?? 0, bill: s.openingBill ?? 0 }))
      openingSource = 'frozen'
    } else if (prevSettlements.length) {
      opening = byOpening(prevSettlements, (s) => ({ meal: s.mealBalance ?? 0, bill: s.billBalance ?? 0 }))
      openingSource = 'previous'
    } else if (settings?.openingBalances) {
      opening = settings.openingBalances
      openingSource = 'manual'
    }
    const openingStale = openingSource === 'previous' && !prevSettings?.locked
    const openingCash = locked && settings?.openingCashUsed != null
      ? settings.openingCashUsed
      : prevSettlements.length && prevSettings?.closingCash != null ? prevSettings.closingCash : Number(settings?.openingCash) || 0

    const result = computeMonth({ month, members, deposits, expenses, meals, guestMeals, bills, billPayments, opening, openingCash })
    const cash = cashCheck(result.cash.expected, settings?.actualCash)

    const me = members.find((m) => m.id === profile?.memberId) || null
    const manager = managerByMonth[month] || null
    const isAdmin = profile?.role === 'admin'
    const isManager = !!manager && manager.memberId === profile?.memberId
    const canManage = isAdmin || isManager
    const nowManager = managerByMonth[currentMonthKey()]
    const isStaffNow = isAdmin || (!!nowManager && nowManager.memberId === profile?.memberId)
    const lowStock = (inventory || []).filter((i) => Number(i.currentStock) < Number(i.minStock))

    return {
      month, setMonth, loading: false, error,
      members, managers: managerByMonth, deposits, expenses, meals, guestMeals, bills, billPayments,
      inventory: inventory || [], shopping: shopping || [], lowStock,
      notifications: notifications || [], unreadCount: (notifications || []).filter((n) => !n.read).length,
      settings, settlements, prevSettlements, prevSettings,
      cutoffs, guestWeights, locked,
      opening, openingSource, openingStale, openingCash,
      result, cash,
      me, manager, managerMember: manager ? members.find((m) => m.id === manager.memberId) || null : null,
      isAdmin, isManager, canManage, isStaffNow,
      /** Financial records of the selected month can be added/edited right now. */
      canEdit: canManage && !locked,
    }
  }, [loading, month, error, members, managers, deposits, expenses, meals, guestMeals, bills, billPayments, settings, settlements, prevSettlements, prevSettings, inventory, shopping, notifications, profile])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const memberName = (members, id) => members.find((m) => m.id === id)?.name || 'Unknown member'

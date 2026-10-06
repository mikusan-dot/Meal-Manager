import { monthEnd, monthStart, presentDays } from './dates'

/**
 * Pure calculation engine. Nothing here touches Firebase, so every number the app shows
 * (meal rate, balances, bill shares, settlement) is derived from raw records every time
 * and can be unit-tested. Meal balance and bill balance are never mixed internally.
 */

// Half-paisa rounds up (away from zero); the 1e-7 nudge defeats float artefacts like 214.275 → 214.27499…
export const round2 = (n) => {
  const v = Number(n) || 0
  return (Math.sign(v) * Math.round(Math.abs(v) * 100 + 1e-7)) / 100
}
const floor2 = (n) => Math.floor(Number(n) * 100 + 1e-7) / 100
const EPS = 0.005

const live = (r) => r && r.status !== 'void'

export const mealsInEntry = (m) => (m.breakfast ? 1 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0)

/** Split `amount` by weights to the paisa; the leftover paisa goes to the heaviest weight. */
export function distribute(amount, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  if (!weights.length || total <= 0) return weights.map(() => 0)
  const shares = weights.map((w) => floor2((amount * w) / total))
  const residual = round2(amount - shares.reduce((a, b) => a + b, 0))
  if (residual > 0) {
    let idx = 0
    weights.forEach((w, i) => { if (w > weights[idx]) idx = i })
    shares[idx] = round2(shares[idx] + residual)
  }
  return shares
}

export function billStatus(share, paid) {
  if (share <= EPS) return 'paid'
  if (paid >= share - EPS) return 'paid'
  if (paid > EPS) return 'partial'
  return 'unpaid'
}

/**
 * @param {object} i
 * @param {string} i.month         "YYYY-MM"
 * @param {Array}  i.members       member docs (id, joinDate, leaveDate …)
 * @param {Array}  i.deposits      {memberId, amount, status}
 * @param {Array}  i.expenses      {totalPrice, status, category, date}
 * @param {Array}  i.meals         {memberId, breakfast, lunch, dinner}
 * @param {Array}  i.guestMeals    {memberId, weight}
 * @param {Array}  i.bills         {id, amount, splitMethod, status}
 * @param {Array}  i.billPayments  {billId, memberId, amount, status}
 * @param {Object} i.opening       { [memberId]: { meal, bill } } carried from previous month
 * @param {number} i.openingCash   cash carried from previous month
 */
export function computeMonth({
  month, members = [], deposits = [], expenses = [], meals = [], guestMeals = [],
  bills = [], billPayments = [], opening = {}, openingCash = 0,
}) {
  const dep = deposits.filter(live)
  const exp = expenses.filter(live)
  const activeBills = bills.filter(live)
  const billIds = new Set(activeBills.map((b) => b.id))
  const pays = billPayments.filter((p) => live(p) && billIds.has(p.billId))

  const totalDeposits = round2(dep.reduce((s, d) => s + Number(d.amount || 0), 0))
  const totalExpenses = round2(exp.reduce((s, e) => s + Number(e.totalPrice || 0), 0))

  // meals
  const ownMeals = {}
  meals.forEach((m) => { ownMeals[m.memberId] = (ownMeals[m.memberId] || 0) + mealsInEntry(m) })
  const guestW = {}
  guestMeals.forEach((g) => { guestW[g.memberId] = round2((guestW[g.memberId] || 0) + Number(g.weight || 0)) })
  const totalOwn = Object.values(ownMeals).reduce((a, b) => a + b, 0)
  const totalGuest = round2(Object.values(guestW).reduce((a, b) => a + b, 0))
  const totalMeals = round2(totalOwn + totalGuest)

  // The published meal rate is rounded to the paisa, like a notebook would show it,
  // and every member is charged exactly count × that rate.
  const mealRate = totalMeals > 0 ? round2(totalExpenses / totalMeals) : 0

  // bills – shares per bill, per member
  const roster = members.map((m) => ({ id: m.id, days: presentDays(month, m.joinDate, m.leaveDate) })).filter((m) => m.days > 0)
  const billRows = activeBills.map((b) => {
    const weights = roster.map((r) => (b.splitMethod === 'days' ? r.days : 1))
    const shares = distribute(Number(b.amount || 0), weights)
    const perMember = roster.map((r, i) => {
      const paid = round2(pays.filter((p) => p.billId === b.id && p.memberId === r.id).reduce((s, p) => s + Number(p.amount || 0), 0))
      const share = shares[i]
      return { memberId: r.id, share, paid, remaining: round2(Math.max(share - paid, 0)), overpaid: round2(Math.max(paid - share, 0)), status: billStatus(share, paid) }
    })
    const paid = round2(perMember.reduce((s, p) => s + p.paid, 0))
    const collected = round2(perMember.reduce((s, p) => s + Math.min(p.paid, p.share), 0))
    return { ...b, perMember, paid, remaining: round2(Math.max(Number(b.amount) - collected, 0)), status: billStatus(Number(b.amount), collected) }
  })

  const byMember = {}
  members.forEach((m) => {
    const op = opening[m.id] || { meal: 0, bill: 0 }
    const deposited = round2(dep.filter((d) => d.memberId === m.id).reduce((s, d) => s + Number(d.amount || 0), 0))
    const ownCount = ownMeals[m.id] || 0
    const guestCount = guestW[m.id] || 0
    const mealCount = round2(ownCount + guestCount)
    const mealCost = round2(mealCount * mealRate)
    let billShare = 0
    billRows.forEach((b) => { const r = b.perMember.find((p) => p.memberId === m.id); if (r) billShare += r.share })
    billShare = round2(billShare)
    const billPaid = round2(pays.filter((p) => p.memberId === m.id).reduce((s, p) => s + Number(p.amount || 0), 0))
    const openMeal = round2(op.meal || 0)
    const openBill = round2(op.bill || 0)
    const mealBalance = round2(openMeal + deposited - mealCost)
    const billBalance = round2(openBill + billPaid - billShare)
    const net = round2(mealBalance + billBalance)
    byMember[m.id] = {
      memberId: m.id,
      openingMeal: openMeal, openingBill: openBill, openingBalance: round2(openMeal + openBill),
      deposits: deposited, ownMeals: ownCount, guestMeals: guestCount, mealCount, mealRate, mealCost,
      billShare, billPayments: billPaid, mealBalance, billBalance,
      finalBalance: net,
      status: net > EPS ? 'refundable' : net < -EPS ? 'due' : 'settled',
      amount: round2(Math.abs(net)),
    }
  })

  const cashExpected = round2(openingCash + totalDeposits - totalExpenses)
  const mealCostTotal = round2(Object.values(byMember).reduce((s, m) => s + m.mealCost, 0))

  return {
    month,
    totals: {
      deposits: totalDeposits, expenses: totalExpenses, meals: totalMeals, ownMeals: totalOwn, guestMeals: totalGuest,
      mealRate, mealCost: mealCostTotal, roundingDifference: round2(totalExpenses - mealCostTotal),
      bills: round2(activeBills.reduce((s, b) => s + Number(b.amount || 0), 0)),
      billShares: round2(Object.values(byMember).reduce((s, m) => s + m.billShare, 0)),
      billPayments: round2(Object.values(byMember).reduce((s, m) => s + m.billPayments, 0)),
    },
    cash: { opening: round2(openingCash), in: totalDeposits, out: totalExpenses, expected: cashExpected },
    byMember,
    bills: billRows,
  }
}

/** Compare counted cash with expected cash. Returns null while nothing has been counted. */
export function cashCheck(expected, actual) {
  if (actual === undefined || actual === null || actual === '') return null
  const difference = round2(Number(actual) - Number(expected))
  return { expected: round2(expected), actual: round2(actual), difference, mismatch: Math.abs(difference) >= EPS }
}

/** Closing balances to carry into next month, per member and for cash. */
export function carryForward(result) {
  const members = {}
  Object.values(result.byMember).forEach((m) => { members[m.memberId] = { meal: m.mealBalance, bill: m.billBalance } })
  return { members, cash: result.cash.expected }
}

const TYPE_ORDER = { opening: 0, deposit: 1, billPayment: 2, meal: 3, bill: 4 }

/**
 * Member ledger for one month: Date | Type | Description | Amount | Balance.
 * Meal charges use the month's current meal rate, so running balances move as the rate does.
 */
export function buildStatement({ month, member, result, deposits = [], meals = [], guestMeals = [], billPayments = [] }) {
  const sum = result.byMember[member.id]
  if (!sum) return []
  const rows = []
  rows.push({ key: 'open', date: monthStart(month), type: 'opening', description: 'Brought forward from previous month', amount: sum.openingBalance })

  deposits.filter((d) => live(d) && d.memberId === member.id).forEach((d) =>
    rows.push({ key: `d-${d.id}`, date: d.date, type: 'deposit', description: `${d.method}${d.id ? ` · ${d.id}` : ''}`, amount: Number(d.amount) }))

  const perDay = {}
  meals.filter((m) => m.memberId === member.id).forEach((m) => { const c = mealsInEntry(m); if (c) (perDay[m.date] ||= { own: 0, guest: 0 }).own += c })
  guestMeals.filter((g) => g.memberId === member.id).forEach((g) => { (perDay[g.date] ||= { own: 0, guest: 0 }).guest += Number(g.weight) })
  Object.entries(perDay).forEach(([date, c]) => {
    const total = round2(c.own + c.guest)
    const desc = c.guest ? `${c.own} meal${c.own === 1 ? '' : 's'} + ${round2(c.guest)} guest` : `${c.own} meal${c.own === 1 ? '' : 's'}`
    rows.push({ key: `m-${date}`, date, type: 'meal', description: desc, amount: -round2(total * sum.mealRate), meals: total })
  })

  result.bills.forEach((b) => {
    const r = b.perMember.find((p) => p.memberId === member.id)
    if (r && r.share > 0) {
      const date = b.dueDate && b.dueDate >= monthStart(month) && b.dueDate <= monthEnd(month) ? b.dueDate : monthStart(month)
      rows.push({ key: `b-${b.id}`, date, type: 'bill', description: `${b.name} share`, amount: -r.share })
    }
  })
  billPayments.filter((p) => live(p) && p.memberId === member.id && result.bills.some((b) => b.id === p.billId)).forEach((p) => {
    const bill = result.bills.find((b) => b.id === p.billId)
    rows.push({ key: `p-${p.id}`, date: p.date, type: 'billPayment', description: `${bill.name} payment · ${p.method}`, amount: Number(p.amount) })
  })

  rows.sort((a, b) => a.date.localeCompare(b.date) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type])
  let bal = 0
  return rows.map((r) => { bal = round2(bal + r.amount); return { ...r, balance: bal } })
}

/** Rows for the settlement document (one per member) – frozen at close time. */
export function settlementRows(result) {
  return Object.values(result.byMember).map((m) => ({
    memberId: m.memberId,
    openingBalance: m.openingBalance, openingMeal: m.openingMeal, openingBill: m.openingBill,
    deposits: m.deposits, mealCount: m.mealCount, mealRate: m.mealRate, mealCost: m.mealCost,
    billShare: m.billShare, billPayments: m.billPayments,
    mealBalance: m.mealBalance, billBalance: m.billBalance,
    finalBalance: m.finalBalance, status: m.status, amount: m.amount,
  }))
}

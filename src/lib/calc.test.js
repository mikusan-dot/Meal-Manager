import { describe, expect, it } from 'vitest'
import { buildStatement, carryForward, cashCheck, computeMonth, distribute, settlementRows } from './calc'
import { presentDays, addMonths, formatMinutes } from './dates'
import { taka } from './format'
import { validateDeposit, validateExpense } from './validators'

const M = '2026-10'
const members = [
  { id: 'a', name: 'A', joinDate: '2026-01-01' },
  { id: 'b', name: 'B', joinDate: '2026-01-01' },
  { id: 'c', name: 'C', joinDate: '2026-10-16' },
]
const meal = (memberId, date, b, l, d) => ({ memberId, date, breakfast: b, lunch: l, dinner: d })

describe('meal rate and balances', () => {
  it('rate = bazar ÷ meals; member cost = meals × rate', () => {
    const r = computeMonth({
      month: M, members: members.slice(0, 2),
      expenses: [{ totalPrice: 30000 }],
      meals: [meal('a', '2026-10-01', true, true, true), meal('b', '2026-10-01', true, true, true)],
      guestMeals: [],
    })
    // 6 meals, 30000/6 = 5000
    expect(r.totals.meals).toBe(6)
    expect(r.totals.mealRate).toBe(5000)
    expect(r.byMember.a.mealCost).toBe(15000)
  })

  it('guest weights count toward total meals and are charged to the host', () => {
    const r = computeMonth({
      month: M, members: members.slice(0, 2),
      expenses: [{ totalPrice: 300 }],
      meals: [meal('a', '2026-10-01', false, true, false), meal('b', '2026-10-01', false, true, false)],
      guestMeals: [{ memberId: 'a', date: '2026-10-01', mealType: 'lunch', weight: 1 }, { memberId: 'a', date: '2026-10-02', mealType: 'lunch', weight: 0.5 }],
    })
    expect(r.totals.meals).toBe(3.5)
    expect(r.totals.mealRate).toBe(85.71)
    expect(r.byMember.a.mealCount).toBe(2.5)
    expect(r.byMember.a.mealCost).toBe(214.28)
  })

  it('settlement example: 500 + 4000 − 3200 − 700 = 600 refundable', () => {
    const r = computeMonth({
      month: M, members: [members[0]],
      deposits: [{ memberId: 'a', amount: 4000 }],
      expenses: [{ totalPrice: 3200 }],
      meals: Array.from({ length: 80 }, (_, i) => meal('a', `2026-10-${String(i % 28 + 1).padStart(2, '0')}`, true, false, false)).slice(0, 80),
      bills: [{ id: 'g', name: 'Gas', amount: 700, splitMethod: 'equal', dueDate: '2026-10-10' }],
      opening: { a: { meal: 500, bill: 0 } },
    })
    // 80 meals, rate 40 → cost 3200
    expect(r.byMember.a.mealCost).toBe(3200)
    expect(r.byMember.a.finalBalance).toBe(600)
    expect(r.byMember.a.status).toBe('refundable')
    expect(r.byMember.a.mealBalance).toBe(1300)
    expect(r.byMember.a.billBalance).toBe(-700)
  })

  it('voided records are ignored', () => {
    const r = computeMonth({ month: M, members, deposits: [{ memberId: 'a', amount: 100 }, { memberId: 'a', amount: 999, status: 'void' }], expenses: [{ totalPrice: 40 }, { totalPrice: 5, status: 'void' }] })
    expect(r.totals.deposits).toBe(100)
    expect(r.totals.expenses).toBe(40)
    expect(r.cash.expected).toBe(60)
  })

  it('no meals → rate 0, nobody is charged', () => {
    const r = computeMonth({ month: M, members, expenses: [{ totalPrice: 1000 }] })
    expect(r.totals.mealRate).toBe(0)
    expect(r.byMember.a.mealCost).toBe(0)
  })
})

describe('cash', () => {
  it('expected cash includes carried cash', () => {
    const r = computeMonth({ month: M, members, deposits: [{ memberId: 'a', amount: 1000 }], expenses: [{ totalPrice: 400 }], openingCash: 250 })
    expect(r.cash.expected).toBe(850)
  })
  it('detects mismatch', () => {
    expect(cashCheck(850, 800)).toEqual({ expected: 850, actual: 800, difference: -50, mismatch: true })
    expect(cashCheck(850, 850).mismatch).toBe(false)
    expect(cashCheck(850, '')).toBeNull()
  })
})

describe('bills', () => {
  it('equal split excludes members who were not present, shares sum exactly', () => {
    const r = computeMonth({ month: M, members, bills: [{ id: 'w', name: 'Water', amount: 100, splitMethod: 'equal', dueDate: '2026-10-05' }] })
    const shares = r.bills[0].perMember.map((p) => p.share)
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5)
    expect(shares).toHaveLength(3) // C joined mid-month but was present in Oct
  })
  it('days-present split is proportional', () => {
    const r = computeMonth({ month: M, members, bills: [{ id: 'e', name: 'Electricity', amount: 7800, splitMethod: 'days', dueDate: '2026-10-05' }] })
    const c = r.bills[0].perMember.find((p) => p.memberId === 'c').share
    const a = r.bills[0].perMember.find((p) => p.memberId === 'a').share
    expect(c).toBe(1600) // 16 of 78 total resident-days
    expect(a).toBe(3100)
  })
  it('tracks paid / remaining / status', () => {
    const r = computeMonth({
      month: M, members: members.slice(0, 2),
      bills: [{ id: 'g', name: 'Gas', amount: 1000, splitMethod: 'equal', dueDate: '2026-10-05' }],
      billPayments: [{ billId: 'g', memberId: 'a', amount: 500 }, { billId: 'g', memberId: 'b', amount: 200 }],
    })
    const [pa, pb] = r.bills[0].perMember
    expect([pa.status, pb.status]).toEqual(['paid', 'partial'])
    expect(pb.remaining).toBe(300)
    expect(r.byMember.b.billBalance).toBe(-300)
    expect(r.bills[0].status).toBe('partial')
  })
  it('distribute never loses a paisa', () => {
    const s = distribute(100, [1, 1, 1])
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5)
  })
})

describe('carry forward & statement', () => {
  it('closing balances feed next month opening', () => {
    const r = computeMonth({ month: M, members: [members[0]], deposits: [{ memberId: 'a', amount: 1000 }], expenses: [{ totalPrice: 100 }], meals: [meal('a', '2026-10-01', true, false, false)] })
    const cf = carryForward(r)
    expect(cf.members.a.meal).toBe(900)
    const next = computeMonth({ month: '2026-11', members: [members[0]], opening: cf.members, openingCash: cf.cash })
    expect(next.byMember.a.openingBalance).toBe(900)
    expect(next.byMember.a.finalBalance).toBe(900)
    expect(next.cash.expected).toBe(900)
  })
  it('statement ends at the final balance', () => {
    const dep = [{ id: 'DEP-1', memberId: 'a', amount: 2000, date: '2026-10-01', method: 'bKash' }]
    const meals = [meal('a', '2026-10-02', true, true, true)]
    const r = computeMonth({ month: M, members: [members[0]], deposits: dep, meals, expenses: [{ totalPrice: 90 }], opening: { a: { meal: 100, bill: 0 } } })
    const rows = buildStatement({ month: M, member: members[0], result: r, deposits: dep, meals })
    expect(rows[0].type).toBe('opening')
    expect(rows.at(-1).balance).toBe(r.byMember.a.finalBalance)
    expect(rows.at(-1).balance).toBe(2010)
    expect(settlementRows(r)[0].finalBalance).toBe(2010)
  })
})

describe('helpers', () => {
  it('presentDays', () => {
    expect(presentDays(M, '2026-10-16', null)).toBe(16)
    expect(presentDays(M, '2026-01-01', '2026-10-10')).toBe(10)
    expect(presentDays(M, '2026-11-01', null)).toBe(0)
  })
  it('month math & formatting', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(formatMinutes(840)).toBe('2:00 PM')
    expect(taka(-1250)).toBe('−৳1,250')
  })
  it('validators block negatives and bad dates', () => {
    expect(validateDeposit({ memberId: 'a', amount: -5, date: '2026-10-01', method: 'Cash' }).amount).toBeTruthy()
    expect(validateDeposit({ memberId: 'a', amount: 5, date: '2026-02-31', method: 'Cash' }).date).toBeTruthy()
    expect(validateExpense({ itemName: 'Rice', quantity: 0, unitPrice: 5, date: '2026-10-01', category: 'Rice', paymentMethod: 'Cash' }).quantity).toBeTruthy()
  })
})

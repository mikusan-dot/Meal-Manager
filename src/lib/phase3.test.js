import { describe, expect, it } from 'vitest'
import { isLowStock } from '../services/inventory'
import { toCsv } from './export'
import { evaluateTriggers } from '../services/notifications'
import { validateInventory, validateShopping } from './validators'

describe('inventory phase 3', () => {
  it('flags low stock', () => {
    expect(isLowStock({ currentStock: 2, minStock: 5 })).toBe(true)
    expect(isLowStock({ currentStock: 5, minStock: 5 })).toBe(false)
    expect(isLowStock({ currentStock: 10, minStock: 5 })).toBe(false)
  })
  it('validates stock and shopping inputs', () => {
    expect(validateInventory({ name: '', unit: 'kg', currentStock: 1, minStock: 1 }).name).toBeTruthy()
    expect(validateInventory({ name: 'Rice', unit: '', currentStock: 1, minStock: 1 }).unit).toBeTruthy()
    expect(validateInventory({ name: 'Rice', unit: 'kg', currentStock: -1, minStock: 1 }).currentStock).toBeTruthy()
    expect(validateShopping({ item: '', qty: 1 }).item).toBeTruthy()
    expect(validateShopping({ item: 'Oil', qty: 0 }).qty).toBeTruthy()
  })
})

describe('export', () => {
  it('escapes csv cells', () => {
    expect(toCsv([['a', 'b,c', 'd"e'], ['1', '2', '3']])).toBe('a,"b,c","d""e"\n1,2,3')
  })
})

describe('notifications triggers', () => {
  it('suggests low balance and bill due', () => {
    const result = {
      month: '2026-10',
      byMember: { a: { memberId: 'a', finalBalance: 100 }, b: { memberId: 'b', finalBalance: 900 } },
      bills: [{ id: 'g', name: 'Gas', perMember: [{ memberId: 'a', remaining: 50 }, { memberId: 'b', remaining: 0 }] }],
    }
    const out = evaluateTriggers({ result })
    expect(out.some((t) => t.type === 'low_balance' && t.memberId === 'a')).toBe(true)
    expect(out.some((t) => t.type === 'low_balance' && t.memberId === 'b')).toBe(false)
    expect(out.some((t) => t.type === 'bill_due' && t.memberId === 'a')).toBe(true)
  })
})

import { useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { Button, Field, Input, Modal, NumberInput, Select, Textarea } from '../ui'
import { CATEGORIES, ENABLE_STORAGE, PAYMENT_METHODS } from '../../config'
import { addExpense, updateExpense } from '../../services/expenses'
import { useAction } from '../../hooks/useAction'
import { todayStr } from '../../lib/dates'
import { round2 } from '../../lib/calc'
import { taka2 } from '../../lib/format'
import { hasErrors, validateExpense } from '../../lib/validators'
import { useData } from '../../context/DataContext'

export default function ExpenseForm({ expense, onClose }) {
  const { month, locked } = useData()
  const editing = !!expense
  const [f, setF] = useState({
    date: expense?.date || (todayStr().startsWith(month) ? todayStr() : `${month}-01`), itemName: expense?.itemName || '', quantity: expense?.quantity ?? '',
    unitPrice: expense?.unitPrice ?? '', vendor: expense?.vendor || '', category: expense?.category || '', paymentMethod: expense?.paymentMethod || 'Cash', note: expense?.note || '',
  })
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const { busy, run } = useAction()
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const total = typeof f.quantity === 'number' && typeof f.unitPrice === 'number' ? round2(f.quantity * f.unitPrice) : 0
  const preview = file ? URL.createObjectURL(file) : expense?.receiptUrl

  const submit = async (e) => {
    e.preventDefault()
    const errs = validateExpense(f)
    setErrors(errs)
    if (hasErrors(errs)) return
    const r = await run(() => (editing ? updateExpense(expense, f, file) : addExpense(f, file)), editing ? 'Expense updated' : `Expense saved · ${taka2(total)}`)
    if (r.ok) onClose()
  }

  return (
    <Modal
      title={editing ? 'Edit expense' : 'Add bazar expense'} onClose={onClose}
      footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button type="submit" form="expense-form" className="flex-1" loading={busy} disabled={locked}>{editing ? 'Save changes' : 'Save expense'}</Button></>}
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" error={errors.date}><Input type="date" value={f.date} max={todayStr()} onChange={(e) => set('date')(e.target.value)} invalid={!!errors.date} /></Field>
          <Field label="Category" error={errors.category}>
            <Select value={f.category} onChange={(e) => set('category')(e.target.value)} invalid={!!errors.category}><option value="">Choose…</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
        </div>
        <Field label="Item name" error={errors.itemName}><Input value={f.itemName} onChange={(e) => set('itemName')(e.target.value)} placeholder="e.g. Miniket rice (kg)" invalid={!!errors.itemName} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" error={errors.quantity}><NumberInput value={f.quantity} onChange={set('quantity')} placeholder="0" invalid={!!errors.quantity} /></Field>
          <Field label="Unit price (৳)" error={errors.unitPrice}><NumberInput value={f.unitPrice} onChange={set('unitPrice')} placeholder="0" invalid={!!errors.unitPrice} /></Field>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
          <span className="text-sm font-medium text-brand-900">Total price</span>
          <span className="text-xl font-bold tabular-nums text-brand-900">{taka2(total)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shop / vendor"><Input value={f.vendor} onChange={(e) => set('vendor')(e.target.value)} placeholder="Optional" /></Field>
          <Field label="Paid by" error={errors.paymentMethod}><Select value={f.paymentMethod} onChange={(e) => set('paymentMethod')(e.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        </div>
        <Field label="Note"><Textarea value={f.note} onChange={(e) => set('note')(e.target.value)} placeholder="Optional" /></Field>
        {ENABLE_STORAGE && (
          <Field label="Receipt or bazar list photo">
            <div className="flex items-center gap-3">
              {preview && <img src={preview} alt="Receipt preview" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />}
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
                <ImagePlus className="h-4 w-4" /> {preview ? 'Replace photo' : 'Take or choose photo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </Field>
        )}
      </form>
    </Modal>
  )
}

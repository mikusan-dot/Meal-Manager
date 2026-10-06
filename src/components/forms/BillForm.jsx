import { useState } from 'react'
import { Button, Field, Input, Modal, NumberInput, Select, Textarea } from '../ui'
import { BILL_TYPES, SPLIT_METHODS } from '../../config'
import { addBill, updateBill } from '../../services/bills'
import { useAction } from '../../hooks/useAction'
import { formatMonth, monthEnd } from '../../lib/dates'
import { hasErrors, validateBill } from '../../lib/validators'
import { useData } from '../../context/DataContext'

export default function BillForm({ bill, onClose }) {
  const { month, locked } = useData()
  const editing = !!bill
  const [f, setF] = useState({
    name: bill?.name || '', type: bill?.type || '', amount: bill?.amount ?? '', dueDate: bill?.dueDate || monthEnd(month),
    splitMethod: bill?.splitMethod || 'equal', note: bill?.note || '',
  })
  const [errors, setErrors] = useState({})
  const { busy, run } = useAction()
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  const pickType = (t) => setF((s) => ({ ...s, type: t, name: s.name && s.name !== s.type ? s.name : t }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = validateBill({ ...f, month: bill?.month || month })
    setErrors(errs)
    if (hasErrors(errs)) return
    const r = await run(() => (editing ? updateBill(bill, f) : addBill({ ...f, month })), editing ? 'Bill updated' : 'Bill added')
    if (r.ok) onClose()
  }

  return (
    <Modal
      title={editing ? 'Edit bill' : `New bill · ${formatMonth(month)}`} onClose={onClose}
      footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button type="submit" form="bill-form" className="flex-1" loading={busy} disabled={locked}>{editing ? 'Save changes' : 'Add bill'}</Button></>}
    >
      <form id="bill-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Bill type" error={errors.type}>
          <Select value={f.type} onChange={(e) => pickType(e.target.value)} invalid={!!errors.type}><option value="">Choose…</option>{BILL_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
        </Field>
        <Field label="Bill name" error={errors.name}><Input value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="e.g. Gas cylinder" invalid={!!errors.name} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total amount (৳)" error={errors.amount}><NumberInput value={f.amount} onChange={set('amount')} invalid={!!errors.amount} /></Field>
          <Field label="Due date" error={errors.dueDate}><Input type="date" value={f.dueDate} onChange={(e) => set('dueDate')(e.target.value)} invalid={!!errors.dueDate} /></Field>
        </div>
        <Field label="Splitting method" error={errors.splitMethod} hint={SPLIT_METHODS.find((s) => s.key === f.splitMethod)?.hint}>
          <Select value={f.splitMethod} onChange={(e) => set('splitMethod')(e.target.value)}>{SPLIT_METHODS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
        </Field>
        <Field label="Note"><Textarea value={f.note} onChange={(e) => set('note')(e.target.value)} placeholder="Optional" /></Field>
      </form>
    </Modal>
  )
}

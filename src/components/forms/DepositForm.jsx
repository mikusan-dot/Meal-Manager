import { useState } from 'react'
import { Button, Field, Input, Modal, NumberInput, Select } from '../ui'
import MemberSelect from './MemberSelect'
import { PAYMENT_METHODS } from '../../config'
import { addDeposit, updateDeposit } from '../../services/deposits'
import { useAction } from '../../hooks/useAction'
import { todayStr } from '../../lib/dates'
import { hasErrors, validateDeposit } from '../../lib/validators'
import { useData } from '../../context/DataContext'

export default function DepositForm({ deposit, defaultMemberId = '', onClose }) {
  const { month, locked } = useData()
  const editing = !!deposit
  const [f, setF] = useState({
    memberId: deposit?.memberId || defaultMemberId, amount: deposit?.amount ?? '', date: deposit?.date || (todayStr().startsWith(month) ? todayStr() : `${month}-01`),
    method: deposit?.method || 'Cash', note: deposit?.note || '',
  })
  const [errors, setErrors] = useState({})
  const { busy, run } = useAction()
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = validateDeposit(f)
    setErrors(errs)
    if (hasErrors(errs)) return
    const r = await run(() => (editing ? updateDeposit(deposit, f) : addDeposit(f)), (id) => (editing ? 'Deposit updated' : `Deposit saved · ${id}`))
    if (r.ok) onClose()
  }

  return (
    <Modal
      title={editing ? `Edit ${deposit.id}` : 'Record deposit'} onClose={onClose}
      footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button type="submit" form="deposit-form" className="flex-1" loading={busy} disabled={locked}>{editing ? 'Save changes' : 'Save deposit'}</Button></>}
    >
      <form id="deposit-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Member" error={errors.memberId}><MemberSelect value={f.memberId} onChange={set('memberId')} invalid={!!errors.memberId} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (৳)" error={errors.amount}><NumberInput value={f.amount} onChange={set('amount')} placeholder="0" invalid={!!errors.amount} autoFocus /></Field>
          <Field label="Date" error={errors.date}><Input type="date" value={f.date} max={todayStr()} onChange={(e) => set('date')(e.target.value)} invalid={!!errors.date} /></Field>
        </div>
        <Field label="Payment method" error={errors.method}>
          <Select value={f.method} onChange={(e) => set('method')(e.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select>
        </Field>
        <Field label="Note (optional)"><Input value={f.note} onChange={(e) => set('note')(e.target.value)} placeholder="e.g. bKash trx ID, who handed the cash" /></Field>
        {!editing && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">A reference ID like <b>DEP-{f.date.replaceAll('-', '') || 'YYYYMMDD'}-001</b> is generated automatically.</p>}
      </form>
    </Modal>
  )
}

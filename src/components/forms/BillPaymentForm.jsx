import { useState } from 'react'
import { Button, Field, Input, Modal, NumberInput, Select } from '../ui'
import MemberSelect from './MemberSelect'
import { PAYMENT_METHODS } from '../../config'
import { addBillPayment } from '../../services/bills'
import { useAction } from '../../hooks/useAction'
import { todayStr } from '../../lib/dates'
import { taka } from '../../lib/format'
import { hasErrors, validateBillPayment } from '../../lib/validators'
import { useData } from '../../context/DataContext'

export default function BillPaymentForm({ billId = '', memberId = '', onClose }) {
  const { month, result, locked, members } = useData()
  const [f, setF] = useState({ billId, memberId, amount: '', date: todayStr().startsWith(month) ? todayStr() : `${month}-01`, method: 'Cash', note: '' })
  const [errors, setErrors] = useState({})
  const { busy, run } = useAction()
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const row = result.bills.find((b) => b.id === f.billId)?.perMember.find((p) => p.memberId === f.memberId)

  const submit = async (e) => {
    e.preventDefault()
    const errs = validateBillPayment(f)
    setErrors(errs)
    if (hasErrors(errs)) return
    const r = await run(() => addBillPayment(f), 'Bill payment recorded')
    if (r.ok) onClose()
  }

  return (
    <Modal
      title="Record bill payment" onClose={onClose}
      footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button type="submit" form="billpay-form" className="flex-1" loading={busy} disabled={locked}>Save payment</Button></>}
    >
      <form id="billpay-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Bill" error={errors.billId}>
          <Select value={f.billId} onChange={(e) => set('billId')(e.target.value)} invalid={!!errors.billId}>
            <option value="">Choose bill…</option>{result.bills.map((b) => <option key={b.id} value={b.id}>{b.name} · {taka(b.amount)}</option>)}
          </Select>
        </Field>
        <Field label="Member" error={errors.memberId}><MemberSelect value={f.memberId} onChange={set('memberId')} includeInactive /></Field>
        {row && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{members.find((m) => m.id === f.memberId)?.name}'s share is <b>{taka(row.share)}</b>, paid <b>{taka(row.paid)}</b>, remaining <b>{taka(row.remaining)}</b>.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (৳)" error={errors.amount}><NumberInput value={f.amount} onChange={set('amount')} invalid={!!errors.amount} /></Field>
          <Field label="Date" error={errors.date}><Input type="date" value={f.date} max={todayStr()} onChange={(e) => set('date')(e.target.value)} invalid={!!errors.date} /></Field>
        </div>
        <Field label="Payment method"><Select value={f.method} onChange={(e) => set('method')(e.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Note (optional)"><Input value={f.note} onChange={(e) => set('note')(e.target.value)} /></Field>
      </form>
    </Modal>
  )
}

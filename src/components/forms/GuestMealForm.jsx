import { useState } from 'react'
import { Button, Field, Input, Modal, Select } from '../ui'
import MemberSelect from './MemberSelect'
import { MEAL_TYPES } from '../../config'
import { addGuestMeal } from '../../services/meals'
import { useAction } from '../../hooks/useAction'
import { todayStr, formatMinutes } from '../../lib/dates'
import { isMealOpen } from '../../lib/meals'
import { hasErrors, validateGuestMeal } from '../../lib/validators'
import { useData } from '../../context/DataContext'

export default function GuestMealForm({ memberId, defaultDate, onClose }) {
  const { me, canManage, guestWeights, cutoffs, locked } = useData()
  const [f, setF] = useState({
    memberId: memberId || me?.id || '', guestName: '', date: defaultDate || todayStr(), mealType: 'lunch', weight: String(guestWeights[0]?.weight ?? 1),
  })
  const [errors, setErrors] = useState({})
  const { busy, run } = useAction()
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const closed = !canManage && !isMealOpen(f.date, f.mealType, cutoffs)

  const submit = async (e) => {
    e.preventDefault()
    const entry = { ...f, weight: Number(f.weight) }
    const errs = validateGuestMeal(entry)
    setErrors(errs)
    if (hasErrors(errs) || closed) return
    const r = await run(() => addGuestMeal(entry), 'Guest meal added')
    if (r.ok) onClose()
  }

  return (
    <Modal
      title="Add guest meal" onClose={onClose}
      footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button type="submit" form="guest-form" className="flex-1" loading={busy} disabled={closed || locked}>Add guest meal</Button></>}
    >
      <form id="guest-form" onSubmit={submit} className="space-y-4" noValidate>
        {canManage && <Field label="Host member" error={errors.memberId}><MemberSelect value={f.memberId} onChange={set('memberId')} /></Field>}
        <Field label="Guest name" error={errors.guestName}><Input value={f.guestName} onChange={(e) => set('guestName')(e.target.value)} placeholder="e.g. Rahim" autoFocus invalid={!!errors.guestName} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" error={errors.date}><Input type="date" value={f.date} onChange={(e) => set('date')(e.target.value)} invalid={!!errors.date} /></Field>
          <Field label="Meal">
            <Select value={f.mealType} onChange={(e) => set('mealType')(e.target.value)}>{MEAL_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select>
          </Field>
        </div>
        <Field label="Meal weight" error={errors.weight} hint="Charged to the host at the meal rate × weight.">
          <Select value={f.weight} onChange={(e) => set('weight')(e.target.value)}>
            {guestWeights.map((g) => <option key={g.label} value={g.weight}>{g.label} ({g.weight})</option>)}
          </Select>
        </Field>
        {closed && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">Meal editing closed — the {f.mealType} cutoff ({formatMinutes(cutoffs[f.mealType])}) has passed. Ask the manager to add it.</p>}
      </form>
    </Modal>
  )
}

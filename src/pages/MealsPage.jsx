import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Lock, Minus, Trash2, UserPlus } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, PageHeader, PageSkeleton, Segmented, Select } from '../components/ui'
import MemberSelect from '../components/forms/MemberSelect'
import { useData } from '../context/DataContext'
import { useConfirm, useQuickAdd, useToast } from '../context/UiContext'
import { MEAL_TYPES } from '../config'
import { saveMeal, removeGuestMeal, mealDocId } from '../services/meals'
import { friendlyError } from '../services/common'
import { addDays, datesOfMonth, formatDate, formatMinutes, todayStr, weekday, formatDayMonth } from '../lib/dates'
import { isMealOpen } from '../lib/meals'
import { mealsInEntry, round2 } from '../lib/calc'
import { num } from '../lib/format'

function MealButton({ meal, on, open, override, busy, onClick, cutoff }) {
  const disabled = (!open && !override) || busy
  return (
    <button
      onClick={onClick} disabled={disabled} aria-pressed={on}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition active:scale-[0.99] ${on ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white'} ${disabled ? 'opacity-60' : 'hover:border-brand-400'}`}
    >
      <span className="text-2xl" aria-hidden>{meal.emoji}</span>
      <span className="flex-1">
        <span className="block text-base font-semibold text-slate-900">{meal.label}</span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          {open ? `Closes ${formatMinutes(cutoff)}` : <><Lock className="h-3 w-3" />Closed at {formatMinutes(cutoff)}{override ? ' · manager override' : ''}</>}
        </span>
      </span>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{on ? <Check className="h-5 w-5" /> : <Minus className="h-5 w-5" />}</span>
    </button>
  )
}

export default function MealsPage() {
  const d = useData()
  const quick = useQuickAdd()
  const confirm = useConfirm()
  const toast = useToast()
  const [view, setView] = useState('mine')
  const [date, setDate] = useState(null)
  const [target, setTarget] = useState('')
  const [pending, setPending] = useState({})

  const days = useMemo(() => datesOfMonth(d.month), [d.month])
  const today = todayStr()
  const current = date && days.includes(date) ? date : days.includes(today) ? today : days[0]
  const memberId = d.canManage && target ? target : d.me?.id

  if (d.loading) return <PageSkeleton />
  if (!d.me) return <EmptyState title="No member profile" text="Your account is not linked to a member profile." />

  const mealMap = Object.fromEntries(d.meals.map((m) => [m.id, m]))
  const entry = (id, dt) => mealMap[mealDocId(id, dt)]
  const override = d.canManage && !d.locked
  const editable = !d.locked
  const guestsFor = (id, dt) => d.guestMeals.filter((g) => g.memberId === id && g.date === dt)

  const toggle = async (id, dt, key) => {
    const cur = entry(id, dt)
    const next = { breakfast: !!cur?.breakfast, lunch: !!cur?.lunch, dinner: !!cur?.dinner }
    next[key] = !next[key]
    const k = `${id}_${dt}_${key}`
    setPending((p) => ({ ...p, [k]: true }))
    try { await saveMeal({ memberId: id, date: dt, ...next }, cur) } catch (e) { toast.error(friendlyError(e)) } finally { setPending((p) => ({ ...p, [k]: false })) }
  }
  const removeGuest = async (g) => {
    if (await confirm({ title: `Remove guest ${g.guestName}?`, message: 'This guest meal will no longer be charged.', confirmLabel: 'Remove' })) {
      try { await removeGuestMeal(g); toast.success('Guest meal removed') } catch (e) { toast.error(friendlyError(e)) }
    }
  }

  const e = entry(memberId, current)
  const own = e ? mealsInEntry(e) : 0
  const guests = guestsFor(memberId, current)
  const guestTotal = round2(guests.reduce((s, g) => s + g.weight, 0))
  const allClosed = MEAL_TYPES.every((m) => !isMealOpen(current, m.key, d.cutoffs))
  const closedMsg = current === today ? 'Meal editing closed for today.' : 'Meal editing closed for this date.'
  const member = d.members.find((m) => m.id === memberId)

  const history = days.filter((dt) => entry(memberId, dt) || guestsFor(memberId, dt).length).reverse()
  const monthOwn = d.result.byMember[memberId]

  return (
    <div className="space-y-4">
      <PageHeader title="Meals" subtitle="Tick the meals you'll eat" actions={d.canManage && <Segmented value={view} onChange={setView} options={[{ value: 'mine', label: 'One member' }, { value: 'all', label: 'All members' }]} />} />

      <Card className="flex items-center justify-between p-2">
        <Button variant="ghost" icon={ChevronLeft} onClick={() => setDate(addDays(current, -1))} disabled={current === days[0]} aria-label="Previous day" />
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{weekday(current)}{current === today ? ' · Today' : ''}</p>
          <p className="text-lg font-bold text-slate-900">{formatDate(current)}</p>
        </div>
        <Button variant="ghost" icon={ChevronRight} onClick={() => setDate(addDays(current, 1))} disabled={current === days.at(-1)} aria-label="Next day" />
      </Card>

      {view === 'mine' && (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            {d.canManage && (
              <Card className="p-3"><span className="label">Recording meals for</span><MemberSelect value={memberId} onChange={setTarget} includeInactive /></Card>
            )}
            {MEAL_TYPES.map((m) => (
              <MealButton
                key={m.key} meal={m} on={!!e?.[m.key]} cutoff={d.cutoffs[m.key]}
                open={editable && isMealOpen(current, m.key, d.cutoffs)} override={override && editable}
                busy={!!pending[`${memberId}_${current}_${m.key}`]} onClick={() => toggle(memberId, current, m.key)}
              />
            ))}
            {allClosed && !override && <p className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700"><Lock className="h-4 w-4" />{d.locked ? 'This month is closed.' : closedMsg}</p>}
            {allClosed && override && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Cut-off has passed. Members can't change this day, but you can correct it.</p>}
            <Card className="flex items-center justify-between px-4 py-3">
              <span className="font-medium text-slate-600">Total for {formatDayMonth(current)}</span>
              <span className="text-xl font-bold text-slate-900">{num(round2(own + guestTotal))} meal{own + guestTotal === 1 ? '' : 's'}{guestTotal ? <span className="ml-1 text-sm font-medium text-slate-500">({own} + {num(guestTotal)} guest)</span> : null}</span>
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader title="Guest meals" action={!d.locked && <Button size="sm" variant="soft" icon={UserPlus} onClick={() => quick.open('guestMeal', { memberId, defaultDate: current })}>Add guest</Button>} />
              {guests.length === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-500">No guests on this day.</p> : (
                <ul className="divide-y divide-slate-100">
                  {guests.map((g) => {
                    const canRemove = !d.locked && (d.canManage || isMealOpen(g.date, g.mealType, d.cutoffs))
                    return (
                      <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1"><p className="font-medium text-slate-800">{g.guestName}</p><p className="text-xs capitalize text-slate-500">{g.mealType} · weight {g.weight}</p></div>
                        {canRemove && <Button variant="ghost" size="sm" icon={Trash2} className="text-red-600" onClick={() => removeGuest(g)} aria-label="Remove guest meal" />}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title={`${member?.name?.split(' ')[0] || 'My'} · this month`} subtitle={monthOwn ? `${num(monthOwn.mealCount)} meals total` : undefined} />
              {history.length === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-500">No meals recorded yet.</p> : (
                <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                  {history.map((dt) => {
                    const en = entry(memberId, dt)
                    const gw = round2(guestsFor(memberId, dt).reduce((s, g) => s + g.weight, 0))
                    return (
                      <li key={dt}>
                        <button onClick={() => setDate(dt)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${dt === current ? 'bg-brand-50/60' : ''}`}>
                          <span className="w-16 font-medium text-slate-700">{formatDayMonth(dt)}</span>
                          <span className="flex flex-1 gap-1.5">{MEAL_TYPES.map((m) => <span key={m.key} title={m.label} className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${en?.[m.key] ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{m.label[0]}</span>)}</span>
                          <span className="font-semibold tabular-nums text-slate-800">{num(round2((en ? mealsInEntry(en) : 0) + gw))}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {view === 'all' && d.canManage && (
        <Card>
          <CardHeader title={`All members · ${formatDate(current)}`} subtitle={d.locked ? 'Month is closed' : 'Tap to correct anyone’s meals — the cut-off does not apply to you'} />
          <ul className="divide-y divide-slate-100">
            {d.members.filter((m) => m.status === 'active' || entry(m.id, current)).sort((a, b) => a.name.localeCompare(b.name)).map((m) => {
              const en = entry(m.id, current)
              const gw = round2(guestsFor(m.id, current).reduce((s, g) => s + g.weight, 0))
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar member={m} size={34} />
                  <div className="min-w-[8rem] flex-1"><p className="truncate text-sm font-medium text-slate-800">{m.name}</p><p className="text-xs text-slate-500">Month: {num(d.result.byMember[m.id]?.mealCount || 0)} meals{gw ? ` · ${gw} guest today` : ''}</p></div>
                  <div className="flex gap-1.5">
                    {MEAL_TYPES.map((mt) => (
                      <button key={mt.key} disabled={d.locked || pending[`${m.id}_${current}_${mt.key}`]} onClick={() => toggle(m.id, current, mt.key)} aria-pressed={!!en?.[mt.key]} title={mt.label}
                        className={`flex h-11 w-11 flex-col items-center justify-center rounded-xl border-2 text-[10px] font-semibold ${en?.[mt.key] ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-400'} disabled:opacity-50`}>
                        <span>{en?.[mt.key] ? '✓' : '—'}</span><span>{mt.label.slice(0, 3)}</span>
                      </button>
                    ))}
                  </div>
                  <Badge tone={en && mealsInEntry(en) ? 'brand' : 'slate'}>{mealsInEntry(en || {})}</Badge>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

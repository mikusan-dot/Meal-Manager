import { useEffect, useState } from 'react'
import { Bell, ClipboardList, Crown, History, Package, Plus, Trash2 } from 'lucide-react'
import { Badge, Banner, Button, Card, CardHeader, Field, Input, NumberInput, PageHeader, PageSkeleton, Select } from '../components/ui'
import MemberSelect from '../components/forms/MemberSelect'
import { useData } from '../context/DataContext'
import { useAction } from '../hooks/useAction'
import { assignManager, defaultManagerDates, saveMealSettings, saveOpening } from '../services/months'
import { DEFAULT_CUTOFFS, FEATURES, MEAL_TYPES } from '../config'
import { formatDate, formatMonth, inputToMinutes, minutesToInput } from '../lib/dates'
import { taka } from '../lib/format'

export default function SettingsPage() {
  const d = useData()
  const { busy, run } = useAction()
  const [cut, setCut] = useState(DEFAULT_CUTOFFS)
  const [weights, setWeights] = useState([])
  const [mgr, setMgr] = useState({ memberId: '', startDate: '', endDate: '' })
  const [openCash, setOpenCash] = useState('')
  const [openBal, setOpenBal] = useState({})
  const [mgrBusy, setMgrBusy] = useState(false)

  useEffect(() => {
    if (d.loading) return
    setCut(d.cutoffs)
    setWeights(d.guestWeights.map((g) => ({ ...g })))
    setMgr({ memberId: d.manager?.memberId || '', ...(d.manager ? { startDate: d.manager.startDate, endDate: d.manager.endDate } : defaultManagerDates(d.month)) })
    setOpenCash(d.settings?.openingCash ?? '')
    setOpenBal(d.settings?.openingBalances || {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.loading, d.month, d.settings?.cutoffs, d.manager?.memberId])
  if (d.loading) return <PageSkeleton />

  const canOpening = d.isAdmin && !d.locked && d.openingSource !== 'previous' && d.openingSource !== 'frozen'
  const history = Object.values(d.managers).sort((a, b) => b.month.localeCompare(a.month))
  const name = (id) => d.members.find((m) => m.id === id)?.name || '—'

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Settings" subtitle={`Applies to ${formatMonth(d.month)} — change month at the top`} />
      {d.locked && <Banner tone="locked" title="This month is closed">Settings are frozen. An admin can reopen it from the Settlement page.</Banner>}

      <Card>
        <CardHeader title="Manager for this month" subtitle="Only this person (and admins) can add deposits, expenses, bills and correct meals" />
        <div className="space-y-3 p-4">
          {d.isAdmin ? (
            <>
              <Field label="Manager"><MemberSelect value={mgr.memberId} onChange={(v) => setMgr((s) => ({ ...s, memberId: v }))} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date"><Input type="date" value={mgr.startDate} onChange={(e) => setMgr((s) => ({ ...s, startDate: e.target.value }))} /></Field>
                <Field label="End date"><Input type="date" value={mgr.endDate} onChange={(e) => setMgr((s) => ({ ...s, endDate: e.target.value }))} /></Field>
              </div>
              <Button icon={Crown} loading={mgrBusy} disabled={d.locked} onClick={async () => { setMgrBusy(true); await run(() => assignManager({ month: d.month, ...mgr }), `Manager set for ${formatMonth(d.month)}`); setMgrBusy(false) }}>Save manager</Button>
            </>
          ) : <p className="text-sm text-slate-600">{d.managerMember ? <>Current manager: <b>{d.managerMember.name}</b> ({formatDate(d.manager.startDate)} – {formatDate(d.manager.endDate)})</> : 'No manager assigned yet. Ask an admin.'}</p>}
          {history.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              {history.map((h) => <li key={h.month} className="flex items-center justify-between px-3 py-2"><span className="font-medium">{formatMonth(h.month)}</span><span className="text-slate-600">{name(h.memberId)}</span></li>)}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Meal cut-off times" subtitle="After the cut-off members can't change that meal (managers still can). Bangladesh time." />
        <form className="space-y-4 p-4" onSubmit={(e) => { e.preventDefault(); run(() => saveMealSettings(d.month, { cutoffs: cut, guestWeights: weights.map((w) => ({ ...w, weight: Number(w.weight) })) }), 'Meal settings saved') }}>
          <div className="grid grid-cols-3 gap-3">
            {MEAL_TYPES.map((m) => <Field key={m.key} label={m.label}><Input type="time" value={minutesToInput(cut[m.key])} onChange={(e) => e.target.value && setCut((c) => ({ ...c, [m.key]: inputToMinutes(e.target.value) }))} disabled={d.locked} /></Field>)}
          </div>
          <div>
            <span className="label">Guest meal weights</span>
            <div className="space-y-2">
              {weights.map((w, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={w.label} onChange={(e) => setWeights((ws) => ws.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label" disabled={d.locked} />
                  <NumberInput value={w.weight} onChange={(v) => setWeights((ws) => ws.map((x, j) => (j === i ? { ...x, weight: v } : x)))} className="!w-24" disabled={d.locked} />
                  <Button type="button" variant="ghost" icon={Trash2} className="text-red-600" disabled={weights.length < 2 || d.locked} onClick={() => setWeights((ws) => ws.filter((_, j) => j !== i))} aria-label="Remove" />
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={() => setWeights((ws) => [...ws, { label: '', weight: 1 }])} disabled={d.locked}>Add weight</Button>
            </div>
          </div>
          <Button type="submit" loading={busy} disabled={d.locked}>Save meal settings</Button>
        </form>
      </Card>

      {canOpening && (
        <Card>
          <CardHeader title="Opening balances" subtitle="Admin only · for the very first month, before any month has been settled" />
          <form className="space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); run(() => saveOpening(d.month, { openingCash: openCash, openingBalances: openBal }), 'Opening balances saved') }}>
            <Field label="Cash already in hand (৳)"><NumberInput value={openCash} onChange={setOpenCash} /></Field>
            {d.members.filter((m) => m.status === 'active').map((m) => (
              <div key={m.id} className="grid grid-cols-5 items-end gap-2">
                <p className="col-span-2 truncate text-sm font-medium">{m.name}</p>
                <Field label="Meal"><NumberInput value={openBal[m.id]?.meal ?? ''} onChange={(v) => setOpenBal((b) => ({ ...b, [m.id]: { meal: v === '' ? 0 : v, bill: b[m.id]?.bill ?? 0 } }))} min={undefined} /></Field>
                <Field label="Bill" className="col-span-2"><NumberInput value={openBal[m.id]?.bill ?? ''} onChange={(v) => setOpenBal((b) => ({ ...b, [m.id]: { bill: v === '' ? 0 : v, meal: b[m.id]?.meal ?? 0 } }))} /></Field>
              </div>
            ))}
            <p className="text-xs text-slate-500">Positive = money the member has left, negative = money they owe. Current total: {taka(Object.values(openBal).reduce((s, b) => s + (b.meal || 0) + (b.bill || 0), 0))}</p>
            <Button type="submit" loading={busy}>Save opening balances</Button>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader title="Phase 3 status" subtitle="Now live in the app" />
        <ul className="divide-y divide-slate-100 text-sm">
          {[[History, 'Audit log', 'Who changed what, old vs new value', FEATURES.audit, '/audit'], [Bell, 'Notifications', 'Low balance, deposit, bill & meal-deadline reminders', FEATURES.notifications, '/notifications'], [Package, 'Inventory', 'Rice, oil, gas stock with low-stock warnings', FEATURES.inventory, '/inventory'], [ClipboardList, 'Shopping list', 'Shared list members can add to', true, '/inventory']].map(([Icon, t, s, on, to]) => (
            <li key={t} className="flex items-center gap-3 px-4 py-3"><Icon className="h-5 w-5 text-slate-400" /><span className="flex-1"><span className="block font-medium text-slate-800">{t}</span><span className="text-xs text-slate-500">{s}</span></span><Badge tone={on ? 'green' : 'slate'}>{on ? 'On' : 'Phase 3'}</Badge></li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { Badge, Card, CardHeader, DataList, EmptyState, Field, Input, PageHeader, PageSkeleton, Select } from '../components/ui'
import MemberSelect from '../components/forms/MemberSelect'
import { useData } from '../context/DataContext'
import { buildStatement } from '../lib/calc'
import { formatDate, formatMonth, monthEnd } from '../lib/dates'
import { signedTaka, taka } from '../lib/format'

const TYPES = { opening: ['Brought fwd', 'slate'], deposit: ['Deposit', 'green'], meal: ['Meal', 'amber'], bill: ['Bill', 'blue'], billPayment: ['Bill paid', 'green'] }

export default function StatementsPage() {
  const d = useData()
  const [params, setParams] = useSearchParams()
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const memberId = d.canManage || d.isStaffNow ? params.get('member') || d.me?.id || '' : d.me?.id

  const all = useMemo(() => {
    if (d.loading || !memberId) return []
    const member = d.members.find((m) => m.id === memberId)
    return member ? buildStatement({ month: d.month, member, result: d.result, deposits: d.deposits, meals: d.meals, guestMeals: d.guestMeals, billPayments: d.billPayments }) : []
  }, [d, memberId])
  if (d.loading) return <PageSkeleton />

  const rows = all.filter((r) => (!type || r.type === type) && (!from || r.date >= from) && (!to || r.date <= to))
  const s = d.result.byMember[memberId]
  const staff = d.canManage || d.isStaffNow
  const maxDay = monthEnd(d.month)

  return (
    <div className="space-y-4">
      <PageHeader title="Statement" subtitle={`${formatMonth(d.month)} · running balance (meal + bill)`} />
      <Card className="grid gap-3 p-3 sm:grid-cols-4">
        {staff && <Field label="Member"><MemberSelect value={memberId} onChange={(v) => setParams(v ? { member: v } : {})} includeInactive /></Field>}
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{Object.entries(TYPES).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="From"><Input type="date" value={from} min={`${d.month}-01`} max={maxDay} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} min={`${d.month}-01`} max={maxDay} onChange={(e) => setTo(e.target.value)} /></Field>
      </Card>

      {s && (
        <Card className="p-4">
          <p className="text-center text-sm text-slate-600 sm:text-base">
            <b>{taka(s.openingBalance)}</b> previous balance <span className="mx-1 text-slate-400">+</span> <b className="text-emerald-700">{taka(s.deposits + s.billPayments)}</b> deposits &amp; payments <span className="mx-1 text-slate-400">−</span> <b className="text-red-700">{taka(s.mealCost + s.billShare)}</b> costs <span className="mx-1 text-slate-400">=</span> <b className="text-lg">{taka(s.finalBalance)}</b> closing
          </p>
        </Card>
      )}

      <Card>
        <CardHeader title={`${rows.length} entries`} subtitle="Meal charges use this month's current meal rate" />
        {rows.length <= (type ? 0 : 1) && !all.some((r) => r.type !== 'opening') ? <EmptyState icon={ScrollText} title="Nothing to show yet" text="Deposits, meals and bills for this member will appear here." /> : (
          <DataList
            rows={rows} rowKey={(r) => r.key}
            columns={[
              { key: 'd', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 't', header: 'Type', render: (r) => <Badge tone={TYPES[r.type][1]}>{TYPES[r.type][0]}</Badge> },
              { key: 'x', header: 'Description', render: (r) => r.description },
              { key: 'a', header: 'Amount', align: 'right', render: (r) => <span className={r.amount < 0 ? 'text-red-700' : 'text-emerald-700'}>{signedTaka(r.amount)}</span> },
              { key: 'b', header: 'Balance', align: 'right', render: (r) => <b className={r.balance < 0 ? 'text-red-700' : ''}>{taka(r.balance)}</b> },
            ]}
            renderCard={(r) => (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{r.description}</p><p className="text-xs text-slate-500">{formatDate(r.date)} · <Badge tone={TYPES[r.type][1]}>{TYPES[r.type][0]}</Badge></p></div>
                <div className="text-right"><p className={`font-semibold tabular-nums ${r.amount < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{signedTaka(r.amount)}</p><p className="text-xs tabular-nums text-slate-500">Bal {taka(r.balance)}</p></div>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  )
}

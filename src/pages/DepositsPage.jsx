import { useMemo, useState } from 'react'
import { Ban, Pencil, Wallet } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, DataList, EmptyState, PageHeader, PageSkeleton, SearchInput, Select, Stat } from '../components/ui'
import { useData } from '../context/DataContext'
import { useConfirm, useQuickAdd } from '../context/UiContext'
import { useAction } from '../hooks/useAction'
import { voidDeposit } from '../services/deposits'
import { formatDate } from '../lib/dates'
import { PAYMENT_METHODS } from '../config'
import { signedTaka, taka } from '../lib/format'

export default function DepositsPage() {
  const d = useData()
  const quick = useQuickAdd()
  const confirm = useConfirm()
  const { run } = useAction()
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [memberId, setMemberId] = useState('')

  const rows = useMemo(() => {
    if (d.loading) return []
    const name = (id) => d.members.find((m) => m.id === id)?.name || ''
    const s = q.trim().toLowerCase()
    return d.deposits
      .filter((x) => (!method || x.method === method) && (!memberId || x.memberId === memberId)
        && (!s || [x.id, name(x.memberId), x.note, x.method].some((v) => (v || '').toLowerCase().includes(s))))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  }, [d, q, method, memberId])

  if (d.loading) return <PageSkeleton />
  const mine = d.me ? d.result.byMember[d.me.id] : null
  const member = (id) => d.members.find((m) => m.id === id)
  const doVoid = async (x) => {
    const ok = await confirm({ title: `Void ${x.id}?`, message: `This removes ${taka(x.amount)} from ${member(x.memberId)?.name}'s balance and the cash total. The record stays visible as voided for transparency.`, confirmLabel: 'Void deposit' })
    if (ok) run(() => voidDeposit(x), 'Deposit voided')
  }
  const total = rows.filter((x) => x.status !== 'void').reduce((s, x) => s + x.amount, 0)

  const actions = (x) => d.canEdit && x.status !== 'void' ? (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" icon={Pencil} onClick={() => quick.open('deposit', { deposit: x })} aria-label="Edit" />
      <Button variant="ghost" size="sm" icon={Ban} onClick={() => doVoid(x)} aria-label="Void" className="text-red-600" />
    </div>
  ) : null

  return (
    <div className="space-y-4">
      <PageHeader title="Deposits" subtitle="Everyone can see every deposit — nothing is hidden" actions={d.canEdit && <Button icon={Wallet} onClick={() => quick.open('deposit')}>Record deposit</Button>} />

      {mine && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="My total deposited" value={taka(mine.deposits)} tone="green" />
          <Stat label="My meal cost" value={taka(mine.mealCost)} tone="amber" />
          <Stat label="My bill cost" value={taka(mine.billShare)} tone="blue" />
          <Stat label="My remaining balance" value={taka(mine.finalBalance)} tone={mine.finalBalance < 0 ? 'red' : 'brand'} sub={mine.openingBalance ? `Includes ${taka(mine.openingBalance)} brought forward` : undefined} />
        </div>
      )}

      <Card>
        <CardHeader title={`${rows.length} deposit${rows.length === 1 ? '' : 's'}`} subtitle={`Total ${taka(total)}`} />
        <div className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, reference, note" />
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="">All members</option>{[...d.members].sort((a, b) => a.name.localeCompare(b.name)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}><option value="">All methods</option>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Wallet} title={d.deposits.length ? 'No matching deposits' : 'No deposits this month'} text={d.deposits.length ? 'Try clearing the filters.' : 'Deposits recorded by the manager will show up here.'} action={d.canEdit && !d.deposits.length ? <Button onClick={() => quick.open('deposit')}>Record first deposit</Button> : null} />
        ) : (
          <DataList
            rows={rows} rowClass={(x) => (x.status === 'void' ? 'opacity-50' : '')}
            columns={[
              { key: 'date', header: 'Date', render: (x) => formatDate(x.date) },
              { key: 'ref', header: 'Reference', render: (x) => <span className="font-mono text-xs">{x.id}</span> },
              { key: 'member', header: 'Member', render: (x) => <span className="flex items-center gap-2"><Avatar member={member(x.memberId)} size={28} />{member(x.memberId)?.name || '—'}</span> },
              { key: 'method', header: 'Method', render: (x) => <Badge tone="brand">{x.method}</Badge> },
              { key: 'note', header: 'Note', render: (x) => <span className="text-slate-500">{x.status === 'void' ? <Badge tone="red">Voided</Badge> : x.note}</span> },
              { key: 'amount', header: 'Amount', align: 'right', render: (x) => <span className={`font-semibold ${x.status === 'void' ? 'line-through' : 'text-emerald-700'}`}>{signedTaka(x.amount)}</span> },
              { key: 'act', header: '', align: 'right', render: actions },
            ]}
            renderCard={(x) => (
              <div className="flex items-start gap-3">
                <Avatar member={member(x.memberId)} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><p className="truncate font-medium text-slate-800">{member(x.memberId)?.name || '—'}</p><p className={`font-semibold tabular-nums ${x.status === 'void' ? 'line-through' : 'text-emerald-700'}`}>{signedTaka(x.amount)}</p></div>
                  <p className="text-xs text-slate-500">{formatDate(x.date)} · {x.method} {x.status === 'void' && <Badge tone="red">Voided</Badge>}</p>
                  <p className="font-mono text-[11px] text-slate-400">{x.id}</p>
                  {x.note && <p className="mt-0.5 text-xs text-slate-500">{x.note}</p>}
                  {actions(x)}
                </div>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  )
}

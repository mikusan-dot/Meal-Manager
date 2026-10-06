import { useState } from 'react'
import { Ban, ChevronDown, HandCoins, Pencil, Plus, Receipt } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, PageSkeleton, Stat } from '../components/ui'
import { useData } from '../context/DataContext'
import { useConfirm, useQuickAdd } from '../context/UiContext'
import { useAction } from '../hooks/useAction'
import { voidBill, voidBillPayment } from '../services/bills'
import { formatDate, formatDayMonth } from '../lib/dates'
import { SPLIT_METHODS } from '../config'
import { taka2, taka } from '../lib/format'

const TONE = { paid: 'green', partial: 'amber', unpaid: 'red' }

export default function BillsPage() {
  const d = useData()
  const quick = useQuickAdd()
  const confirm = useConfirm()
  const { run } = useAction()
  const [open, setOpen] = useState({})
  if (d.loading) return <PageSkeleton />
  const name = (id) => d.members.find((m) => m.id === id)
  const mine = d.me ? d.result.byMember[d.me.id] : null
  const doVoidBill = async (b) => { if (await confirm({ title: `Void ${b.name}?`, message: 'Its shares disappear from every member’s balance. Payments recorded against it are ignored.', confirmLabel: 'Void bill' })) run(() => voidBill(b), 'Bill voided') }
  const doVoidPay = async (p) => { if (await confirm({ title: 'Void this payment?', message: `${taka2(p.amount)} will no longer count.`, confirmLabel: 'Void payment' })) run(() => voidBillPayment(p), 'Payment voided') }

  return (
    <div className="space-y-4">
      <PageHeader title="Bills" subtitle="Maid, gas, electricity, internet and more — kept apart from meal money" actions={d.canEdit && <Button icon={Plus} onClick={() => quick.open('bill')}>New bill</Button>} />
      {mine && <div className="grid grid-cols-3 gap-3"><Stat label="My bill share" value={taka(mine.billShare)} tone="blue" /><Stat label="I paid" value={taka(mine.billPayments)} tone="green" /><Stat label="Bill balance" value={taka(mine.billBalance)} tone={mine.billBalance < 0 ? 'red' : 'brand'} sub={mine.billBalance < 0 ? 'Still to pay' : undefined} /></div>}

      {d.result.bills.length === 0 ? <Card><EmptyState icon={Receipt} title="No bills this month" text="Add the recurring bills and choose how to split them." action={d.canEdit && <Button onClick={() => quick.open('bill')}>Add first bill</Button>} /></Card> : d.result.bills.map((b) => {
        const my = b.perMember.find((p) => p.memberId === d.me?.id)
        const pays = d.billPayments.filter((p) => p.billId === b.id && p.status !== 'void')
        const isOpen = open[b.id]
        return (
          <Card key={b.id} className="overflow-hidden">
            <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen((o) => ({ ...o, [b.id]: !o[b.id] }))}>
              <span className="rounded-xl bg-sky-50 p-2.5 text-sky-700"><Receipt className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">{b.name}</span><span className="block text-xs text-slate-500">Due {formatDate(b.dueDate)} · {SPLIT_METHODS.find((s) => s.key === b.splitMethod)?.label}</span></span>
              <span className="text-right"><span className="block font-bold tabular-nums">{taka2(b.amount)}</span><Badge tone={TONE[b.status]}>{b.status === 'paid' ? 'Fully paid' : `${taka(b.remaining)} left`}</Badge></span>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {my && !isOpen && <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">Your share <b>{taka2(my.share)}</b> · paid {taka2(my.paid)} · <Badge tone={TONE[my.status]}>{my.status}</Badge></p>}
            {isOpen && (
              <div className="border-t border-slate-100">
                <ul className="divide-y divide-slate-100">
                  {b.perMember.map((p) => (
                    <li key={p.memberId} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${p.memberId === d.me?.id ? 'bg-brand-50/50' : ''}`}>
                      <Avatar member={name(p.memberId)} size={30} />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{name(p.memberId)?.name}</span>
                      <span className="hidden text-slate-500 sm:inline">share {taka2(p.share)}</span>
                      <span className="text-slate-500">paid {taka2(p.paid)}</span>
                      <Badge tone={TONE[p.status]}>{p.status}</Badge>
                      {d.canEdit && p.status !== 'paid' && <Button size="sm" variant="soft" icon={HandCoins} onClick={() => quick.open('billPayment', { billId: b.id, memberId: p.memberId })} aria-label="Record payment" />}
                    </li>
                  ))}
                </ul>
                {pays.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                    <p className="mb-1 font-semibold">Payments</p>
                    {pays.map((p) => <p key={p.id} className="flex items-center justify-between py-0.5"><span>{formatDayMonth(p.date)} · {name(p.memberId)?.name} · {p.method}</span><span className="flex items-center gap-1 font-semibold">{taka2(p.amount)}{d.canEdit && <button onClick={() => doVoidPay(p)} className="text-red-600" aria-label="Void payment"><Ban className="h-3.5 w-3.5" /></button>}</span></p>)}
                  </div>
                )}
                {d.canEdit && <div className="flex gap-2 border-t border-slate-100 p-3"><Button size="sm" variant="secondary" icon={Pencil} onClick={() => quick.open('bill', { bill: b })}>Edit</Button><Button size="sm" variant="ghost" icon={Ban} className="text-red-600" onClick={() => doVoidBill(b)}>Void bill</Button></div>}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

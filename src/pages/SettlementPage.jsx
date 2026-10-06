import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Lock, LockOpen, Scale } from 'lucide-react'
import { Avatar, Badge, Banner, Button, Card, CardHeader, DataList, EmptyState, PageHeader, PageSkeleton, Stat } from '../components/ui'
import { useData } from '../context/DataContext'
import { useConfirm } from '../context/UiContext'
import { useAction } from '../hooks/useAction'
import { generateSettlement, reopenMonth } from '../services/months'
import { formatDateTime, formatMonth } from '../lib/dates'
import { num, signedTaka, taka, taka2 } from '../lib/format'

const STATUS = { refundable: ['Refundable', 'green'], due: ['Due', 'red'], settled: ['Settled', 'slate'] }

export default function SettlementPage() {
  const d = useData()
  const confirm = useConfirm()
  const { busy, run } = useAction()
  const [which, setWhich] = useState('')
  if (d.loading) return <PageSkeleton />

  const { result, month } = d
  const t = result.totals
  const rows = d.members.map((m) => ({ m, s: result.byMember[m.id] })).filter(({ m, s }) => s && (m.status === 'active' || s.mealCount || s.deposits || s.billShare || Math.abs(s.finalBalance) > 0.005))
  const stored = Object.fromEntries(d.settlements.map((s) => [s.memberId, s]))
  const generated = d.settlements.length > 0
  const stale = generated && !d.locked && rows.some(({ m, s }) => Math.abs((stored[m.id]?.finalBalance ?? NaN) - s.finalBalance) > 0.005 || !stored[m.id])
  const totalRefund = rows.reduce((a, { s }) => a + (s.finalBalance > 0 ? s.finalBalance : 0), 0)
  const totalDue = rows.reduce((a, { s }) => a + (s.finalBalance < 0 ? -s.finalBalance : 0), 0)

  const generate = async (lock) => {
    const ok = await confirm({
      title: lock ? `Close ${formatMonth(month)}?` : 'Generate settlement?',
      message: lock
        ? 'This saves every member’s settlement, carries balances (money left and money owed) into next month, and LOCKS the month: deposits, expenses, meals, bills and the settlement can no longer be edited. Only an admin can reopen it.'
        : 'This saves a snapshot of every member’s balance for this month. You can regenerate it any time until the month is closed.',
      confirmLabel: lock ? 'Close month' : 'Generate', danger: lock,
    })
    if (!ok) return
    setWhich(lock ? 'close' : 'gen')
    await run(() => generateSettlement(month, result, { lock, openingCash: d.openingCash }), lock ? `${formatMonth(month)} closed` : 'Settlement generated')
    setWhich('')
  }
  const reopen = async () => {
    if (await confirm({ title: `Reopen ${formatMonth(month)}?`, message: 'Records become editable again. The settlement must be generated again afterwards, and next month’s opening balances will show a warning until then.', confirmLabel: 'Reopen month' })) run(() => reopenMonth(month), 'Month reopened')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Monthly settlement" subtitle={formatMonth(month)} actions={
        <>
          {d.canEdit && <Button variant="secondary" icon={Scale} loading={busy && which === 'gen'} onClick={() => generate(false)}>{generated ? 'Regenerate' : 'Generate settlement'}</Button>}
          {d.canEdit && <Button icon={Lock} loading={busy && which === 'close'} onClick={() => generate(true)}>Close month</Button>}
          {d.locked && d.isAdmin && <Button variant="secondary" icon={LockOpen} onClick={reopen}>Reopen month</Button>}
        </>
      } />

      {d.locked && <Banner tone="locked" icon={Lock} title={`🔒 ${formatMonth(month)} — Month Closed`}>{d.settings?.lockedAt ? `Closed ${formatDateTime(d.settings.lockedAt)}. ` : ''}Balances below were carried forward to next month.</Banner>}
      {stale && <Banner tone="warning" icon={AlertTriangle} title="Saved settlement is out of date">Records changed after it was generated. Regenerate before closing.</Banner>}
      {!generated && !d.locked && <Banner tone="info" icon={Scale} title="Live preview">These figures update automatically. {d.canEdit ? 'Generate the settlement to save a snapshot.' : 'The manager will generate the final settlement.'}</Banner>}
      {generated && !stale && !d.locked && <Banner tone="success" icon={CheckCircle2} title="Settlement generated">{d.settlements[0]?.generatedAt ? formatDateTime(d.settlements[0].generatedAt) : ''}</Banner>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Meal rate" value={t.meals ? taka2(t.mealRate) : '—'} tone="amber" sub={`${taka(t.expenses)} ÷ ${num(t.meals)} meals`} />
        <Stat label="Cash expected" value={taka(result.cash.expected)} tone="brand" />
        <Stat label="To refund" value={taka(totalRefund)} tone="green" />
        <Stat label="To collect" value={taka(totalDue)} tone="red" />
      </div>
      {Math.abs(t.roundingDifference) >= 0.01 && <p className="text-xs text-slate-500">Rounding: member meal costs differ from total bazar by {taka2(t.roundingDifference)} because the meal rate is rounded to the paisa.</p>}

      <Card>
        <CardHeader title="Per member" subtitle="Previous balance + deposits & payments − meal cost − bills = closing balance" />
        {rows.length === 0 ? <EmptyState icon={Scale} title="Nothing to settle" /> : (
          <DataList rows={rows} rowKey={(r) => r.m.id}
            columns={[
              { key: 'n', header: 'Member', render: ({ m }) => <span className="flex items-center gap-2"><Avatar member={m} size={28} />{m.name}</span> },
              { key: 'o', header: 'Opening', align: 'right', render: ({ s }) => taka(s.openingBalance) },
              { key: 'd', header: 'Deposits', align: 'right', render: ({ s }) => taka(s.deposits) },
              { key: 'ml', header: 'Meals', align: 'right', render: ({ s }) => num(s.mealCount) },
              { key: 'r', header: 'Rate', align: 'right', render: ({ s }) => taka2(s.mealRate) },
              { key: 'mc', header: 'Meal cost', align: 'right', render: ({ s }) => taka(s.mealCost) },
              { key: 'b', header: 'Bill share', align: 'right', render: ({ s }) => taka(s.billShare) },
              { key: 'bp', header: 'Bill paid', align: 'right', render: ({ s }) => taka(s.billPayments) },
              { key: 'f', header: 'Final', align: 'right', render: ({ s }) => <b className={s.finalBalance < 0 ? 'text-red-700' : ''}>{taka(s.finalBalance)}</b> },
              { key: 's', header: 'Result', render: ({ s }) => <Badge tone={STATUS[s.status][1]}>{STATUS[s.status][0]}{s.status !== 'settled' ? ` ${taka(s.amount)}` : ''}</Badge> },
            ]}
            renderCard={({ m, s }) => (
              <div>
                <div className="flex items-center gap-2"><Avatar member={m} size={32} /><p className="flex-1 font-semibold text-slate-800">{m.name}</p><Badge tone={STATUS[s.status][1]}>{STATUS[s.status][0]}{s.status !== 'settled' ? ` ${taka(s.amount)}` : ''}</Badge></div>
                <dl className="mt-2 space-y-0.5 text-sm tabular-nums">
                  {[['Opening balance', taka(s.openingBalance)], ['Total deposits', `+ ${taka(s.deposits)}`], [`Meals (${num(s.mealCount)} × ${taka2(s.mealRate)})`, `− ${taka(s.mealCost)}`], ['Bill share', `− ${taka(s.billShare)}`], ['Bill payments', `+ ${taka(s.billPayments)}`]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd>{v}</dd></div>)}
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold"><dt>Final balance</dt><dd className={s.finalBalance < 0 ? 'text-red-700' : ''}>{signedTaka(s.finalBalance).replace('+', '')}</dd></div>
                </dl>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  )
}

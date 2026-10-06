import { useMemo, useState } from 'react'
import { Ban, ExternalLink, ImageIcon, Pencil, ShoppingBasket } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DataList, EmptyState, PageHeader, PageSkeleton, SearchInput, Select, Stat } from '../components/ui'
import { useData } from '../context/DataContext'
import { useConfirm, useQuickAdd } from '../context/UiContext'
import { useAction } from '../hooks/useAction'
import { voidExpense } from '../services/expenses'
import { formatDate } from '../lib/dates'
import { CATEGORIES } from '../config'
import { num, taka, taka2 } from '../lib/format'

export default function ExpensesPage() {
  const d = useData()
  const quick = useQuickAdd()
  const confirm = useConfirm()
  const { run } = useAction()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')

  const rows = useMemo(() => {
    if (d.loading) return []
    const s = q.trim().toLowerCase()
    return d.expenses
      .filter((x) => (!category || x.category === category) && (!s || [x.itemName, x.vendor, x.note, x.category].some((v) => (v || '').toLowerCase().includes(s))))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
  }, [d, q, category])

  if (d.loading) return <PageSkeleton />
  const t = d.result.totals
  const byCat = CATEGORIES.map((c) => [c, d.expenses.filter((x) => x.status !== 'void' && x.category === c).reduce((s, x) => s + x.totalPrice, 0)])
  const doVoid = async (x) => {
    const ok = await confirm({ title: `Void "${x.itemName}"?`, message: `${taka2(x.totalPrice)} will be removed from total expenses and the meal rate will be recalculated. The entry remains visible as voided.`, confirmLabel: 'Void expense' })
    if (ok) run(() => voidExpense(x), 'Expense voided')
  }
  const receipt = (x) => x.receiptUrl ? <a href={x.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700"><ImageIcon className="h-3.5 w-3.5" />Receipt<ExternalLink className="h-3 w-3" /></a> : <span className="text-xs text-slate-400">—</span>
  const actions = (x) => d.canEdit && x.status !== 'void' ? (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" icon={Pencil} onClick={() => quick.open('expense', { expense: x })} aria-label="Edit" />
      <Button variant="ghost" size="sm" icon={Ban} onClick={() => doVoid(x)} aria-label="Void" className="text-red-600" />
    </div>
  ) : null

  return (
    <div className="space-y-4">
      <PageHeader title="Expenses" subtitle="Bazar spending, with receipts" actions={d.canEdit && <Button icon={ShoppingBasket} onClick={() => quick.open('expense')}>Add expense</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total expenses" value={taka(t.expenses)} tone="red" />
        <Stat label="Meal rate" value={t.meals ? taka2(t.mealRate) : '—'} tone="amber" sub={`${num(t.meals)} meals`} />
        {byCat.sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c, v]) => <Stat key={c} label={c} value={taka(v)} tone="slate" sub="Top category" />)}
      </div>
      <Card>
        <CardHeader title={`${rows.length} expense${rows.length === 1 ? '' : 's'}`} />
        <div className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search item, shop, note" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={ShoppingBasket} title={d.expenses.length ? 'No matching expenses' : 'No expenses this month'} text={d.expenses.length ? 'Try clearing the filters.' : 'Bazar entries recorded by the manager will show up here.'} action={d.canEdit && !d.expenses.length ? <Button onClick={() => quick.open('expense')}>Add first expense</Button> : null} />
        ) : (
          <DataList
            rows={rows} rowClass={(x) => (x.status === 'void' ? 'opacity-50' : '')}
            columns={[
              { key: 'date', header: 'Date', render: (x) => formatDate(x.date) },
              { key: 'item', header: 'Item / Ref', render: (x) => <div><p className="font-medium text-slate-800">{x.itemName}</p><p className="text-xs text-slate-500">{x.vendor || 'No vendor'} · {x.paymentMethod}</p><p className="font-mono text-[11px] text-slate-400">{String(x.id).slice(0, 8)}</p></div> },
              { key: 'cat', header: 'Category', render: (x) => <Badge tone="brand">{x.category}</Badge> },
              { key: 'qty', header: 'Qty × Price', align: 'right', render: (x) => `${num(x.quantity)} × ${taka2(x.unitPrice)}` },
              { key: 'receipt', header: 'Receipt', render: receipt },
              { key: 'total', header: 'Total', align: 'right', render: (x) => <span className={`font-semibold ${x.status === 'void' ? 'line-through' : 'text-red-700'}`}>{x.status === 'void' ? <Badge tone="red">Voided</Badge> : null} {taka2(x.totalPrice)}</span> },
              { key: 'act', header: '', align: 'right', render: actions },
            ]}
            renderCard={(x) => (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate font-medium text-slate-800">{x.itemName}</p><p className="text-xs text-slate-500">{formatDate(x.date)} · {x.category}</p></div>
                  <p className={`font-semibold tabular-nums ${x.status === 'void' ? 'line-through' : 'text-red-700'}`}>{taka2(x.totalPrice)}</p>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{num(x.quantity)} × {taka2(x.unitPrice)} · {x.vendor || 'No vendor'} · {x.paymentMethod} {x.status === 'void' && <Badge tone="red">Voided</Badge>}</p>
                {x.note && <p className="mt-0.5 text-xs text-slate-500">{x.note}</p>}
                <div className="mt-1 flex items-center justify-between">{receipt(x)}{actions(x)}</div>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  )
}

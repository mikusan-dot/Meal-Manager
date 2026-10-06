import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Printer } from 'lucide-react'
import { Avatar, Button, Card, CardHeader, DataList, PageHeader, PageSkeleton, Stat } from '../components/ui'
import { useData } from '../context/DataContext'
import { CATEGORIES } from '../config'
import { datesOfMonth, formatMonth } from '../lib/dates'
import { num, taka, taka2 } from '../lib/format'
import { downloadCsv, printPage } from '../lib/export'
import { mealsInEntry } from '../lib/calc'

export default function ReportsPage() {
  const d = useData()
  const charts = useMemo(() => {
    if (d.loading) return null
    const live = d.expenses.filter((e) => e.status !== 'void')
    const days = datesOfMonth(d.month)
    // Cumulative trend: running expenses ÷ running meals → running rate per day
    let cumExp = 0
    let cumMeals = 0
    const mealByDate = {}
    d.meals.forEach((m) => { mealByDate[m.date] = (mealByDate[m.date] || 0) + mealsInEntry(m) })
    const guestByDate = {}
    d.guestMeals.forEach((g) => { guestByDate[g.date] = (guestByDate[g.date] || 0) + Number(g.weight || 0) })
    const trend = days.map((dt) => {
      cumExp += live.filter((e) => e.date === dt).reduce((s, e) => s + e.totalPrice, 0)
      cumMeals += (mealByDate[dt] || 0) + (guestByDate[dt] || 0)
      return { day: Number(dt.slice(8)), spent: live.filter((e) => e.date === dt).reduce((s, e) => s + e.totalPrice, 0), rate: cumMeals > 0 ? Math.round((cumExp / cumMeals) * 100) / 100 : null }
    })
    return {
      category: CATEGORIES.map((c) => ({ name: c.split(' ')[0], full: c, total: live.filter((e) => e.category === c).reduce((s, e) => s + e.totalPrice, 0) })),
      daily: trend,
      perMeal: CATEGORIES.map((c) => {
        const total = live.filter((e) => e.category === c).reduce((s, e) => s + e.totalPrice, 0)
        return { category: c, total, perMeal: d.result.totals.meals > 0 ? Math.round((total / d.result.totals.meals) * 100) / 100 : 0 }
      }),
    }
  }, [d])
  if (d.loading) return <PageSkeleton />
  const t = d.result.totals
  const rows = d.members.map((m) => d.result.byMember[m.id]).filter(Boolean).filter((s) => s.mealCount || s.deposits || s.finalBalance || s.billShare)
  const name = (id) => d.members.find((m) => m.id === id)

  const exportDeposits = () => downloadCsv(`deposits-${d.month}.csv`,
    [['id', 'member', 'date', 'method', 'amount'], ...d.deposits.map((x) => [x.id, name(x.memberId)?.name || x.memberId, x.date, x.method, x.amount])])
  const exportExpenses = () => downloadCsv(`expenses-${d.month}.csv`,
    [['date', 'item', 'category', 'qty', 'unitPrice', 'total', 'vendor'], ...d.expenses.map((x) => [x.date, x.itemName, x.category, x.quantity, x.unitPrice, x.totalPrice, x.vendor || ''])])
  const exportBalances = () => downloadCsv(`balances-${d.month}.csv`,
    [['member', 'deposited', 'meals', 'mealCost', 'mealBalance', 'billShare', 'billPaid', 'billBalance', 'remaining'],
      ...rows.map((r) => [name(r.memberId)?.name, r.deposits, r.mealCount, r.mealCost, r.mealBalance, r.billShare, r.billPayments, r.billBalance, r.finalBalance])])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports" subtitle={formatMonth(d.month)}
        actions={<><Button size="sm" variant="secondary" icon={Download} onClick={exportBalances}>Balances CSV</Button><Button size="sm" variant="secondary" icon={Printer} onClick={printPage}>Print / PDF</Button></>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Deposits" value={taka(t.deposits)} tone="green" />
        <Stat label="Expenses" value={taka(t.expenses)} tone="red" />
        <Stat label="Total meals" value={num(t.meals)} tone="amber" />
        <Stat label="Meal rate" value={t.meals ? taka2(t.mealRate) : '—'} tone="blue" />
        <Stat label="Cash in hand" value={taka(d.result.cash.expected)} tone="brand" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Spending by category" action={<Button size="sm" variant="ghost" onClick={exportExpenses}>CSV</Button>} />
          <div className="h-60 p-3"><ResponsiveContainer><BarChart data={charts.category}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} width={48} /><Tooltip formatter={(v) => taka2(v)} labelFormatter={(_, p) => p?.[0]?.payload.full} /><Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Daily bazar spending" />
          <div className="h-60 p-3"><ResponsiveContainer><BarChart data={charts.daily}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" fontSize={12} interval={2} /><YAxis fontSize={12} width={48} /><Tooltip formatter={(v) => taka2(v)} labelFormatter={(l) => `Day ${l}`} /><Bar dataKey="spent" fill="#d97706" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
      </div>
      <Card>
        <CardHeader title="Meal-rate trend (cumulative)" subtitle="Running expenses ÷ running meals, day by day" />
        <div className="h-60 p-3"><ResponsiveContainer><LineChart data={charts.daily}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" fontSize={12} interval={2} /><YAxis fontSize={12} width={48} /><Tooltip formatter={(v) => (v == null ? '—' : taka2(v))} labelFormatter={(l) => `Day ${l}`} /><Line type="monotone" dataKey="rate" stroke="#0f766e" strokeWidth={2} dot={false} connectNulls /></LineChart></ResponsiveContainer></div>
      </Card>
      <Card>
        <CardHeader title="Cost per meal by category" subtitle={t.meals ? `${taka(t.expenses)} ÷ ${num(t.meals)} meals` : 'No meals yet'} />
        <DataList
          rows={charts.perMeal} rowKey={(r) => r.category}
          columns={[
            { key: 'c', header: 'Category', render: (r) => r.category },
            { key: 't', header: 'Total', align: 'right', render: (r) => taka(r.total) },
            { key: 'p', header: 'Per meal', align: 'right', render: (r) => taka2(r.perMeal) },
          ]}
          renderCard={(r) => <div className="flex justify-between"><span>{r.category}</span><b>{taka(r.total)} · {taka2(r.perMeal)}/meal</b></div>}
        />
        {t.roundingDifference !== 0 && <p className="px-4 py-2 text-xs text-slate-500">Rounding remainder from paisa-split rate: {taka2(t.roundingDifference)} (bazar total − charged meal cost).</p>}
      </Card>
      <Card>
        <CardHeader title="Member balances" subtitle="Meal balance and bill balance are tracked separately" action={<Button size="sm" variant="ghost" onClick={exportDeposits}>Deposits CSV</Button>} />
        <DataList rows={rows} rowKey={(r) => r.memberId}
          columns={[
            { key: 'n', header: 'Member', render: (r) => <span className="flex items-center gap-2"><Avatar member={name(r.memberId)} size={28} />{name(r.memberId)?.name}</span> },
            { key: 'dep', header: 'Deposited', align: 'right', render: (r) => taka(r.deposits) },
            { key: 'ml', header: 'Meals', align: 'right', render: (r) => num(r.mealCount) },
            { key: 'mc', header: 'Meal cost', align: 'right', render: (r) => taka(r.mealCost) },
            { key: 'mb', header: 'Meal bal.', align: 'right', render: (r) => taka(r.mealBalance) },
            { key: 'bb', header: 'Bill bal.', align: 'right', render: (r) => taka(r.billBalance) },
            { key: 'f', header: 'Remaining', align: 'right', render: (r) => <b className={r.finalBalance < 0 ? 'text-red-700' : ''}>{taka(r.finalBalance)}</b> },
          ]}
          renderCard={(r) => (
            <div className="flex items-center justify-between gap-3"><div><p className="font-medium text-slate-800">{name(r.memberId)?.name}</p><p className="text-xs text-slate-500">{num(r.mealCount)} meals · deposited {taka(r.deposits)}</p></div><b className={r.finalBalance < 0 ? 'text-red-700' : ''}>{taka(r.finalBalance)}</b></div>
          )}
        />
      </Card>
      <p className="text-center text-xs text-slate-400">Tip: use Print / PDF for a paper copy, or CSV to open in Excel.</p>
    </div>
  )
}

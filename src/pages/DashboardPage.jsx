import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, Calculator, CalendarDays, Crown, TrendingDown, UserCheck, Users, UtensilsCrossed, Wallet } from 'lucide-react'
import { Avatar, Badge, Banner, Card, CardHeader, EmptyState, PageHeader, PageSkeleton, Stat } from '../components/ui'
import CashCheckCard from '../components/CashCheckCard'
import { useData } from '../context/DataContext'
import { formatDate, formatMonth } from '../lib/dates'
import { num, signedTaka, taka, taka2 } from '../lib/format'
import { Lock } from 'lucide-react'

const millis = (t) => (t?.toMillis ? t.toMillis() : 0)

export default function DashboardPage() {
  const d = useData()
  if (d.loading) return <PageSkeleton />
  const { result, members, month, managerMember, me, deposits, expenses, isStaffNow, canManage, cash, openingStale, locked, isAdmin } = d
  const t = result.totals
  const mine = me ? result.byMember[me.id] : null
  const active = members.filter((m) => m.status === 'active')

  const recent = [
    ...deposits.filter((x) => x.status !== 'void').map((x) => ({ key: x.id, kind: 'in', date: x.date, at: millis(x.createdAt), title: `Deposit · ${members.find((m) => m.id === x.memberId)?.name || '—'}`, sub: `${x.method} · ${x.id}`, amount: x.amount })),
    ...expenses.filter((x) => x.status !== 'void').map((x) => ({ key: x.id, kind: 'out', date: x.date, at: millis(x.createdAt), title: x.itemName, sub: `${x.category}${x.vendor ? ` · ${x.vendor}` : ''}`, amount: -x.totalPrice })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at).slice(0, 8)

  const rows = members.map((m) => ({ m, s: result.byMember[m.id] })).filter(({ m, s }) => s && (m.status === 'active' || s.deposits || s.mealCount || s.finalBalance))
  const owing = rows.filter(({ s }) => s.status === 'due')
  const refundable = rows.filter(({ s }) => s.status === 'refundable')

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" subtitle={`${formatMonth(month)}${managerMember ? ` · Manager: ${managerMember.name}` : ''}`} />

      {!managerMember && (
        <Banner tone="warning" icon={Crown} title={`No manager assigned for ${formatMonth(month)}`} action={isAdmin ? <Link to="/settings" className="text-sm font-semibold underline">Assign</Link> : null}>
          Only the admin can record deposits and expenses until a manager is assigned.
        </Banner>
      )}
      {cash?.mismatch && (
        <Banner tone="danger" icon={AlertTriangle} title="⚠ Cash Mismatch Detected">
          Expected {taka2(cash.expected)} · Actual {taka2(cash.actual)} · Difference <b>{signedTaka(cash.difference)}</b>. Check recent deposits and expenses.
        </Banner>
      )}
      {openingStale && (
        <Banner tone="warning" icon={AlertTriangle} title="Previous month was reopened">Opening balances come from its last settlement and may be outdated. Settle that month again to refresh them.</Banner>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total Deposits" value={taka(t.deposits)} icon={ArrowDownLeft} tone="green" sub="Cash in" />
        <Stat label="Total Expenses" value={taka(t.expenses)} icon={ArrowUpRight} tone="red" sub="Cash out (bazar)" />
        <Stat label="Cash in Hand" value={taka(result.cash.expected)} icon={Banknote} tone="brand" sub={result.cash.opening ? `${taka(result.cash.opening)} brought forward + deposits − expenses` : 'Deposits − expenses'} />
        <Stat label="Current Meal Rate" value={t.meals ? taka2(t.mealRate) : '—'} icon={Calculator} tone="amber" sub={t.meals ? `${taka(t.expenses)} ÷ ${num(t.meals)} meals` : 'No meals recorded yet'} />
      </div>

      {mine && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-white">
            <p className="text-sm text-brand-100">My balance</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{taka(mine.finalBalance)}</p>
            <p className="text-sm text-brand-100">{mine.status === 'refundable' ? 'Money left with the mess' : mine.status === 'due' ? 'You owe the mess' : 'All settled'}</p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 text-sm sm:grid-cols-4 sm:divide-y-0">
            <div className="p-3"><dt className="text-slate-500">Deposited</dt><dd className="font-semibold tabular-nums">{taka(mine.deposits)}</dd></div>
            <div className="p-3"><dt className="text-slate-500">Meal cost <span className="text-xs">({num(mine.mealCount)} meals)</span></dt><dd className="font-semibold tabular-nums">{taka(mine.mealCost)}</dd></div>
            <div className="p-3"><dt className="text-slate-500">Bills</dt><dd className="font-semibold tabular-nums">{taka(mine.billShare)}{mine.billPayments ? <span className="text-xs font-normal text-slate-500"> (paid {taka(mine.billPayments)})</span> : null}</dd></div>
            <div className="p-3"><dt className="text-slate-500">Meal / Bill balance</dt><dd className="font-semibold tabular-nums">{taka(mine.mealBalance)} / {taka(mine.billBalance)}</dd></div>
          </dl>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Recent transactions" action={<Link to="/statements" className="text-sm font-medium text-brand-700">Statements</Link>} />
            {recent.length === 0 ? (
              <EmptyState icon={Wallet} title="No transactions yet" text="Deposits and bazar expenses will appear here as they are recorded." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((r) => (
                  <li key={r.key} className="flex items-center gap-3 px-4 py-3">
                    <span className={`rounded-xl p-2 ${r.kind === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.kind === 'in' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span>
                    <div className="min-w-0 flex-1"><p className="truncate font-medium text-slate-800">{r.title}</p><p className="truncate text-xs text-slate-500">{formatDate(r.date)} · {r.sub}</p></div>
                    <p className={`font-semibold tabular-nums ${r.kind === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>{signedTaka(r.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isStaffNow || canManage ? (
            <Card>
              <CardHeader title="Member balances" subtitle={`${owing.length} owe · ${refundable.length} have money left`} action={<Link to="/settlement" className="text-sm font-medium text-brand-700">Settlement</Link>} />
              <ul className="divide-y divide-slate-100">
                {rows.map(({ m, s }) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar member={m} size={34} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{m.name}</p><p className="text-xs text-slate-500">{num(s.mealCount)} meals · deposited {taka(s.deposits)}</p></div>
                    <div className="text-right"><p className={`font-semibold tabular-nums ${s.status === 'due' ? 'text-red-700' : 'text-slate-900'}`}>{taka(s.finalBalance)}</p>{s.status !== 'settled' && <Badge tone={s.status === 'due' ? 'red' : 'green'}>{s.status === 'due' ? 'Owes' : 'Has'}</Badge>}</div>
                  </li>
                ))}
                {rows.length === 0 && <EmptyState icon={Users} title="No members yet" text="Add members to start tracking balances." />}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="This month" />
            <dl className="divide-y divide-slate-100 text-sm">
              {[
                [CalendarDays, 'Current month', <span key="m" className="flex items-center gap-1.5">{formatMonth(month)}{locked && <Badge tone="slate"><Lock className="h-3 w-3" />Closed</Badge>}</span>],
                [Crown, 'Current manager', managerMember?.name || 'Not assigned'],
                [Users, 'Total members', members.length],
                [UserCheck, 'Active members', active.length],
                [UtensilsCrossed, 'Total meals', <span key="t">{num(t.meals)}{t.guestMeals ? <span className="text-xs text-slate-500"> (incl. {num(t.guestMeals)} guest)</span> : null}</span>],
                [TrendingDown, 'Meal cost charged', taka(t.mealCost)],
              ].map(([Icon, label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5"><dt className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" />{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>
              ))}
            </dl>
          </Card>
          {canManage && <CashCheckCard />}
        </div>
      </div>
    </div>
  )
}

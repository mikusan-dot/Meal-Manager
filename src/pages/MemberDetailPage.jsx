import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Crown, Pencil, Phone, DoorOpen, CalendarDays, ShieldCheck, UserMinus, UserCheck } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, PageSkeleton, EmptyState } from '../components/ui'
import MemberForm from '../components/forms/MemberForm'
import { useData } from '../context/DataContext'
import { useConfirm } from '../context/UiContext'
import { useAction } from '../hooks/useAction'
import { setAdminRole, setMemberStatus, subscribeUsers } from '../services/members'
import { formatDate, todayStr } from '../lib/dates'
import { num, taka } from '../lib/format'

export default function MemberDetailPage() {
  const { id } = useParams()
  const d = useData()
  const nav = useNavigate()
  const confirm = useConfirm()
  const { run } = useAction()
  const [edit, setEdit] = useState(false)
  const [users, setUsers] = useState([])
  useEffect(() => (d.isAdmin ? subscribeUsers(setUsers) : undefined), [d.isAdmin])
  if (d.loading) return <PageSkeleton />
  const m = d.members.find((x) => x.id === id)
  if (!m) return <EmptyState title="Member not found" action={<Button onClick={() => nav(-1)}>Go back</Button>} />
  const s = d.result.byMember[m.id]
  const canAdminister = d.isStaffNow
  const isAdminUser = users.find((u) => u.memberId === m.id)?.role === 'admin'
  const toggleStatus = async () => {
    const leaving = m.status === 'active'
    const ok = await confirm({ title: leaving ? `Deactivate ${m.name}?` : `Reactivate ${m.name}?`, message: leaving ? 'They will be marked as left (today) and hidden from new entries. All deposits, meals and balances are kept.' : 'They will become an active member again.', confirmLabel: leaving ? 'Deactivate' : 'Reactivate', danger: leaving })
    if (ok) run(() => setMemberStatus(m, leaving ? 'inactive' : 'active', todayStr()), leaving ? 'Member deactivated' : 'Member reactivated')
  }
  const isMgr = d.manager?.memberId === m.id

  return (
    <div className="space-y-4">
      <Link to={canAdminister ? '/members' : '/'} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500"><ChevronLeft className="h-4 w-4" />Back</Link>
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar member={m} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-slate-900">{m.name}</h1>
            <p className="truncate text-sm text-slate-500">{m.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5"><Badge tone={m.status === 'active' ? 'green' : 'slate'}>{m.status}</Badge>{isMgr && <Badge tone="amber"><Crown className="h-3 w-3" />Manager this month</Badge>}{isAdminUser && <Badge tone="blue"><ShieldCheck className="h-3 w-3" />Admin</Badge>}{!m.uid && <Badge tone="amber">Not signed up yet</Badge>}</div>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="flex items-center gap-1 text-slate-500"><Phone className="h-3.5 w-3.5" />Phone</dt><dd className="font-medium">{m.phone}</dd></div>
          <div><dt className="flex items-center gap-1 text-slate-500"><DoorOpen className="h-3.5 w-3.5" />Room</dt><dd className="font-medium">{m.roomNumber}</dd></div>
          <div><dt className="flex items-center gap-1 text-slate-500"><CalendarDays className="h-3.5 w-3.5" />Joined</dt><dd className="font-medium">{formatDate(m.joinDate)}</dd></div>
          <div><dt className="text-slate-500">Left</dt><dd className="font-medium">{m.leaveDate ? formatDate(m.leaveDate) : '—'}</dd></div>
        </dl>
        {canAdminister && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" icon={Pencil} onClick={() => setEdit(true)}>Edit</Button>
            <Button variant="secondary" icon={m.status === 'active' ? UserMinus : UserCheck} onClick={toggleStatus}>{m.status === 'active' ? 'Deactivate' : 'Reactivate'}</Button>
            {d.isAdmin && m.uid && <Button variant="ghost" icon={ShieldCheck} onClick={() => run(() => setAdminRole(m.id, !isAdminUser), isAdminUser ? 'Admin rights removed' : 'Made admin')}>{isAdminUser ? 'Remove admin' : 'Make admin'}</Button>}
          </div>
        )}
      </Card>
      {s && (
        <Card>
          <CardHeader title="Balance this month" action={<Link to={`/statements?member=${m.id}`} className="text-sm font-medium text-brand-700">Full statement</Link>} />
          <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 text-sm sm:grid-cols-4 sm:divide-y-0">
            <div className="p-3"><dt className="text-slate-500">Brought forward</dt><dd className="font-semibold tabular-nums">{taka(s.openingBalance)}</dd></div>
            <div className="p-3"><dt className="text-slate-500">Deposited</dt><dd className="font-semibold tabular-nums">{taka(s.deposits)}</dd></div>
            <div className="p-3"><dt className="text-slate-500">Meals ({num(s.mealCount)})</dt><dd className="font-semibold tabular-nums">{taka(s.mealCost)}</dd></div>
            <div className="p-3"><dt className="text-slate-500">Bills</dt><dd className="font-semibold tabular-nums">{taka(s.billShare)}</dd></div>
          </dl>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3"><span className="font-medium text-slate-600">Remaining</span><span className={`text-xl font-bold tabular-nums ${s.finalBalance < 0 ? 'text-red-700' : 'text-slate-900'}`}>{taka(s.finalBalance)}</span></div>
        </Card>
      )}
      {edit && <MemberForm member={m} onClose={() => setEdit(false)} />}
    </div>
  )
}

import { useState } from 'react'
import { Camera, LogOut, KeyRound } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader, PageSkeleton } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useAction } from '../hooks/useAction'
import { updateOwnProfile, uploadProfilePhoto } from '../services/members'
import { ENABLE_STORAGE } from '../config'
import { formatDate } from '../lib/dates'
import { num, taka } from '../lib/format'

export default function ProfilePage() {
  const d = useData()
  const { user, signOut, resetPassword, isAdmin } = useAuth()
  const { busy, run } = useAction()
  const [phone, setPhone] = useState(null)
  if (d.loading) return <PageSkeleton />
  const m = d.me
  if (!m) return null
  const s = d.result.byMember[m.id]
  const upload = (file) => file && run(async () => updateOwnProfile(m.id, { phone: m.phone, photoUrl: await uploadProfilePhoto(m.id, file) }), 'Photo updated')

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="My profile" />
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="relative"><Avatar member={m} size={72} />{ENABLE_STORAGE && <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-brand-700 p-1.5 text-white shadow"><Camera className="h-3.5 w-3.5" /><input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /></label>}</div>
          <div><h2 className="text-lg font-bold">{m.name}</h2><p className="text-sm text-slate-500">{user.email}</p><div className="mt-1 flex gap-1.5"><Badge tone="brand">Room {m.roomNumber}</Badge>{isAdmin ? <Badge tone="blue">Admin</Badge> : d.isManager ? <Badge tone="amber">Manager</Badge> : <Badge>Member</Badge>}</div></div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Joined</dt><dd className="font-medium">{formatDate(m.joinDate)}</dd></div><div><dt className="text-slate-500">Status</dt><dd className="font-medium capitalize">{m.status}</dd></div></dl>
        <form className="mt-4 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); run(() => updateOwnProfile(m.id, { phone: phone ?? m.phone }), 'Phone updated') }}>
          <Field label="Phone number" className="flex-1"><Input type="tel" value={phone ?? m.phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Button type="submit" loading={busy} disabled={phone === null || phone === m.phone}>Save</Button>
        </form>
      </Card>
      {s && (
        <Card>
          <CardHeader title="My balance" subtitle="This month" />
          <dl className="grid grid-cols-2 gap-px bg-slate-100 text-sm sm:grid-cols-4">
            {[['Deposited', taka(s.deposits)], ['Meals', `${num(s.mealCount)} · ${taka(s.mealCost)}`], ['Bills', taka(s.billShare)], ['Remaining', taka(s.finalBalance)]].map(([k, v]) => <div key={k} className="bg-white p-3"><dt className="text-slate-500">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}
          </dl>
        </Card>
      )}
      <Card className="flex flex-wrap gap-2 p-4">
        <Button variant="secondary" icon={KeyRound} onClick={() => run(() => resetPassword(user.email), 'Password reset email sent')}>Change password</Button>
        <Button variant="secondary" icon={LogOut} onClick={signOut}>Sign out</Button>
      </Card>
    </div>
  )
}

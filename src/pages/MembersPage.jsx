import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Users } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, PageSkeleton, SearchInput, Segmented, DataList } from '../components/ui'
import MemberForm from '../components/forms/MemberForm'
import { useData } from '../context/DataContext'
import { formatDate } from '../lib/dates'
import { taka } from '../lib/format'

export default function MembersPage() {
  const d = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('active')
  const [adding, setAdding] = useState(false)
  if (d.loading) return <PageSkeleton />

  const s = q.trim().toLowerCase()
  const rows = d.members
    .filter((m) => (filter === 'all' || m.status === filter) && (!s || [m.name, m.phone, m.roomNumber, m.email].some((v) => (v || '').toLowerCase().includes(s))))
    .sort((a, b) => a.name.localeCompare(b.name))
  const bal = (m) => d.result.byMember[m.id]?.finalBalance ?? 0

  return (
    <div className="space-y-4">
      <PageHeader title="Members" subtitle={`${d.members.filter((m) => m.status === 'active').length} active · ${d.members.length} total`} actions={<Button icon={UserPlus} onClick={() => setAdding(true)}>Add member</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <div className="min-w-[12rem] flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search name, phone, room" /></div>
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'all', label: 'All' }]} />
        </div>
        {rows.length === 0 ? <EmptyState icon={Users} title="No members found" text="Add the people who live here. They sign up with the email you enter." action={<Button onClick={() => setAdding(true)}>Add member</Button>} /> : (
          <DataList
            rows={rows}
            columns={[
              { key: 'n', header: 'Member', render: (m) => <button onClick={() => nav(`/members/${m.id}`)} className="flex items-center gap-2 text-left"><Avatar member={m} size={32} /><span><span className="block font-medium text-slate-800">{m.name}</span><span className="block text-xs text-slate-500">{m.email}</span></span></button> },
              { key: 'p', header: 'Phone', render: (m) => m.phone },
              { key: 'r', header: 'Room', render: (m) => m.roomNumber },
              { key: 'j', header: 'Joined', render: (m) => formatDate(m.joinDate) },
              { key: 's', header: 'Status', render: (m) => <Badge tone={m.status === 'active' ? 'green' : 'slate'}>{m.status}</Badge> },
              { key: 'b', header: 'Balance', align: 'right', render: (m) => <span className={`font-semibold ${bal(m) < 0 ? 'text-red-700' : ''}`}>{taka(bal(m))}</span> },
            ]}
            renderCard={(m) => (
              <button onClick={() => nav(`/members/${m.id}`)} className="flex w-full items-center gap-3 text-left">
                <Avatar member={m} size={42} />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-800">{m.name}</span><span className="block text-xs text-slate-500">Room {m.roomNumber} · {m.phone}</span></span>
                <span className="text-right"><span className={`block font-semibold tabular-nums ${bal(m) < 0 ? 'text-red-700' : ''}`}>{taka(bal(m))}</span><Badge tone={m.status === 'active' ? 'green' : 'slate'}>{m.status}</Badge></span>
              </button>
            )}
          />
        )}
      </Card>
      {adding && <MemberForm onClose={() => setAdding(false)} />}
    </div>
  )
}

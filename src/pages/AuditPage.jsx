import { useEffect, useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { Badge, Card, CardHeader, DataList, EmptyState, Field, PageHeader, PageSkeleton, SearchInput, Select } from '../components/ui'
import { useData } from '../context/DataContext'
import { subscribeAudit } from '../services/audit'
import { formatDateTime } from '../lib/dates'

export default function AuditPage() {
  const d = useData()
  const [logs, setLogs] = useState(undefined)
  const [q, setQ] = useState('')
  const [entity, setEntity] = useState('')

  useEffect(() => {
    if (d.loading) return
    return subscribeAudit(d.month, setLogs, () => setLogs([]))
  }, [d.loading, d.month])

  const rows = useMemo(() => {
    const list = logs || []
    return list.filter((l) =>
      (!entity || l.entity === entity) &&
      (!q || `${l.summary || ''} ${l.entityId || ''} ${l.actorMemberId || ''}`.toLowerCase().includes(q.toLowerCase())),
    )
  }, [logs, q, entity])

  if (d.loading || logs === undefined) return <PageSkeleton />
  const entities = [...new Set((logs || []).map((l) => l.entity))].sort()

  return (
    <div className="space-y-4">
      <PageHeader title="Audit log" subtitle={`${d.month} · who changed what`} />
      <Card className="flex flex-wrap gap-3 p-3">
        <div className="min-w-[12rem] flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search summary, id, actor…" /></div>
        <Field label="Entity"><Select value={entity} onChange={(e) => setEntity(e.target.value)}><option value="">All</option>{entities.map((e) => <option key={e} value={e}>{e}</option>)}</Select></Field>
      </Card>
      <Card>
        <CardHeader title={`${rows.length} changes`} />
        {rows.length === 0 ? <EmptyState icon={History} title="No changes logged" text="Enable audit logging and edits will appear here with old vs new values." /> : (
          <DataList
            rows={rows}
            columns={[
              { key: 'w', header: 'When', render: (r) => <span className="whitespace-nowrap text-xs">{formatDateTime(r.createdAt)}</span> },
              { key: 'a', header: 'Action', render: (r) => <Badge tone="slate">{r.action}</Badge> },
              { key: 'e', header: 'What', render: (r) => <span><b>{r.entity}</b> <span className="text-xs text-slate-500">{String(r.entityId || '').slice(0, 18)}</span><br /><span className="text-xs">{r.summary}</span></span> },
              { key: 'c', header: 'Change', render: (r) => <span className="text-xs text-slate-600">{r.before ? JSON.stringify(r.before).slice(0, 120) : '—'} → {r.after ? JSON.stringify(r.after).slice(0, 120) : '—'}</span> },
            ]}
            renderCard={(r) => (
              <div>
                <p className="text-sm font-medium">{r.summary || `${r.action} ${r.entity}`}</p>
                <p className="text-xs text-slate-500">{formatDateTime(r.createdAt)} · {r.entity}/{r.action}</p>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  )
}

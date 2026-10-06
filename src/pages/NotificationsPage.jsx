import { BellRing } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, PageSkeleton } from '../components/ui'
import { useData } from '../context/DataContext'
import { markNotificationRead, evaluateTriggers } from '../services/notifications'
import { formatDateTime } from '../lib/dates'
import { useToast } from '../context/UiContext'
import { friendlyError } from '../services/common'

export default function NotificationsPage() {
  const d = useData()
  const toast = useToast()
  if (d.loading) return <PageSkeleton />

  const live = evaluateTriggers({ members: d.members, result: d.result, cutoffs: d.cutoffs })
  const mine = (d.notifications || []).filter((n) => !d.me || n.memberId === d.me.id)
  const seen = new Set(mine.map((n) => n.dedupeKey).filter(Boolean))
  const suggested = live.filter((t) => (!d.me || t.memberId === d.me.id) && t.dedupeKey && !seen.has(t.dedupeKey))

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Notifications" subtitle={d.unreadCount ? `${d.unreadCount} unread` : 'You are all caught up'} />
      {suggested.length > 0 && (
        <Card>
          <CardHeader title="Suggested right now" subtitle="Computed live from balances and bills" />
          <ul className="divide-y divide-slate-100">
            {suggested.slice(0, 10).map((s) => (
              <li key={s.dedupeKey} className="flex items-center gap-3 px-4 py-3">
                <BellRing className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1"><p className="text-sm font-medium">{s.title}</p><p className="text-xs text-slate-500">{s.body}</p></div>
                <Badge tone="amber">Live</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <CardHeader title="History" />
        {mine.length === 0 ? <EmptyState icon={BellRing} title="No notifications yet" text="Low balance, bill due and large expense alerts will appear here." /> : (
          <ul className="divide-y divide-slate-100">
            {mine.map((n) => (
              <li key={n.id} className={`flex items-center gap-3 px-4 py-3 ${n.read ? 'opacity-60' : ''}`}>
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                  <p className="text-[11px] text-slate-400">{formatDateTime(n.createdAt)} · {n.type.replace(/_/g, ' ')}</p>
                </div>
                {!n.read && <Button size="sm" variant="soft" onClick={() => markNotificationRead(n.id).catch((e) => toast.error(friendlyError(e)))}>Mark read</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

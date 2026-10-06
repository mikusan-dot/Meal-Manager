import { Inbox } from 'lucide-react'

export function Card({ children, className = '', ...props }) {
  return <section {...props} className={`card ${className}`}>{children}</section>
}

export function CardHeader({ title, action, subtitle }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-800', red: 'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-800', blue: 'bg-sky-100 text-sky-800', brand: 'bg-brand-100 text-brand-800',
}
export function Badge({ tone = 'slate', children }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
}

const STAT_TONES = {
  brand: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700', blue: 'bg-sky-50 text-sky-700', slate: 'bg-slate-100 text-slate-600',
}
export function Stat({ label, value, icon: Icon, tone = 'brand', sub, big = false }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && <span className={`rounded-lg p-1.5 ${STAT_TONES[tone]}`}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className={`mt-2 font-bold tabular-nums text-slate-900 ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export function Avatar({ member, size = 40 }) {
  const initials = (member?.name || '?').split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
  const style = { width: size, height: size, fontSize: size * 0.38 }
  return member?.photoUrl
    ? <img src={member.photoUrl} alt={member.name} style={style} className="shrink-0 rounded-full object-cover" />
    : <span style={style} className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800">{initials}</span>
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="rounded-2xl bg-slate-100 p-3 text-slate-400"><Icon className="h-7 w-7" /></span>
      <h3 className="mt-3 font-semibold text-slate-800">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
}
export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-64" />
    </div>
  )
}

const BANNER = {
  warning: 'border-amber-300 bg-amber-50 text-amber-900', danger: 'border-red-300 bg-red-50 text-red-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900', success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  locked: 'border-slate-300 bg-slate-100 text-slate-800',
}
export function Banner({ tone = 'info', icon: Icon, title, children, action }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${BANNER[tone]}`}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl bg-slate-100 p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >{o.label}</button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field pl-9" />
    </div>
  )
}

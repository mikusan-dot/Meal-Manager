import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { addMonths, currentMonthKey, formatMonth } from '../../lib/dates'

export default function MonthSwitcher() {
  const { month, setMonth, locked } = useData()
  const isCurrent = month === currentMonthKey()
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-card">
      <button onClick={() => setMonth(addMonths(month, -1))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
      <button onClick={() => setMonth(currentMonthKey())} className="flex min-w-[8.5rem] items-center justify-center gap-1.5 px-1 text-sm font-semibold text-slate-800" title="Jump to this month">
        {locked && <Lock className="h-3.5 w-3.5 text-slate-500" />}
        {formatMonth(month)}
      </button>
      <button onClick={() => setMonth(addMonths(month, 1))} disabled={isCurrent} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
    </div>
  )
}

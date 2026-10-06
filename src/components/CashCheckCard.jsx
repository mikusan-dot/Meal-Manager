import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button, Card, CardHeader, Input } from './ui'
import { useData } from '../context/DataContext'
import { useAction } from '../hooks/useAction'
import { saveActualCash } from '../services/months'
import { taka2, signedTaka } from '../lib/format'
import { formatDateTime } from '../lib/dates'

/** Manager counts the real cash; the app compares it with deposits − expenses and flags any gap immediately. */
export default function CashCheckCard() {
  const { month, result, cash, settings, canEdit } = useData()
  const [val, setVal] = useState('')
  const { busy, run } = useAction()
  useEffect(() => { setVal(settings?.actualCash ?? '') }, [settings?.actualCash, month])

  return (
    <Card>
      <CardHeader title="Cash check" subtitle="Count the cash you hold and compare it with the books" />
      <div className="space-y-3 p-4">
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="label">Actual cash in hand (৳)</span>
            <Input type="number" inputMode="decimal" min="0" step="any" value={val} onChange={(e) => setVal(e.target.value)} disabled={!canEdit} placeholder="Enter counted cash" />
          </label>
          {canEdit && <Button loading={busy} onClick={() => run(() => saveActualCash(month, val === '' ? '' : Number(val)), val === '' ? 'Cash count cleared' : 'Cash count saved')}>Save</Button>}
        </div>
        {cash ? (
          <div className={`rounded-xl border p-3 text-sm ${cash.mismatch ? 'border-red-300 bg-red-50 text-red-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            <p className="flex items-center gap-2 font-semibold">
              {cash.mismatch ? <><AlertTriangle className="h-4 w-4" /> ⚠ Cash Mismatch Detected</> : <><CheckCircle2 className="h-4 w-4" /> Cash matches the books</>}
            </p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div><dt className="text-xs opacity-70">Expected</dt><dd className="font-bold tabular-nums">{taka2(cash.expected)}</dd></div>
              <div><dt className="text-xs opacity-70">Actual</dt><dd className="font-bold tabular-nums">{taka2(cash.actual)}</dd></div>
              <div><dt className="text-xs opacity-70">Difference</dt><dd className="font-bold tabular-nums">{signedTaka(cash.difference)}</dd></div>
            </dl>
            {settings?.actualCashAt && <p className="mt-2 text-xs opacity-70">Counted {formatDateTime(settings.actualCashAt)}. Recount if deposits or expenses were added since.</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Expected cash right now is <b>{taka2(result.cash.expected)}</b>. Enter what you actually hold to check.</p>
        )}
      </div>
    </Card>
  )
}

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { ConfirmDialog } from '../components/ui/Modal'

const UiContext = createContext(null)
export const useToast = () => useContext(UiContext).toast
export const useConfirm = () => useContext(UiContext).confirm
export const useQuickAdd = () => useContext(UiContext).quickAdd

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const TONES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}

/** Toasts, promise-based confirm dialogs, and the "quick add" modal host (FAB + page buttons). */
export function UiProvider({ children, renderQuickAdd }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const [quick, setQuick] = useState(null)
  const seq = useRef(0)

  const push = useCallback((type, message) => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-2), { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3500)
  }, [])

  const toast = useMemo(() => ({
    success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m),
  }), [push])

  const confirm = useCallback((opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })), [])
  const settle = (v) => { confirmState?.resolve(v); setConfirmState(null) }

  const value = useMemo(() => ({
    toast, confirm,
    quickAdd: { open: (kind, props = {}) => setQuick({ kind, props }), close: () => setQuick(null) },
  }), [toast, confirm])

  return (
    <UiContext.Provider value={value}>
      {children}
      {quick && renderQuickAdd(quick, () => setQuick(null))}
      <ConfirmDialog state={confirmState} onCancel={() => settle(false)} onConfirm={() => settle(true)} />
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          return (
            <div key={t.id} className={`pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm shadow-lg ${TONES[t.type]}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1">{t.message}</p>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss"><X className="h-4 w-4 opacity-60" /></button>
            </div>
          )
        })}
      </div>
    </UiContext.Provider>
  )
}

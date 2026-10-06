import { useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

/** Bottom sheet on phones, centred dialog on larger screens. */
export default function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe flex gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ state, onCancel, onConfirm }) {
  if (!state) return null
  return (
    <Modal
      title={state.title || 'Are you sure?'}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant={state.danger === false ? 'primary' : 'danger'} className="flex-1" onClick={onConfirm}>{state.confirmLabel || 'Confirm'}</Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{state.message}</p>
    </Modal>
  )
}

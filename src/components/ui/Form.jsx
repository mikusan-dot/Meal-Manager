import { forwardRef } from 'react'

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600" role="alert">{error}</span>}
    </label>
  )
}

export const Input = forwardRef(function Input({ invalid, className = '', ...props }, ref) {
  return <input ref={ref} {...props} className={`field ${invalid ? 'border-red-400' : ''} ${className}`} />
})

export function Select({ children, invalid, className = '', ...props }) {
  return <select {...props} className={`field appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><path d=%22M4 6l4 4 4-4%22/></svg>')] bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10 ${invalid ? 'border-red-400' : ''} ${className}`}>{children}</select>
}

export function Textarea({ className = '', ...props }) {
  return <textarea rows={2} {...props} className={`field ${className}`} />
}

/** Number input that yields a JS number (or '' while empty). */
export function NumberInput({ value, onChange, ...props }) {
  return (
    <Input
      type="number" inputMode="decimal" step="any" min="0" value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      {...props}
    />
  )
}

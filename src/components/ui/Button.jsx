import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-600/40 disabled:bg-brand-700/50',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400/40',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40 disabled:bg-red-600/50',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400/40',
  soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100 focus-visible:ring-brand-600/30',
}
const SIZES = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-4 py-2.5 text-sm gap-2', lg: 'px-5 py-3 text-base gap-2' }

export default function Button({ variant = 'primary', size = 'md', loading, icon: Icon, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}

import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, LogOut, Lock, MoreHorizontal, Plus, UtensilsCrossed, X, Wallet, ShoppingBasket, Receipt, HandCoins, Users } from 'lucide-react'
import { NAV } from './nav'
import { Avatar, Banner, Button, MonthSwitcher } from '../ui'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useQuickAdd } from '../../context/UiContext'
import { formatMonth } from '../../lib/dates'

export default function AppShell() {
  const { signOut } = useAuth()
  const { me, canManage, canEdit, isStaffNow, locked, month, error, isAdmin, unreadCount, lowStock } = useData()
  const [more, setMore] = useState(false)
  const [fab, setFab] = useState(false)
  const quick = useQuickAdd()
  const nav = useNavigate()
  const { pathname } = useLocation()

  const items = NAV.filter((n) => n.access === 'all' || isStaffNow || isAdmin)
  const bottom = items.filter((n) => n.bottom)
  const moreItems = items.filter((n) => !n.bottom)

  // Floating action button: what can this person add right now?
  const actions = []
  if (canEdit) {
    actions.push({ label: 'Add deposit', icon: Wallet, run: () => quick.open('deposit') })
    actions.push({ label: 'Add expense', icon: ShoppingBasket, run: () => quick.open('expense') })
    actions.push({ label: 'Bill payment', icon: HandCoins, run: () => quick.open('billPayment') })
  }
  if (!locked) actions.push({ label: 'Add guest meal', icon: UtensilsCrossed, run: () => quick.open('guestMeal') })
  const onFab = () => (actions.length === 1 ? actions[0].run() : setFab((v) => !v))

  const linkCls = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
          <div><p className="font-bold leading-tight text-slate-900">Meal Manager</p><p className="text-xs text-slate-500">Shared residence</p></div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {items.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkCls}><n.icon className="h-[18px] w-[18px]" />{n.label}</NavLink>)}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button onClick={() => nav('/profile')} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50">
            <Avatar member={me} size={36} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{me?.name}</span><span className="block text-xs text-slate-500">{isAdmin ? 'Admin' : canManage ? 'Manager' : 'Member'}</span></span>
          </button>
          <button onClick={signOut} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 lg:hidden"><img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg" /><span className="font-bold text-slate-900">Meals</span></div>
          <div className="hidden text-sm text-slate-500 lg:block">Hello, <b className="text-slate-800">{me?.name?.split(' ')[0]}</b></div>
          <MonthSwitcher />
          <div className="flex items-center gap-1">
            <button onClick={() => nav('/notifications')} className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {(unreadCount > 0 || (lowStock?.length > 0 && canManage)) && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unreadCount > 0 ? unreadCount : lowStock.length}</span>
              )}
            </button>
            <button onClick={() => nav('/profile')} className="lg:hidden" aria-label="Profile"><Avatar member={me} size={34} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-4 lg:pb-12">
        {locked && (
          <div className="mb-4">
            <Banner tone="locked" icon={Lock} title={`🔒 ${formatMonth(month)} — Month Closed`}>Nothing in this month can be edited. Only an admin can reopen it.</Banner>
          </div>
        )}
        {error && (
          <div className="mb-4"><Banner tone="danger" icon={AlertTriangle} title="Some data could not be loaded">{error.code === 'permission-denied' ? 'Your account does not have access to this data yet.' : error.message}</Banner></div>
        )}
        <Outlet />
      </main>

      {/* Floating action button */}
      {actions.length > 0 && (
        <>
          {fab && <button className="fixed inset-0 z-30 cursor-default bg-slate-900/20" aria-label="Close menu" onClick={() => setFab(false)} />}
          <div className="fixed bottom-[5.25rem] right-4 z-40 flex flex-col items-end gap-2 lg:bottom-8 lg:right-8">
            {fab && actions.map((a) => (
              <button key={a.label} onClick={() => { setFab(false); a.run() }} className="flex items-center gap-2 rounded-full bg-white py-2 pl-4 pr-3 text-sm font-semibold text-slate-800 shadow-lg ring-1 ring-slate-200">
                {a.label}<span className="rounded-full bg-brand-100 p-1.5 text-brand-800"><a.icon className="h-4 w-4" /></span>
              </button>
            ))}
            <button onClick={onFab} aria-label="Add" className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-xl transition hover:bg-brand-800 active:scale-95">
              <Plus className={`h-7 w-7 transition-transform ${fab ? 'rotate-45' : ''}`} />
            </button>
          </div>
        </>
      )}

      {/* Bottom nav (mobile) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {bottom.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-700' : 'text-slate-500'}`}>
              <n.icon className="h-5 w-5" />{n.short || n.label}
            </NavLink>
          ))}
          <button onClick={() => setMore(true)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${moreItems.some((m) => pathname.startsWith(m.to)) ? 'text-brand-700' : 'text-slate-500'}`}>
            <MoreHorizontal className="h-5 w-5" />More
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMore(false)} />
          <div className="pb-safe absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4">
            <div className="mb-2 flex items-center justify-between px-1"><p className="font-semibold">More</p><button onClick={() => setMore(false)} aria-label="Close"><X className="h-5 w-5 text-slate-500" /></button></div>
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map((n) => (
                <button key={n.to} onClick={() => { setMore(false); nav(n.to) }} className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 py-4 text-xs font-medium text-slate-700 active:bg-slate-100">
                  <n.icon className="h-6 w-6 text-brand-700" />{n.label}
                </button>
              ))}
            </div>
            <Button variant="secondary" className="mt-3 w-full" icon={LogOut} onClick={signOut}>Sign out</Button>
          </div>
        </div>
      )}
    </div>
  )
}

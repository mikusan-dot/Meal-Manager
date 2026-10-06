import {
  LayoutDashboard, UtensilsCrossed, ShoppingBasket, Wallet, Receipt, Users, ScrollText, BarChart3, UserCircle, Settings, Scale,
  Package, History, Bell,
} from 'lucide-react'

/** access: 'all' | 'staff' (manager of the current month, or admin) */
export const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, access: 'all', bottom: true },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed, access: 'all', bottom: true },
  { to: '/expenses', label: 'Expenses', icon: ShoppingBasket, access: 'all', bottom: true },
  { to: '/deposits', label: 'Deposits', icon: Wallet, access: 'all', bottom: true },
  { to: '/bills', label: 'Bills', icon: Receipt, access: 'all' },
  { to: '/settlement', label: 'Settlement', icon: Scale, access: 'all' },
  { to: '/members', label: 'Members', icon: Users, access: 'staff' },
  { to: '/statements', label: 'Statements', icon: ScrollText, access: 'all' },
  { to: '/reports', label: 'Reports', icon: BarChart3, access: 'all' },
  { to: '/inventory', label: 'Inventory', icon: Package, access: 'all' },
  { to: '/notifications', label: 'Alerts', icon: Bell, access: 'all' },
  { to: '/audit', label: 'Audit', icon: History, access: 'staff' },
  { to: '/profile', label: 'Profile', icon: UserCircle, access: 'all' },
  { to: '/settings', label: 'Settings', icon: Settings, access: 'staff' },
]

import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './firebase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import { UiProvider } from './context/UiContext'
import AppShell from './components/layout/AppShell'
import QuickAddHost from './components/forms/QuickAddHost'
import { PageSkeleton } from './components/ui'
import { ConfigMissing, LoginPage, NoMemberPage, SetupPage, VerifyEmailPage } from './pages/AuthPages'

import DashboardPage from './pages/DashboardPage'
import MealsPage from './pages/MealsPage'
import ExpensesPage from './pages/ExpensesPage'
import DepositsPage from './pages/DepositsPage'

// Less-used screens are split into their own chunks (keeps first load small on mobile data)
const BillsPage = lazy(() => import('./pages/BillsPage'))
const SettlementPage = lazy(() => import('./pages/SettlementPage'))
const MembersPage = lazy(() => import('./pages/MembersPage'))
const MemberDetailPage = lazy(() => import('./pages/MemberDetailPage'))
const StatementsPage = lazy(() => import('./pages/StatementsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const AuditPage = lazy(() => import('./pages/AuditPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))

function Splash() {
  return <div className="mx-auto max-w-6xl p-6"><PageSkeleton /></div>
}

function StaffOnly({ children }) {
  const { isStaffNow, isAdmin, loading } = useData()
  if (loading) return <PageSkeleton />
  return isStaffNow || isAdmin ? children : <Navigate to="/" replace />
}

function Authed() {
  return (
    <DataProvider>
      <UiProvider renderQuickAdd={(quick, close) => <QuickAddHost quick={quick} onClose={close} />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="meals" element={<MealsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="deposits" element={<DepositsPage />} />
            <Route path="bills" element={<Suspense fallback={<PageSkeleton />}><BillsPage /></Suspense>} />
            <Route path="settlement" element={<Suspense fallback={<PageSkeleton />}><SettlementPage /></Suspense>} />
            <Route path="members" element={<StaffOnly><Suspense fallback={<PageSkeleton />}><MembersPage /></Suspense></StaffOnly>} />
            <Route path="members/:id" element={<StaffOnly><Suspense fallback={<PageSkeleton />}><MemberDetailPage /></Suspense></StaffOnly>} />
            <Route path="statements" element={<Suspense fallback={<PageSkeleton />}><StatementsPage /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageSkeleton />}><ReportsPage /></Suspense>} />
            <Route path="inventory" element={<Suspense fallback={<PageSkeleton />}><InventoryPage /></Suspense>} />
            <Route path="notifications" element={<Suspense fallback={<PageSkeleton />}><NotificationsPage /></Suspense>} />
            <Route path="audit" element={<StaffOnly><Suspense fallback={<PageSkeleton />}><AuditPage /></Suspense></StaffOnly>} />
            <Route path="profile" element={<Suspense fallback={<PageSkeleton />}><ProfilePage /></Suspense>} />
            <Route path="settings" element={<StaffOnly><Suspense fallback={<PageSkeleton />}><SettingsPage /></Suspense></StaffOnly>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </UiProvider>
    </DataProvider>
  )
}

function Gate() {
  const { status } = useAuth()
  switch (status) {
    case 'loading': case 'claiming': return <Splash />
    case 'signedOut': return <LoginPage />
    case 'verify': return <VerifyEmailPage />
    case 'setup': return <SetupPage />
    case 'noMember': case 'error': return <NoMemberPage />
    default: return <Authed />
  }
}

export default function App() {
  if (!isConfigured) return <ConfigMissing />
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Login screens need toasts too, so they get a lightweight UiProvider of their own */}
        <UiShell />
      </AuthProvider>
    </BrowserRouter>
  )
}

function UiShell() {
  const { status } = useAuth()
  const authed = status === 'ready'
  return authed ? <Gate /> : <UiProvider renderQuickAdd={() => null}><Gate /></UiProvider>
}

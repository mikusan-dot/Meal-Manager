import { useState } from 'react'
import { MailCheck, ShieldAlert, UserX, Settings2 } from 'lucide-react'
import { Button, Card, Field, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/UiContext'
import { friendlyError } from '../services/common'
import { todayStr } from '../lib/dates'

function Shell({ children, title, subtitle }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/icon.svg" alt="" className="mx-auto h-16 w-16 rounded-2xl shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfigMissing() {
  return (
    <Shell title="Firebase is not configured" subtitle="One more step before the app can run">
      <Card className="space-y-3 p-5 text-sm text-slate-600">
        <p className="flex items-center gap-2 font-semibold text-slate-800"><Settings2 className="h-4 w-4" /> Add your Firebase keys</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to <code className="rounded bg-slate-100 px-1">.env.local</code></li>
          <li>Paste the web-app config from Firebase console → Project settings</li>
          <li>Restart <code className="rounded bg-slate-100 px-1">npm run dev</code></li>
        </ol>
        <p>The README walks through enabling Authentication, Firestore and Storage and deploying the security rules.</p>
      </Card>
    </Shell>
  )
}

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'in') await signIn(email, password)
      else if (mode === 'up') await signUp(email, password)
      else { await resetPassword(email); toast.success('Password reset email sent. Check your inbox.'); setMode('in') }
    } catch (err) { toast.error(friendlyError(err)) } finally { setBusy(false) }
  }

  const titles = { in: 'Welcome back', up: 'Create your account', reset: 'Reset password' }
  return (
    <Shell title={titles[mode]} subtitle={mode === 'up' ? 'Use the email your manager added for you' : 'Meal Manager · shared residence'}>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" /></Field>
          {mode !== 'reset' && (
            <Field label="Password" hint={mode === 'up' ? 'At least 6 characters' : undefined}>
              <Input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </Field>
          )}
          <Button type="submit" className="w-full" size="lg" loading={busy}>{mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}</Button>
        </form>
        <div className="mt-4 space-y-1 text-center text-sm">
          {mode === 'in' && <button className="font-medium text-brand-700" onClick={() => setMode('reset')}>Forgot password?</button>}
          <p className="text-slate-500">
            {mode === 'up' ? 'Already have an account? ' : mode === 'in' ? 'New here? ' : ''}
            <button className="font-semibold text-brand-700" onClick={() => setMode(mode === 'up' || mode === 'reset' ? 'in' : 'up')}>{mode === 'in' ? 'Create an account' : 'Back to sign in'}</button>
          </p>
        </div>
      </Card>
    </Shell>
  )
}

export function VerifyEmailPage() {
  const { user, resendVerification, refreshVerification, signOut } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  return (
    <Shell title="Verify your email" subtitle={user?.email}>
      <Card className="space-y-4 p-5 text-center text-sm text-slate-600">
        <MailCheck className="mx-auto h-10 w-10 text-brand-600" />
        <p>We sent a verification link to your email. Open it, then come back and tap the button below. This stops anyone else from claiming your member profile.</p>
        <Button className="w-full" loading={busy} onClick={async () => { setBusy(true); try { await refreshVerification() } catch (e) { toast.error(friendlyError(e)) } finally { setBusy(false) } }}>I've verified — continue</Button>
        <Button variant="secondary" className="w-full" onClick={async () => { try { await resendVerification(); toast.success('Verification email sent again.') } catch (e) { toast.error(friendlyError(e)) } }}>Resend email</Button>
        <button className="text-slate-500 underline" onClick={signOut}>Use a different account</button>
      </Card>
    </Shell>
  )
}

export function NoMemberPage() {
  const { user, flow, retry, signOut } = useAuth()
  return (
    <Shell title="No member profile yet" subtitle={user?.email}>
      <Card className="space-y-4 p-5 text-center text-sm text-slate-600">
        <UserX className="mx-auto h-10 w-10 text-amber-500" />
        {flow.reason === 'taken'
          ? <p>The member profile for this email is already linked to another account. Ask your manager for help.</p>
          : <p>Your manager hasn't added this email address as a member yet. Ask them to add <b>{user?.email}</b> under <b>Members</b>, then try again.</p>}
        <Button className="w-full" onClick={retry}>Try again</Button>
        <button className="text-slate-500 underline" onClick={signOut}>Sign out</button>
      </Card>
    </Shell>
  )
}

export function SetupPage() {
  const { user, completeSetup, signOut } = useAuth()
  const toast = useToast()
  const [f, setF] = useState({ name: '', phone: '', roomNumber: '', joinDate: todayStr() })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try { await completeSetup(f) } catch (err) { toast.error(friendlyError(err)) } finally { setBusy(false) }
  }
  return (
    <Shell title="Set up your residence" subtitle="You're the first person here, so you'll be the admin">
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Your full name"><Input value={f.name} onChange={set('name')} required autoFocus /></Field>
          <Field label="Phone number"><Input type="tel" value={f.phone} onChange={set('phone')} required placeholder="01XXXXXXXXX" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room number"><Input value={f.roomNumber} onChange={set('roomNumber')} required /></Field>
            <Field label="Join date"><Input type="date" value={f.joinDate} onChange={set('joinDate')} max={todayStr()} required /></Field>
          </div>
          <Button type="submit" className="w-full" size="lg" loading={busy}>Create admin profile</Button>
        </form>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />The admin can assign monthly managers and reopen closed months. This screen only appears once.</p>
        <button className="mt-3 w-full text-center text-sm text-slate-500 underline" onClick={signOut}>Sign out</button>
      </Card>
    </Shell>
  )
}

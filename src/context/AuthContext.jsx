import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut as fbSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { bootstrapAdmin, claimMember, findMemberByEmail } from '../services/members'
import { listen, session } from '../services/common'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

/**
 * status: loading → signedOut | verify | setup | noMember | claiming | ready
 *  - verify:   signed in but email not verified yet
 *  - setup:    nobody has ever set the app up → this person becomes the admin
 *  - noMember: manager has not added this email as a member yet
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(undefined) // users/{uid}
  const [flow, setFlow] = useState({ status: 'checking' })
  const [tick, setTick] = useState(0)
  const claimed = useRef(false)

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); claimed.current = false; setProfile(undefined); setFlow({ status: 'checking' }) }), [])

  useEffect(() => {
    if (!user) return
    return listen(doc(db, 'users', user.uid), (p) => setProfile(p), () => setProfile(null))
  }, [user])

  const resolveNewUser = useCallback(async () => {
    if (!user) return
    if (!user.emailVerified) return setFlow({ status: 'verify' })
    try {
      const boot = await getDoc(doc(db, 'config', 'bootstrap'))
      if (!boot.exists()) return setFlow({ status: 'setup' })
      const member = await findMemberByEmail(user.email)
      if (!member) return setFlow({ status: 'noMember' })
      if (member.uid && member.uid !== user.uid) return setFlow({ status: 'noMember', reason: 'taken' })
      setFlow({ status: 'claiming' })
      if (!claimed.current) { claimed.current = true; await claimMember(user, member) }
    } catch (e) {
      console.error(e)
      setFlow({ status: 'error', message: e.message })
    }
  }, [user])

  useEffect(() => { if (user && profile === null) resolveNewUser() }, [user, profile, resolveNewUser, tick])

  useEffect(() => {
    session.uid = user?.uid || null
    session.memberId = profile?.memberId || null
    session.role = profile?.role || null
  }, [user, profile])

  const status = user === undefined ? 'loading' : !user ? 'signedOut' : profile ? 'ready' : profile === undefined ? 'loading' : flow.status === 'checking' ? 'loading' : flow.status

  const value = useMemo(() => ({
    user, profile, status, flow,
    isAdmin: profile?.role === 'admin',
    signIn: (email, password) => signInWithEmailAndPassword(auth, email.trim(), password),
    signUp: async (email, password) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      await sendEmailVerification(cred.user)
      return cred
    },
    resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
    resendVerification: () => sendEmailVerification(auth.currentUser),
    /** After clicking the email link: refresh the token so rules see email_verified = true. */
    refreshVerification: async () => {
      await auth.currentUser.reload()
      await auth.currentUser.getIdToken(true)
      claimed.current = false
      setFlow({ status: 'checking' })
      setTick((t) => t + 1)
    },
    completeSetup: async (data) => { await bootstrapAdmin(user, data) },
    retry: () => { claimed.current = false; setFlow({ status: 'checking' }); setTick((t) => t + 1) },
    signOut: () => fbSignOut(auth),
  }), [user, profile, status, flow, resolveNewUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

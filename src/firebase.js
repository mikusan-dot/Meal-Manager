import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

/** False until .env.local is filled in – the app then shows a setup screen instead of crashing. */
export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)

let app, auth, db, storage
if (isConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  // Offline cache: the PWA keeps working on patchy mobile data and syncs when back online.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  if (firebaseConfig.storageBucket) storage = getStorage(app)
}

export { app, auth, db, storage }

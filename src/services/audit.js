import { collection, doc, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { listen } from './common'

export const subscribeAudit = (month, cb, onErr) =>
  listen(query(collection(db, 'auditLogs'), where('month', '==', month), orderBy('createdAt', 'desc')), cb, onErr)

export const subscribeAuditAll = (cb, onErr) =>
  listen(query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc')), cb, onErr)

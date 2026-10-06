import { useState } from 'react'
import { useToast } from '../context/UiContext'
import { friendlyError } from '../services/common'

/** Wraps an async write with a busy flag and toast feedback. */
export function useAction() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = async (fn, success) => {
    setBusy(true)
    try {
      const value = await fn()
      if (success) toast.success(typeof success === 'function' ? success(value) : success)
      return { ok: true, value }
    } catch (e) {
      toast.error(friendlyError(e))
      return { ok: false, error: e }
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

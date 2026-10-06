import { useState } from 'react'
import { Camera } from 'lucide-react'
import { Avatar, Button, Field, Input, Modal, Select } from '../ui'
import { createMember, updateMember, uploadProfilePhoto } from '../../services/members'
import { useAction } from '../../hooks/useAction'
import { ENABLE_STORAGE } from '../../config'
import { todayStr } from '../../lib/dates'
import { hasErrors, validateMember } from '../../lib/validators'

export default function MemberForm({ member, onClose }) {
  const editing = !!member
  const [f, setF] = useState({ name: member?.name || '', phone: member?.phone || '', email: member?.email || '', roomNumber: member?.roomNumber || '', joinDate: member?.joinDate || todayStr(), leaveDate: member?.leaveDate || '', status: member?.status || 'active', photoUrl: member?.photoUrl || '' })
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const { busy, run } = useAction()
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const pickPhoto = async (file) => {
    if (!file) return
    setUploading(true)
    const r = await run(() => uploadProfilePhoto(member?.id || `new-${Date.now()}`, file))
    setUploading(false)
    if (r.ok) setF((s) => ({ ...s, photoUrl: r.value }))
  }
  const submit = async (e) => {
    e.preventDefault()
    const errs = validateMember(f)
    setErrors(errs)
    if (hasErrors(errs)) return
    const r = await run(() => (editing ? updateMember(member.id, f, member) : createMember(f)), editing ? 'Member updated' : 'Member added — they can now sign up with this email')
    if (r.ok) onClose()
  }
  return (
    <Modal title={editing ? 'Edit member' : 'Add member'} onClose={onClose} footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button type="submit" form="member-form" className="flex-1" loading={busy}>{editing ? 'Save changes' : 'Add member'}</Button></>}>
      <form id="member-form" onSubmit={submit} className="space-y-4" noValidate>
        {ENABLE_STORAGE && (
          <div className="flex items-center gap-3">
            <Avatar member={{ name: f.name || '?', photoUrl: f.photoUrl }} size={56} />
            <label className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Camera className="mr-1.5 inline h-4 w-4" />{uploading ? 'Uploading…' : 'Profile photo'}<input type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} /></label>
          </div>
        )}
        <Field label="Full name" error={errors.name}><Input value={f.name} onChange={set('name')} invalid={!!errors.name} autoFocus /></Field>
        <Field label="Email (used to sign in)" error={errors.email}><Input type="email" value={f.email} onChange={set('email')} disabled={editing && !!member.uid} invalid={!!errors.email} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" error={errors.phone}><Input type="tel" value={f.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" invalid={!!errors.phone} /></Field>
          <Field label="Room" error={errors.roomNumber}><Input value={f.roomNumber} onChange={set('roomNumber')} invalid={!!errors.roomNumber} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Join date" error={errors.joinDate}><Input type="date" value={f.joinDate} onChange={set('joinDate')} invalid={!!errors.joinDate} /></Field>
          <Field label="Leave date" error={errors.leaveDate} hint="Leave empty if staying"><Input type="date" value={f.leaveDate} onChange={set('leaveDate')} invalid={!!errors.leaveDate} /></Field>
        </div>
        <Field label="Account status"><Select value={f.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive (left)</option></Select></Field>
      </form>
    </Modal>
  )
}

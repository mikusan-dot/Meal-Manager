import { Select } from '../ui'
import { useData } from '../../context/DataContext'

export default function MemberSelect({ value, onChange, includeInactive = false, placeholder = 'Choose member…', ...props }) {
  const { members } = useData()
  const list = members
    .filter((m) => includeInactive || m.status === 'active' || m.id === value)
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      <option value="">{placeholder}</option>
      {list.map((m) => <option key={m.id} value={m.id}>{m.name}{m.status !== 'active' ? ' (inactive)' : ''} · Room {m.roomNumber}</option>)}
    </Select>
  )
}

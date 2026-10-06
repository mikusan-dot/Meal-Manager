import { useState } from 'react'
import { AlertTriangle, Minus, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DataList, EmptyState, Field, Input, NumberInput, PageHeader, PageSkeleton } from '../components/ui'
import { useData } from '../context/DataContext'
import { useAction } from '../hooks/useAction'
import { useConfirm, useToast } from '../context/UiContext'
import { addInventoryItem, adjustStock, addShoppingItem, isLowStock, removeShoppingItem, toggleShoppingItem, updateInventoryItem } from '../services/inventory'
import { friendlyError } from '../services/common'

function StockForm({ initial, onDone }) {
  const { run, busy } = useAction()
  const [v, setV] = useState({ name: initial?.name || '', unit: initial?.unit || 'kg', currentStock: initial?.currentStock ?? '', minStock: initial?.minStock ?? '' })
  return (
    <form
      className="space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const res = await run(() => (initial ? updateInventoryItem(initial, v) : addInventoryItem(v)), initial ? 'Stock updated' : 'Stock item added')
        if (res.ok) onDone?.()
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Item"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Rice, Oil, Gas" /></Field>
        <Field label="Unit"><Input value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} placeholder="kg / L / pcs" /></Field>
        <Field label="Current stock"><NumberInput value={v.currentStock} onChange={(n) => setV({ ...v, currentStock: n })} /></Field>
        <Field label="Minimum stock"><NumberInput value={v.minStock} onChange={(n) => setV({ ...v, minStock: n })} hint="Warn below this" /></Field>
      </div>
      <Button type="submit" loading={busy}>{initial ? 'Save' : 'Add item'}</Button>
    </form>
  )
}

export default function InventoryPage() {
  const d = useData()
  const { run } = useAction()
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [shop, setShop] = useState({ item: '', qty: 1, unit: '' })

  if (d.loading) return <PageSkeleton />
  const staff = d.canManage || d.isStaffNow

  const adjust = async (item, delta) => {
    try { await adjustStock(item, delta) } catch (e) { toast.error(friendlyError(e)) }
  }
  const addShop = async (e) => {
    e.preventDefault()
    const res = await run(() => addShoppingItem(shop), 'Added to shopping list')
    if (res.ok) setShop({ item: '', qty: 1, unit: '' })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        subtitle={d.lowStock.length ? `${d.lowStock.length} item${d.lowStock.length > 1 ? 's' : ''} below minimum` : 'Rice, oil, gas and supplies'}
        actions={staff && <Button size="sm" icon={Plus} onClick={() => { setEditing(null); setShowAdd((v) => !v) }}>Add stock</Button>}
      />
      {d.lowStock.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Low stock warning</p>
          <p className="mt-1">{d.lowStock.map((i) => `${i.name} (${i.currentStock}${i.unit ? ` ${i.unit}` : ''})`).join(', ')}</p>
        </Card>
      )}
      {showAdd && staff && <Card><CardHeader title="New stock item" /><StockForm onDone={() => setShowAdd(false)} /></Card>}
      {editing && <Card><CardHeader title={`Edit ${editing.name}`} /><StockForm initial={editing} onDone={() => setEditing(null)} /></Card>}

      <Card>
        <CardHeader title="Current stock" subtitle="Everyone can view · only staff can edit" />
        {d.inventory.length === 0 ? <EmptyState icon={Package} title="No stock tracked yet" text="Staff can add rice, oil, gas cylinders and other supplies." /> : (
          <DataList
            rows={[...d.inventory].sort((a, b) => a.name.localeCompare(b.name))}
            columns={[
              { key: 'n', header: 'Item', render: (r) => <span className="font-medium">{r.name} <span className="text-xs text-slate-500">({r.unit})</span></span> },
              { key: 's', header: 'Stock', align: 'right', render: (r) => <b className={isLowStock(r) ? 'text-red-700' : ''}>{r.currentStock}</b> },
              { key: 'm', header: 'Min', align: 'right', render: (r) => r.minStock },
              { key: 'w', header: 'Status', render: (r) => isLowStock(r) ? <Badge tone="red">Low</Badge> : <Badge tone="green">OK</Badge> },
              {
                key: 'a', header: 'Adjust', render: (r) => staff ? (
                  <span className="flex justify-end gap-1">
                    <Button size="sm" variant="secondary" icon={Minus} onClick={() => adjust(r, -1)} aria-label="Use 1" />
                    <Button size="sm" variant="secondary" icon={Plus} onClick={() => adjust(r, 1)} aria-label="Add 1" />
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
                  </span>
                ) : null,
              },
            ]}
            renderCard={(r) => (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium">{r.name} <span className="text-xs text-slate-500">{r.unit}</span></p>
                  <p className="text-xs text-slate-500">Stock {r.currentStock} · min {r.minStock} {isLowStock(r) && <Badge tone="red">Low</Badge>}</p>
                </div>
                {staff && (
                  <span className="flex gap-1">
                    <Button size="sm" variant="secondary" icon={Minus} onClick={() => adjust(r, -1)} aria-label="Use 1" />
                    <Button size="sm" variant="secondary" icon={Plus} onClick={() => adjust(r, 1)} aria-label="Add 1" />
                  </span>
                )}
              </div>
            )}
          />
        )}
      </Card>

      <Card>
        <CardHeader title="Shopping list" subtitle="Any member can add · owner or staff can check off" />
        <form onSubmit={addShop} className="flex flex-wrap gap-2 p-4">
          <Input className="min-w-[10rem] flex-1" value={shop.item} onChange={(e) => setShop({ ...shop, item: e.target.value })} placeholder="What to buy?" />
          <Input className="!w-20" type="number" min="1" step="any" value={shop.qty} onChange={(e) => setShop({ ...shop, qty: Number(e.target.value) })} aria-label="Quantity" />
          <Input className="!w-24" value={shop.unit} onChange={(e) => setShop({ ...shop, unit: e.target.value })} placeholder="Unit" />
          <Button type="submit" size="sm" icon={ShoppingCart}>Add</Button>
        </form>
        {d.shopping.length === 0 ? <p className="px-4 pb-6 text-center text-sm text-slate-500">Shopping list is empty.</p> : (
          <ul className="divide-y divide-slate-100">
            {[...d.shopping].sort((a, b) => Number(a.done) - Number(b.done)).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <input type="checkbox" checked={!!s.done} onChange={() => toggleShoppingItem(s).catch((e) => toast.error(friendlyError(e)))} className="h-5 w-5 accent-teal-700" aria-label="Done" />
                <span className={`flex-1 text-sm ${s.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{s.item} <span className="text-xs text-slate-500">× {s.qty}{s.unit ? ` ${s.unit}` : ''}</span></span>
                <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600" aria-label="Remove" onClick={async () => {
                  if (await confirm({ title: `Remove ${s.item}?`, confirmLabel: 'Remove' })) removeShoppingItem(s).catch((e) => toast.error(friendlyError(e)))
                }} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/**
 * One data source, two layouts: a real table from the md breakpoint up,
 * and tappable cards on phones (renderCard). Keeps every list screen consistent.
 */
export default function DataList({ columns, rows, rowKey = (r) => r.id, renderCard, rowClass }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              {columns.map((c) => <th key={c.key} className={`px-4 py-2.5 font-semibold ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={rowKey(r)} className={`hover:bg-slate-50/60 ${rowClass?.(r) || ''}`}>
                {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.className || ''}`}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((r) => <li key={rowKey(r)} className={`px-4 py-3 ${rowClass?.(r) || ''}`}>{renderCard(r)}</li>)}
      </ul>
    </>
  )
}

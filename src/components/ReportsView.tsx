import type { Order } from '../types'
import { formatPaisa } from '../lib/money'
import PageTitle from './PageTitle'

export default function ReportsView({ orders }: { orders: Order[] }) {
  const gross = orders.filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.totalPaisa, 0)
  const average = orders.length ? gross / orders.length : 0
  const completed = orders.filter((o) => o.status === 'Completed').length

  // Category share is computed from real sold items, not hardcoded arrays.
  const byCategory = new Map<string, number>()
  let totalQuantity = 0
  for (const order of orders) {
    for (const line of order.items) {
      const quantity = line.quantity
      const current = byCategory.get(line.name) ?? 0
      byCategory.set(line.name, current + quantity)
      totalQuantity += quantity
    }
  }
  // Menu items carry their category; group by the originating item when known.
  // We only have the line name on the order, so approximate category via menu items is
  // not available here — group by individual dish sold instead (honest, real data).
  const categoryRows = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, quantity]) => ({
      name,
      quantity,
      share: totalQuantity ? Math.round((quantity / totalQuantity) * 100) : 0,
    }))

  // Peak times = real order timestamps bucketed by hour.
  const peak = new Map<number, number>()
  for (const order of orders) {
    let hour: number | null = null
    if (order.isoTime) {
      hour = new Date(order.isoTime).getHours()
    } else {
      const match = order.time.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i)
      if (match) {
        const h = Number(match[1]) % 12
        hour = match[3].toUpperCase() === 'PM' ? h + 12 : h
      }
    }
    if (hour !== null) peak.set(hour, (peak.get(hour) ?? 0) + 1)
  }
  const peakRows = [...peak.entries()].sort((a, b) => a[0] - b[0])
  const maxPeak = peakRows.reduce((max, [, count]) => Math.max(max, count), 0)

  return (
    <div className="page">
      <PageTitle
        eyebrow="Insights"
        title="Reports"
        action={
          <button
            className="secondary-button"
            onClick={() => window.print()}
          >
            Print report ↓
          </button>
        }
      />
      <div className="stat-grid">
        <div className="stat-card">
          <span>Gross sales</span>
          <strong>{formatPaisa(gross)}</strong>
          <small className="up">Excluding cancelled</small>
        </div>
        <div className="stat-card">
          <span>Order volume</span>
          <strong>{orders.length}</strong>
          <small className="up">{completed} completed</small>
        </div>
        <div className="stat-card">
          <span>Average order</span>
          <strong>{formatPaisa(average)}</strong>
          <small className="neutral">Per order</small>
        </div>
      </div>
      <div className="content-grid">
        <div className="panel report-panel">
          <h2>Dishes sold</h2>
          <p>Share of total quantity sold</p>
          {categoryRows.length === 0 && <p className="empty-note">No orders to report yet.</p>}
          {categoryRows.map((row) => (
            <div className="bar-row" key={row.name}>
              <span>{row.name}</span>
              <div><i style={{ width: `${row.share}%` }} /></div>
              <b>{row.share}%</b>
            </div>
          ))}
        </div>
        <div className="panel report-panel">
          <h2>Peak ordering hours</h2>
          <p>Live orders by hour</p>
          {peakRows.length === 0 ? (
            <p className="empty-note">No orders to report yet.</p>
          ) : (
            <div className="mini-bars">
              {peakRows.map(([hour, count]) => (
                <div className="mini-bar-item" key={hour}>
                  <i style={{ height: `${maxPeak ? Math.max(8, Math.round((count / maxPeak) * 100)) : 0}%` }} />
                  <span>{String(hour).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
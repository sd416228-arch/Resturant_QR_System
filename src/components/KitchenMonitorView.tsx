import { useState } from 'react'
import type { Order, OrderStatus } from '../types'
import PageTitle from './PageTitle'

const MONITOR_COLUMNS: { key: OrderStatus; label: string; icon: string; desc: string }[] = [
  { key: 'Preparing', label: 'Food Preparing (Cooking)', icon: '🍳', desc: 'Chefs actively cooking on stove/oven' },
  { key: 'Ready', label: 'Food Ready to Serve', icon: '🛎️', desc: 'Plated fresh & awaiting delivery to table' },
  { key: 'New', label: 'Queued Orders', icon: '📝', desc: 'Order confirmed, waiting to start cook' },
]

function getElapsedMinutes(order: Order): number {
  if (order.isoTime) {
    const elapsed = Date.now() - new Date(order.isoTime).getTime()
    return Math.max(0, Math.floor(elapsed / 60000))
  }
  return 0
}

export default function KitchenMonitorView({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState('')

  const activeOrders = orders.filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled')

  const filteredOrders = activeOrders.filter((o) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      o.id.toLowerCase().includes(q) ||
      o.table.toLowerCase().includes(q) ||
      o.items.some((i) => i.name.toLowerCase().includes(q))
    )
  })

  const newCount = orders.filter((o) => o.status === 'New').length
  const prepCount = orders.filter((o) => o.status === 'Preparing').length
  const readyCount = orders.filter((o) => o.status === 'Ready').length

  return (
    <div className="page kitchen-monitor-page">
      <PageTitle
        eyebrow="Supervisory Oversight · Real-Time Station Observation"
        title="Kitchen Floor Monitor"
        action={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.78rem',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>👁️ Observer Mode</span>
            </span>
            <span className="live-indicator">
              <i /> Live Kitchen Queue ({activeOrders.length} Active)
            </span>
          </div>
        }
      />

      {/* Oversight Guidance Banner */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>📊</span>
          <div>
            <strong style={{ fontSize: '0.88rem', color: '#1e293b', display: 'block' }}>
              Read-Only Administrative Monitor
            </strong>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
              This screen provides management observation of kitchen queue depth, table turnaround times, and prep progress. Line-cook workflow buttons (Start Preparing, Mark Ready) are restricted to the physical Kitchen Display System.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
            {newCount} in queue
          </span>
          <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
            {prepCount} on stove
          </span>
          <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
            {readyCount} ready to serve
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter queue by table, dish, or order #…"
          style={{
            maxWidth: '300px',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            border: '1px solid var(--line)',
            fontSize: '0.85rem',
            background: 'var(--paper)',
          }}
        />
        <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
          Tickets advance automatically as kitchen staff updates tickets on the cook line.
        </span>
      </div>

      {/* 3 Read-Only Monitoring Columns */}
      <div className="kitchen-board">
        {MONITOR_COLUMNS.map((col) => {
          const colOrders = filteredOrders.filter((o) => o.status === col.key)

          return (
            <div className="kitchen-column" key={col.key} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
              <div className="column-heading" style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{col.icon}</span>
                  <div>
                    <h2 style={{ fontSize: '0.95rem', margin: 0 }}>{col.label}</h2>
                    <small style={{ color: '#64748b', fontSize: '0.7rem' }}>{col.desc}</small>
                  </div>
                </div>
                <span style={{ fontWeight: 700, background: '#e2e8f0', color: '#334155' }}>
                  {colOrders.length}
                </span>
              </div>

              {colOrders.map((order: Order) => {
                const elapsedMin = getElapsedMinutes(order)
                const isDelayed = elapsedMin >= 15
                const isWarm = elapsedMin >= 7 && elapsedMin < 15

                return (
                  <article
                    className="ticket"
                    key={order.id}
                    style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '0.75rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div className="ticket-top">
                      <b>{order.id}</b>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span>{order.time}</span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            background: isDelayed ? '#fee2e2' : isWarm ? '#fef3c7' : '#f1f5f9',
                            color: isDelayed ? '#991b1b' : isWarm ? '#92400e' : '#475569',
                          }}
                        >
                          {isDelayed ? `⚠ ${elapsedMin}m wait` : `${elapsedMin}m wait`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.6rem 0 0.4rem' }}>
                      <span style={{ font: '700 1.25rem "Playfair Display", serif', color: 'var(--green)' }}>
                        {order.table.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                        {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
                      </span>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '0.4rem 0', margin: '0.4rem 0' }}>
                      {order.items.map((line) => (
                        <p key={line.itemId} style={{ margin: '0.3rem 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span>
                            <b style={{ color: 'var(--green)', marginRight: '0.3rem' }}>{line.quantity}×</b>
                            {line.name}
                          </span>
                        </p>
                      ))}
                    </div>

                    {order.note && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '4px', padding: '0.4rem 0.6rem', fontSize: '0.78rem', color: '#854d0e', margin: '0.4rem 0' }}>
                        <strong>Special Request:</strong> "{order.note}"
                      </div>
                    )}

                    {/* Informational Status Indicator (NO action buttons) */}
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '4px',
                        background:
                          order.status === 'Ready'
                            ? '#ecfdf5'
                            : order.status === 'Preparing'
                            ? '#fffbeb'
                            : '#f8fafc',
                        border: `1px solid ${
                          order.status === 'Ready'
                            ? '#a7f3d0'
                            : order.status === 'Preparing'
                            ? '#fde68a'
                            : '#e2e8f0'
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: order.status === 'Ready' ? '#065f46' : order.status === 'Preparing' ? '#92400e' : '#64748b' }}>
                        {order.status === 'Ready'
                          ? '🛎️ Ready for Server Delivery'
                          : order.status === 'Preparing'
                          ? '🍳 Cooking by Kitchen Station'
                          : '🕒 Queued for Kitchen Line'}
                      </span>
                      <small style={{ color: '#94a3b8' }}>Monitor Only</small>
                    </div>
                  </article>
                )
              })}

              {colOrders.length === 0 && (
                <p className="empty-note" style={{ paddingTop: '3rem', color: '#94a3b8' }}>
                  No tickets currently in {col.label.toLowerCase()}.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

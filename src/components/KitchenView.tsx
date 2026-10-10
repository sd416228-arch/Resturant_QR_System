import { useEffect, useRef, useState } from 'react'
import type { Order, OrderStatus } from '../types'
import { playNewOrderChime } from '../lib/sound'
import PageTitle from './PageTitle'

const COLUMNS: OrderStatus[] = ['New', 'Preparing', 'Ready']

function nextStatus(status: OrderStatus): OrderStatus {
  if (status === 'New') return 'Preparing'
  if (status === 'Preparing') return 'Ready'
  return 'Completed'
}

function actionLabel(status: OrderStatus): string {
  if (status === 'New') return 'Start preparing'
  if (status === 'Preparing') return 'Mark ready'
  return 'Complete order'
}

function getElapsedMinutes(order: Order): number {
  if (order.isoTime) {
    const elapsed = Date.now() - new Date(order.isoTime).getTime()
    return Math.max(0, Math.floor(elapsed / 60000))
  }
  // Fallback parsing for format "7:18 PM"
  const match = order.time.match(/(\d{1,2}):(\d{2})\s?(AM|PM)?/i)
  if (match) {
    const now = new Date()
    let hours = Number(match[1])
    const minutes = Number(match[2])
    const ampm = match[3]
    if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) hours += 12
    if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0
    const orderDate = new Date()
    orderDate.setHours(hours, minutes, 0, 0)
    const diff = Math.floor((now.getTime() - orderDate.getTime()) / 60000)
    return Math.max(0, diff)
  }
  return 0
}

export default function KitchenView({
  orders,
  onStatusChange,
  readOnly = false,
}: {
  orders: Order[]
  onStatusChange?: (id: string, status: OrderStatus) => void
  readOnly?: boolean
}) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('sprig_kitchen_sound') !== 'false'
  })
  const [search, setSearch] = useState('')
  const prevNewCount = useRef<number | null>(null)

  const newOrders = orders.filter((o) => (o?.status || '').toLowerCase() === 'new')
  const activeOrders = orders.filter((o) => {
    const s = (o?.status || '').toLowerCase()
    return s !== 'completed' && s !== 'cancelled'
  })

  // Play audio chime when a new order appears (only for interactive kitchen station)
  useEffect(() => {
    if (readOnly) return
    if (prevNewCount.current !== null && newOrders.length > prevNewCount.current) {
      if (soundEnabled) {
        playNewOrderChime()
      }
    }
    prevNewCount.current = newOrders.length
  }, [newOrders.length, soundEnabled, readOnly])

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('sprig_kitchen_sound', String(next))
    if (next) playNewOrderChime()
  }

  const handleCancel = (id: string) => {
    if (readOnly || !onStatusChange) return
    if (window.confirm(`Are you sure you want to cancel order ${id}?`)) {
      onStatusChange(id, 'Cancelled')
    }
  }

  const [filterTab, setFilterTab] = useState<'all' | 'New' | 'Preparing' | 'Ready'>('all')

  const filteredOrders = orders.filter((o) => {
    if (!o) return false
    const statusLower = (o.status || '').toLowerCase()
    if (filterTab !== 'all' && statusLower !== filterTab.toLowerCase()) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const idMatch = String(o.id || '').toLowerCase().includes(q)
    const tableMatch = String(o.table || '').toLowerCase().includes(q)
    const itemsMatch = Array.isArray(o.items) && o.items.some((line) => {
      const name = line?.name || (line as any)?.item?.name || ''
      return name.toLowerCase().includes(q)
    })
    const noteMatch = String(o.note || '').toLowerCase().includes(q)
    return idMatch || tableMatch || itemsMatch || noteMatch
  })

  const newCount = orders.filter((o) => (o?.status || '').toLowerCase() === 'new').length
  const prepCount = orders.filter((o) => (o?.status || '').toLowerCase() === 'preparing').length
  const readyCount = orders.filter((o) => (o?.status || '').toLowerCase() === 'ready').length

  return (
    <div className={`page kitchen-page ${readOnly ? 'kitchen-monitor-mode' : ''}`}>
      <PageTitle
        eyebrow={readOnly ? 'Administrative Supervisory Monitor · Station Oversight' : 'Live kitchen queue'}
        title={readOnly ? 'Kitchen Station Monitor' : 'Kitchen Display System'}
        action={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {readOnly ? (
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
                <span>👁️ Observer Mode (Controls Disabled)</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={toggleSound}
                className="secondary-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: soundEnabled ? '#dcfce7' : '#f1f5f9',
                  color: soundEnabled ? '#166534' : '#64748b',
                  borderColor: soundEnabled ? '#86efac' : '#cbd5e1',
                }}
                title="Toggle audio chime for incoming orders"
              >
                <span>{soundEnabled ? '🔔 Chime: ON' : '🔕 Chime: OFF'}</span>
              </button>
            )}
            <span className="live-indicator">
              <i /> Live Service ({activeOrders.length} Active)
            </span>
          </div>
        }
      />

      {/* Supervisory Notice Banner for Admin View */}
      {readOnly && (
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
            <span style={{ fontSize: '1.4rem' }}>🍳</span>
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#1e293b', display: 'block' }}>
                Admin Real-Time Kitchen Monitor
              </strong>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                Supervisory view of all active kitchen tickets, cooking progress, and table wait times. Line-cook action buttons are disabled here so administrative staff cannot alter cook tickets.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
              {newCount} in queue
            </span>
            <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
              {prepCount} cooking
            </span>
            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
              {readyCount} ready
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search table, order, dish…"
            style={{
              maxWidth: '220px',
              padding: '0.5rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              fontSize: '0.85rem',
              background: 'var(--paper)',
            }}
          />
          <div className="filter-tabs">
            <button
              type="button"
              className={filterTab === 'all' ? 'selected' : ''}
              onClick={() => setFilterTab('all')}
            >
              All Active ({activeOrders.length})
            </button>
            <button
              type="button"
              className={filterTab === 'New' ? 'selected' : ''}
              onClick={() => setFilterTab('New')}
            >
              New ({newCount})
            </button>
            <button
              type="button"
              className={filterTab === 'Preparing' ? 'selected' : ''}
              onClick={() => setFilterTab('Preparing')}
            >
              Cooking ({prepCount})
            </button>
            <button
              type="button"
              className={filterTab === 'Ready' ? 'selected' : ''}
              onClick={() => setFilterTab('Ready')}
            >
              Ready ({readyCount})
            </button>
          </div>
        </div>
        <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
          {readOnly
            ? 'Tickets update live as kitchen cooks advance preparation on the line.'
            : 'Kitchen Station: Advance tickets as dishes progress through preparation.'}
        </span>
      </div>

      <div className="kitchen-board">
        {COLUMNS.map((status) => {
          const colOrders = filteredOrders.filter(
            (o) => (o.status || '').toLowerCase() === status.toLowerCase()
          )
          return (
            <div className="kitchen-column" key={status}>
              <div className="column-heading">
                <h2>{status}</h2>
                <span style={{ fontWeight: 700 }}>{colOrders.length}</span>
              </div>
              {colOrders.map((order: Order) => {
                const elapsedMin = getElapsedMinutes(order)
                const isDelayed = elapsedMin >= 15
                const isWarm = elapsedMin >= 7 && elapsedMin < 15
                const tableLabel = order.table || `Table ${order.tableNumber || '01'}`

                return (
                  <article className="ticket" key={order.id} style={{ position: 'relative' }}>
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
                          {isDelayed ? `⚠ ${elapsedMin}m ago` : `${elapsedMin}m ago`}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.6rem 0 0.4rem' }}>
                      <span style={{ font: '700 1.35rem "Playfair Display", serif', color: 'var(--green)', letterSpacing: '-0.5px' }}>
                        {tableLabel.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                        {Array.isArray(order.items) ? order.items.reduce((sum, i) => sum + (i.quantity || 1), 0) : 0} items
                      </span>
                    </div>
                    <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '0.4rem 0', margin: '0.5rem 0' }}>
                      {Array.isArray(order.items) &&
                        order.items.map((line, idx) => {
                          const itemName = line?.name || (line as any)?.item?.name || 'Dish'
                          const itemQty = line?.quantity || (line as any)?.qty || 1
                          const itemKey = line?.itemId ?? (line as any)?.item?.id ?? idx
                          return (
                            <p key={itemKey} style={{ margin: '0.35rem 0', display: 'flex', justifyContent: 'space-between' }}>
                              <span>
                                <b style={{ color: 'var(--green)', fontSize: '1rem', marginRight: '0.3rem' }}>
                                  {itemQty}×
                                </b>
                                {itemName}
                              </span>
                            </p>
                          )
                        })}
                    </div>

                    {order.note && (
                      <div className="note" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '4px', padding: '0.5rem', fontWeight: 500 }}>
                        <strong>Special Request:</strong> "{order.note}"
                      </div>
                    )}

                    {/* Action buttons (only for physical Kitchen Display role) */}
                    {!readOnly && onStatusChange ? (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button
                          className="ticket-action"
                          onClick={() => onStatusChange(order.id, nextStatus(status))}
                          style={{ flex: 3 }}
                        >
                          {actionLabel(status)} →
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(order.id)}
                          title="Cancel ticket"
                          style={{
                            flex: 1,
                            marginTop: '10px',
                            border: '1px solid #fca5a5',
                            borderRadius: '4px',
                            background: '#fff1f2',
                            color: '#b91c1c',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      /* Read-Only Status Indicators (Admin Oversight Mode - No action buttons) */
                      <div
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.5rem 0.65rem',
                          borderRadius: '6px',
                          background:
                            status === 'Ready'
                              ? '#ecfdf5'
                              : status === 'Preparing'
                              ? '#fffbeb'
                              : '#f8fafc',
                          border: `1px solid ${
                            status === 'Ready'
                              ? '#a7f3d0'
                              : status === 'Preparing'
                              ? '#fde68a'
                              : '#e2e8f0'
                          }`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color:
                              status === 'Ready'
                                ? '#065f46'
                                : status === 'Preparing'
                                ? '#92400e'
                                : '#475569',
                          }}
                        >
                          {status === 'Ready'
                            ? '🛎️ Food Ready to Serve'
                            : status === 'Preparing'
                            ? '🍳 Cooking by Kitchen Station'
                            : '🕒 Queued for Kitchen Line'}
                        </span>
                        <small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Observer Only</small>
                      </div>
                    )}
                  </article>
                )
              })}
              {colOrders.length === 0 && (
                <p className="empty-note" style={{ paddingTop: '3rem' }}>
                  No tickets in {status.toLowerCase()}.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
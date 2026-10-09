import { useEffect, useRef, useState } from 'react'
import { playNewOrderChime } from '../lib/sound'
import PageTitle from './PageTitle'

const COLUMNS = ['New', 'Preparing', 'Ready']

function nextStatus(status) {
  if (status === 'New') return 'Preparing'
  if (status === 'Preparing') return 'Ready'
  return 'Completed'
}

function actionLabel(status) {
  if (status === 'New') return 'Start preparing'
  if (status === 'Preparing') return 'Mark ready'
  return 'Complete order'
}

function getElapsedMinutes(order) {
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
}) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('sprig_kitchen_sound') !== 'false'
  })
  const [search, setSearch] = useState('')
  const prevNewCount = useRef(null)

  const newOrders = orders.filter((o) => o.status === 'New')

  // Play audio chime when a new order appears
  useEffect(() => {
    if (prevNewCount.current !== null && newOrders.length > prevNewCount.current) {
      if (soundEnabled) {
        playNewOrderChime()
      }
    }
    prevNewCount.current = newOrders.length
  }, [newOrders.length, soundEnabled])

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('sprig_kitchen_sound', String(next))
    if (next) playNewOrderChime()
  }

  const handleCancel = (id) => {
    if (window.confirm(`Are you sure you want to cancel order ${id}?`)) {
      onStatusChange(id, 'Cancelled')
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      o.id.toLowerCase().includes(q) ||
      o.table.toLowerCase().includes(q) ||
      o.items.some((i) => i.name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="page kitchen-page">
      <PageTitle
        eyebrow="Live kitchen queue"
        title="Kitchen Display System"
        action={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
            <span className="live-indicator">
              <i /> Live Service ({orders.filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled').length} Active)
            </span>
          </div>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by table, item, or order #…"
          style={{
            maxWidth: '300px',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            border: '1px solid var(--line)',
            fontSize: '0.85rem',
            background: 'var(--paper)',
          }}
        />
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Tip: Advance tickets as dishes progress through preparation.
        </span>
      </div>

      <div className="kitchen-board">
        {COLUMNS.map((status) => {
          const colOrders = filteredOrders.filter((o) => o.status === status)
          return (
            <div className="kitchen-column" key={status}>
              <div className="column-heading">
                <h2>{status}</h2>
                <span style={{ fontWeight: 700 }}>{colOrders.length}</span>
              </div>
              {colOrders.map((order) => {
                const elapsedMin = getElapsedMinutes(order)
                const isDelayed = elapsedMin >= 15
                const isWarm = elapsedMin >= 7 && elapsedMin < 15

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
                    <h3>{order.table}</h3>
                    <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '0.4rem 0', margin: '0.5rem 0' }}>
                      {order.items.map((line) => (
                        <p key={line.itemId} style={{ margin: '0.35rem 0', display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            <b style={{ color: 'var(--green)', fontSize: '1rem', marginRight: '0.3rem' }}>
                              {line.quantity}×
                            </b>
                            {line.name}
                          </span>
                        </p>
                      ))}
                    </div>

                    {order.note && (
                      <div className="note" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '4px', padding: '0.5rem', fontWeight: 500 }}>
                        <strong>Special Request:</strong> "{order.note}"
                      </div>
                    )}

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

import { useState } from 'react'
import type { Order } from '../types'
import { formatPaisa } from '../lib/money'
import PageTitle from './PageTitle'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getElapsed(order: Order): number {
  if (order.isoTime) {
    const elapsed = Date.now() - new Date(order.isoTime).getTime()
    return Math.max(0, Math.floor(elapsed / 60000))
  }
  return 0
}

export default function Overview({ orders }: { orders: Order[] }) {
  const [monitorTab, setMonitorTab] = useState<'all' | 'Preparing' | 'Ready' | 'New'>('all')

  const preparingOrders = orders.filter((o) => o.status === 'Preparing')
  const readyOrders = orders.filter((o) => o.status === 'Ready')
  const newOrders = orders.filter((o) => o.status === 'New')
  const completedOrders = orders.filter((o) => o.status === 'Completed')

  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.totalPaisa, 0)

  const activeCount = preparingOrders.length + readyOrders.length + newOrders.length

  const stats = [
    { label: "Today's Orders", value: String(orders.length), trend: `${activeCount} in progress`, tone: 'up' as const },
    { label: 'Food Preparing 🍳', value: String(preparingOrders.length), trend: 'Active in kitchen', tone: 'warm' as const },
    { label: 'Food Ready 🛎️', value: String(readyOrders.length), trend: 'Awaiting delivery', tone: 'up' as const },
    { label: "Gross Revenue", value: formatPaisa(totalRevenue), trend: `${completedOrders.length} served`, tone: 'neutral' as const },
  ]

  const displayOrders =
    monitorTab === 'all'
      ? [...preparingOrders, ...readyOrders, ...newOrders]
      : monitorTab === 'Preparing'
      ? preparingOrders
      : monitorTab === 'Ready'
      ? readyOrders
      : newOrders

  return (
    <div className="page admin-overview-page">
      <PageTitle
        eyebrow="System Oversight &amp; Real-Time Floor Activity"
        title={`${getGreeting()}, Jordan`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.78rem',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                fontWeight: 600,
              }}
            >
              👁️ Monitoring Mode (No Chef Actions)
            </span>
            <span className="live-indicator">
              <i /> Live Kitchen Sync ({activeCount} Active)
            </span>
          </div>
        }
      />

      {/* Top 4 Stat Cards */}
      <section className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small className={stat.tone}>{stat.trend}</small>
          </div>
        ))}
      </section>

      {/* CORE FEATURE: Live Food Preparation & Ready Food Monitor */}
      <section
        className="panel"
        style={{
          background: 'white',
          borderRadius: '10px',
          padding: '1.5rem',
          border: '1px solid var(--line)',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🍳</span>
              <h2 style={{ margin: 0, font: '600 1.25rem "Playfair Display", serif', color: 'var(--ink)' }}>
                Live Food Preparation &amp; Ready Status Monitor
              </h2>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
              Real-time monitoring of which food is preparing on the stove and which food is ready to serve. (Read-only observation).
            </p>
          </div>

          {/* Filter tabs */}
          <div className="filter-tabs">
            <button
              type="button"
              className={monitorTab === 'all' ? 'selected' : ''}
              onClick={() => setMonitorTab('all')}
            >
              All Active ({activeCount})
            </button>
            <button
              type="button"
              className={monitorTab === 'Preparing' ? 'selected' : ''}
              onClick={() => setMonitorTab('Preparing')}
              style={{ color: monitorTab === 'Preparing' ? '#92400e' : undefined }}
            >
              🍳 Preparing Now ({preparingOrders.length})
            </button>
            <button
              type="button"
              className={monitorTab === 'Ready' ? 'selected' : ''}
              onClick={() => setMonitorTab('Ready')}
              style={{ color: monitorTab === 'Ready' ? '#166534' : undefined }}
            >
              🛎️ Ready to Serve ({readyOrders.length})
            </button>
            <button
              type="button"
              className={monitorTab === 'New' ? 'selected' : ''}
              onClick={() => setMonitorTab('New')}
            >
              📝 Queued ({newOrders.length})
            </button>
          </div>
        </div>

        {/* Display of Active Food Items */}
        {displayOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted)' }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              No dishes currently {monitorTab === 'all' ? 'in preparation' : monitorTab.toLowerCase()}.
            </p>
            <small style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              When a customer places an order, dishes will appear here live.
            </small>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {displayOrders.map((order) => {
              const elapsed = getElapsed(order)
              const isPrep = order.status === 'Preparing'
              const isReady = order.status === 'Ready'

              return (
                <div
                  key={order.id}
                  style={{
                    background: isReady ? '#f0fdf4' : isPrep ? '#fffbeb' : '#fafaf9',
                    border: `1px solid ${isReady ? '#86efac' : isPrep ? '#fde68a' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          font: '700 1.15rem "Playfair Display", serif',
                          color: 'var(--green)',
                          letterSpacing: '-0.3px',
                        }}
                      >
                        {(order.table || `Table ${order.tableNumber || '01'}`).toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {order.id}
                      </span>
                    </div>

                    {/* Status Badge (Read-only observation) */}
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: isReady ? '#dcfce7' : isPrep ? '#fef3c7' : '#f1f5f9',
                        color: isReady ? '#166534' : isPrep ? '#92400e' : '#475569',
                        border: `1px solid ${isReady ? '#bbf7d0' : isPrep ? '#fde047' : '#cbd5e1'}`,
                      }}
                    >
                      {isReady ? '🛎️ FOOD READY' : isPrep ? '🍳 PREPARING NOW' : '📝 QUEUED'}
                    </span>
                  </div>

                  {/* Elapsed Time & Placed Time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>
                    <span>Placed at {order.time}</span>
                    <span style={{ fontWeight: 600, color: isPrep ? '#b45309' : isReady ? '#15803d' : '#64748b' }}>
                      {isReady
                        ? `Plated & waiting ~${elapsed}m`
                        : isPrep
                        ? `Cooking for ~${elapsed}m`
                        : `In queue for ~${elapsed}m`}
                    </span>
                  </div>

                  {/* List of Dishes currently preparing / ready */}
                  <div
                    style={{
                      background: 'white',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '6px',
                      padding: '0.6rem 0.75rem',
                      marginBottom: '0.6rem',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Dishes on this order:
                    </div>
                    {Array.isArray(order.items) &&
                      order.items.map((line, idx) => {
                        const itemName = line?.name || (line as any)?.item?.name || 'Dish'
                        const itemQty = line?.quantity || (line as any)?.qty || 1
                        const itemKey = line?.itemId ?? (line as any)?.item?.id ?? idx
                        const linePaisa = line?.pricePaisa || (line as any)?.item?.pricePaisa || 0
                        return (
                          <div
                            key={itemKey}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.85rem',
                              padding: '0.2rem 0',
                            }}
                          >
                            <span>
                              <b style={{ color: 'var(--green)', marginRight: '0.35rem' }}>
                                {itemQty}×
                              </b>
                              {itemName}
                            </span>
                            <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                              {formatPaisa(linePaisa * itemQty)}
                            </span>
                          </div>
                        )
                      })}
                  </div>

                  {/* Special Kitchen Request Note */}
                  {order.note && (
                    <div
                      style={{
                        background: '#fef9c3',
                        border: '1px solid #fef08a',
                        borderRadius: '4px',
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.75rem',
                        color: '#854d0e',
                        marginBottom: '0.6rem',
                      }}
                    >
                      <strong>Special Request:</strong> "{order.note}"
                    </div>
                  )}

                  {/* Read-only notification - Admin does not click ready/completed */}
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: isReady ? '#047857' : isPrep ? '#b45309' : '#64748b',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      paddingTop: '0.4rem',
                      borderTop: '1px dashed rgba(0,0,0,0.08)',
                    }}
                  >
                    <span>●</span>
                    <span>
                      {isReady
                        ? 'Food is ready for serving. Kitchen staff manages handoff.'
                        : isPrep
                        ? 'Chefs are currently preparing this food in the kitchen.'
                        : 'Order queued in kitchen. Awaiting chef initiation.'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Two Column Summary: Floor Activity & Revenue Overview */}
      <section className="content-grid">
        {/* Recent Orders Overview */}
        <div className="panel" style={{ background: 'white', borderRadius: '8px', padding: '1.25rem' }}>
          <div className="panel-heading" style={{ marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem' }}>Floor Activity Log</h2>
              <p>Recent customer order flow across all dining tables</p>
            </div>
          </div>
          {orders.length === 0 ? (
            <p className="empty-note">No orders placed today.</p>
          ) : (
            <div className="recent-list" style={{ display: 'grid', gap: '0.4rem' }}>
              {orders.slice(0, 6).map((order) => (
                <div
                  className="recent-row"
                  key={order.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0',
                    borderBottom: '1px solid var(--line)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <b>{order.id}</b>
                    <span style={{ fontWeight: 600, color: 'var(--green)' }}>{order.table}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>({order.items.length} items)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span className={`status ${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                    <b>{formatPaisa(order.totalPaisa)}</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales Performance Summary */}
        <div className="panel" style={{ background: 'white', borderRadius: '8px', padding: '1.25rem' }}>
          <div className="panel-heading" style={{ marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem' }}>Service Performance</h2>
              <p>Turnaround metrics &amp; dish velocity</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Total Billed Revenue:</span>
              <strong style={{ fontSize: '1rem', color: 'var(--green)' }}>{formatPaisa(totalRevenue)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Completed / Served Tables:</span>
              <strong style={{ fontSize: '0.95rem' }}>{completedOrders.length} tables</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Food Preparing on Stove:</span>
              <strong style={{ fontSize: '0.95rem', color: '#b45309' }}>{preparingOrders.length} orders</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Food Ready for Delivery:</span>
              <strong style={{ fontSize: '0.95rem', color: '#15803d' }}>{readyOrders.length} orders</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Average Order Value:</span>
              <strong style={{ fontSize: '0.95rem' }}>
                {orders.length ? formatPaisa(Math.round(totalRevenue / orders.length)) : '—'}
              </strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

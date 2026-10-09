import { useState } from 'react'
import { formatPaisa } from '../lib/money'
import PageTitle from './PageTitle'
import OrderTable from './OrderTable'

const TABS = ['All', 'New', 'Preparing', 'Ready', 'Completed', 'Cancelled']

export default function OrdersView({
  orders,
  onStatusChange,
}) {
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')

  const exportCsv = () => {
    if (orders.length === 0) return
    const header = 'Order ID,Table,Items,Total (NPR),Status,Placed Time,Notes'
    const rows = orders.map((order) => {
      const items = order.items.map((line) => `${line.quantity}x ${line.name}`).join('; ')
      const note = order.note ? `"${order.note.replace(/"/g, '""')}"` : '""'
      return [
        order.id,
        order.table,
        `"${items.replace(/"/g, '""')}"`,
        (order.totalPaisa / 100).toFixed(2),
        order.status,
        order.time,
        note,
      ].join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredOrders = orders.filter((o) => {
    if (activeTab !== 'All' && o.status !== activeTab) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchesTable = o.table.toLowerCase().includes(q)
      const matchesId = o.id.toLowerCase().includes(q)
      const matchesItems = o.items.some((i) => i.name.toLowerCase().includes(q))
      const matchesNotes = o.note?.toLowerCase().includes(q)
      return matchesTable || matchesId || matchesItems || matchesNotes
    }
    return true
  })

  const activeOrdersCount = orders.filter((o) => o.status === 'New' || o.status === 'Preparing').length
  const completedCount = orders.filter((o) => o.status === 'Completed').length
  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.totalPaisa, 0)

  return (
    <div className="page">
      <PageTitle
        eyebrow={`Operations · ${orders.length} total orders · ${activeOrdersCount} active`}
        title="Live Orders Queue"
        action={
          <div className="filter-tabs">
            {TABS.map((tab) => {
              const count = tab === 'All' ? orders.length : orders.filter((o) => o.status === tab).length
              return (
                <button
                  key={tab}
                  className={activeTab === tab ? 'selected' : ''}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab} ({count})
                </button>
              )
            })}
          </div>
        }
      />

      {/* Summary KPI Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Gross Volume</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>{orders.length} orders</div>
        </div>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>In Service</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d97706' }}>{activeOrdersCount} active</div>
        </div>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Fulfilled</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#059669' }}>{completedCount} completed</div>
        </div>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>Sales Total</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--green)' }}>{formatPaisa(totalRevenue)}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2>
              Order queue <span className="count-pill">{filteredOrders.length}</span>
            </h2>
            <p>Click on any order row to inspect full details, items, and kitchen instructions</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table, item, #id…"
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                fontSize: '0.85rem',
                background: 'var(--paper)',
              }}
            />
            <button className="secondary-button" onClick={exportCsv} disabled={orders.length === 0}>
              Export CSV ↓
            </button>
          </div>
        </div>
        <OrderTable orders={filteredOrders} onStatusChange={onStatusChange} />
      </div>
    </div>
  )
}

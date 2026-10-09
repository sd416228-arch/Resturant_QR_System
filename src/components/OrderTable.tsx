import { useState } from 'react'
import type { Order, OrderStatus } from '../types'
import { formatPaisa } from '../lib/money'

const STATUSES: OrderStatus[] = ['New', 'Preparing', 'Ready', 'Completed', 'Cancelled']

export default function OrderTable({
  orders,
  onStatusChange,
}: {
  orders: Order[]
  onStatusChange: (id: string, status: OrderStatus) => void
}) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  if (orders.length === 0) {
    return <p className="empty-note" style={{ padding: '3rem 0' }}>No orders found matching filter.</p>
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Table</th>
              <th>Items &amp; Notes</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isLocked = order.status === 'Completed' || order.status === 'Cancelled'

              return (
                <tr
                  key={order.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedOrder(order)}
                >
                  <td>
                    <b>{order.id}</b>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--green)' }}>{order.table}</span>
                  </td>
                  <td>
                    <div className="order-items">
                      {order.items.map((line) => (
                        <span key={line.itemId}>
                          <b>{line.quantity}×</b> {line.name}
                        </span>
                      ))}
                      {order.note && (
                        <span
                          style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '9px',
                            display: 'inline-block',
                            marginTop: '2px',
                          }}
                        >
                          ✎ Note: "{order.note}"
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <b>{formatPaisa(order.totalPaisa)}</b>
                  </td>
                  <td>
                    <span className={`status ${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.time}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="status-select"
                      value={order.status}
                      disabled={isLocked}
                      onChange={(event) =>
                        onStatusChange(order.id, event.target.value as OrderStatus)
                      }
                      title={isLocked ? `Locked: ${order.status} orders cannot be modified` : 'Change order status'}
                      style={{
                        opacity: isLocked ? 0.6 : 1,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                      }}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="panel"
            style={{
              maxWidth: '460px',
              width: '100%',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
              <div>
                <h2>Order {selectedOrder.id} Details</h2>
                <p>{selectedOrder.table} · Placed at {selectedOrder.time}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'transparent', fontSize: '1.25rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Current Status:</span>
                <span className={`status ${selectedOrder.status.toLowerCase()}`}>
                  {selectedOrder.status}
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '0.75rem 0', margin: '0.5rem 0' }}>
                <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                  Ordered Items:
                </strong>
                {selectedOrder.items.map((line) => (
                  <div key={line.itemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.9rem' }}>
                    <span>
                      <b>{line.quantity}×</b> {line.name}
                    </span>
                    <span>{formatPaisa(line.pricePaisa * line.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700 }}>
                <span>Order Total:</span>
                <span style={{ color: 'var(--green)' }}>{formatPaisa(selectedOrder.totalPaisa)}</span>
              </div>

              {selectedOrder.note && (
                <div style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.6rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <strong>Kitchen Request:</strong> "{selectedOrder.note}"
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="secondary-button" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
              {selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Cancelled' && (
                <button
                  className="primary-button"
                  onClick={() => {
                    const next: OrderStatus =
                      selectedOrder.status === 'New'
                        ? 'Preparing'
                        : selectedOrder.status === 'Preparing'
                          ? 'Ready'
                          : 'Completed'
                    onStatusChange(selectedOrder.id, next)
                    setSelectedOrder(null)
                  }}
                >
                  Advance to{' '}
                  {selectedOrder.status === 'New'
                    ? 'Preparing'
                    : selectedOrder.status === 'Preparing'
                      ? 'Ready'
                      : 'Completed'}{' '}
                  →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
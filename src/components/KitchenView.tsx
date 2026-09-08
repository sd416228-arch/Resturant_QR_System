import type { Order, OrderStatus } from '../types'
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

export default function KitchenView({
  orders,
  onStatusChange,
}: {
  orders: Order[]
  onStatusChange: (id: string, status: OrderStatus) => void
}) {
  return (
    <div className="page kitchen-page">
      <PageTitle
        eyebrow="Live service"
        title="Kitchen display"
        action={<span className="live-indicator"><i /> Live</span>}
      />
      <div className="kitchen-board">
        {COLUMNS.map((status) => (
          <div className="kitchen-column" key={status}>
            <div className="column-heading">
              <h2>{status}</h2>
              <span>{orders.filter((o) => o.status === status).length}</span>
            </div>
            {orders
              .filter((o) => o.status === status)
              .map((order: Order) => (
                <article className="ticket" key={order.id}>
                  <div className="ticket-top">
                    <b>{order.id}</b>
                    <span>{order.time}</span>
                  </div>
                  <h3>{order.table}</h3>
                  {order.items.map((line) => (
                    <p key={line.itemId}>
                      <b>{line.quantity}×</b> {line.name}
                    </p>
                  ))}
                  {order.note && <div className="note">Note: {order.note}</div>}
                  <button className="ticket-action" onClick={() => onStatusChange(order.id, nextStatus(status))}>
                    {actionLabel(status)} →
                  </button>
                </article>
              ))}
            {orders.filter((o) => o.status === status).length === 0 && (
              <p className="empty-note">Nothing here.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
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
  if (orders.length === 0) {
    return <p className="empty-note">No orders yet.</p>
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Table</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Placed</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td><b>{order.id}</b></td>
              <td>{order.table}</td>
              <td>
                <div className="order-items">
                  {order.items.map((line) => (
                    <span key={line.itemId}>{line.quantity}× {line.name}</span>
                  ))}
                </div>
              </td>
              <td><b>{formatPaisa(order.totalPaisa)}</b></td>
              <td><span className={`status ${order.status.toLowerCase()}`}>{order.status}</span></td>
              <td>{order.time}</td>
              <td>
                <select
                  className="status-select"
                  value={order.status}
                  onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}
                >
                  {STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
import type { Order, OrderStatus } from '../types'
import PageTitle from './PageTitle'
import OrderTable from './OrderTable'

export default function OrdersView({
  orders,
  onStatusChange,
}: {
  orders: Order[]
  onStatusChange: (id: string, status: OrderStatus) => void
}) {
  const exportCsv = () => {
    if (orders.length === 0) return
    const header = 'Order,Table,Items,Total,Status,Placed'
    const rows = orders.map((order) => {
      const items = order.items.map((line) => `${line.quantity}x ${line.name}`).join('; ')
      return [order.id, order.table, `"${items}"`, (order.totalPaisa / 100).toFixed(2), order.status, order.time].join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `moss-ember-orders-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <PageTitle
        eyebrow="Operations"
        title="Orders"
        action={
          <div className="filter-tabs">
            <button className="selected" type="button">All orders</button>
          </div>
        }
      />
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Order queue <span className="count-pill">{orders.length}</span></h2>
            <p>Every order from your restaurant</p>
          </div>
          <button className="secondary-button" onClick={exportCsv}>Export CSV ↓</button>
        </div>
        <OrderTable orders={orders} onStatusChange={onStatusChange} />
      </div>
    </div>
  )
}
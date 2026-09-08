import type { Order } from '../types'
import { formatPaisa } from '../lib/money'
import PageTitle from './PageTitle'

function todayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// All numbers are computed from real order data — no fabricated padding.
export default function Overview({ orders }: { orders: Order[] }) {
  const completed = orders.filter((o) => o.status === 'Completed').length
  const active = orders.filter((o) => o.status === 'New' || o.status === 'Preparing').length
  const revenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.totalPaisa, 0)

  const stats = [
    { label: 'Orders today', value: String(orders.length), trend: `${active} active`, tone: 'up' as const },
    { label: 'Revenue', value: formatPaisa(revenue), trend: `${completed} completed`, tone: 'up' as const },
    { label: 'Needs attention', value: String(active), trend: 'New + preparing', tone: 'warm' as const },
    { label: 'Completed', value: String(completed), trend: 'Today', tone: 'neutral' as const },
  ]

  const recent = orders.slice(0, 5)

  return (
    <div className="page">
      <PageTitle
        eyebrow={new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
        title={`${todayGreeting()}, Jordan`}
        action={
          <a className="primary-button" href="/?restaurant=moss-ember&table=04">
            ＋ New order
          </a>
        }
      />
      <section className="stat-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small className={stat.tone}>{stat.trend}</small>
          </div>
        ))}
      </section>
      <section className="content-grid">
        <div className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent orders</h2>
              <p>Live queue from the kitchen</p>
            </div>
          </div>
          {recent.length === 0 ? (
            <p className="empty-note">No orders yet today.</p>
          ) : (
            <div className="recent-list">
              {recent.map((order) => (
                <div className="recent-row" key={order.id}>
                  <b>{order.id}</b>
                  <span>{order.table}</span>
                  <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
                  <b>{formatPaisa(order.totalPaisa)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Revenue today</h2>
              <p>Non-cancelled orders</p>
            </div>
          </div>
          <p className="revenue-total">{formatPaisa(revenue)}</p>
        </div>
      </section>
    </div>
  )
}
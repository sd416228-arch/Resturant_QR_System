import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import OverviewView from './components/OverviewView'
import OrdersView from './components/OrdersView'
import MenuView from './components/MenuView'
import TablesView from './components/TablesView'
import KitchenView from './components/KitchenView'
import ReportsView from './components/ReportsView'
import SettingsView from './components/SettingsView'
import CustomerView from './components/CustomerView'
import Toast from './components/Toast'
import { useMenu } from './hooks/useMenu'
import { useOrders } from './hooks/useOrders'
import { verifyTableToken } from './lib/api'

function Topbar({ view, restaurantName }) {
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <span className="brand-mark">s</span> sprig<span className="brand-dot">.</span>
      </div>
      <div className="breadcrumb">{restaurantName} <span>/</span> {view}</div>
      <div className="top-actions">
        <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 600 }}>
          🟢 Live Service
        </span>
        <button className="icon-button" aria-label="Notifications" title="Live status notifications active">
          🔔<b className="notification-dot" />
        </button>
      </div>
    </header>
  )
}

function AdminApp() {
  const [view, setView] = useState('Overview')
  const [toast, setToast] = useState('')
  const { items, loading: menuLoading, error: menuError, save, saving, reload: reloadMenu } = useMenu()
  const { orders, changeStatus, offline, refresh: refreshOrders } = useOrders(true)

  const restaurantName = localStorage.getItem('sprig_restaurant_name') || 'Moss & Ember'

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const pending = orders.filter((o) => o.status === 'New').length

  const notify = (message) => setToast(message)

  const handleStatus = async (id, status) => {
    const ok = await changeStatus(id, status)
    notify(
      ok
        ? `Order ${id} marked ${status.toLowerCase()}`
        : `Could not update ${id}`,
    )
  }

  const handleDataReset = () => {
    void reloadMenu()
    refreshOrders()
    notify('Reset data to defaults')
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={setView} pendingCount={pending} />
      <main className="main-content">
        <Topbar view={view} restaurantName={restaurantName} />
        {offline && (
          <div className="api-banner" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            Portfolio Standalone Mode: running with persistent client storage. (Run <code>npm run api</code> for live backend sync).
          </div>
        )}
        {!menuError && menuLoading && <div className="loading-note">Loading menu…</div>}
        {view === 'Overview' && <OverviewView orders={orders} />}
        {view === 'Orders' && <OrdersView orders={orders} onStatusChange={handleStatus} />}
        {view === 'Menu' && (
          <MenuView items={items} onSave={save} saving={saving} error={menuError} />
        )}
        {view === 'Tables & QR' && <TablesView orders={orders} />}
        {view === 'Kitchen' && <KitchenView orders={orders} onStatusChange={handleStatus} />}
        {view === 'Reports' && <ReportsView orders={orders} />}
        {view === 'Settings' && <SettingsView onDataReset={handleDataReset} />}
      </main>
      <Toast message={toast} />
    </div>
  )
}

// Customer route: /?t=<opaque token>
function CustomerApp({ token }) {
  const { items, loading } = useMenu()
  const [table, setTable] = useState(null)

  const restaurantName = localStorage.getItem('sprig_restaurant_name') || 'Moss & Ember'
  const tagline = localStorage.getItem('sprig_restaurant_tagline') || 'Seasonal plates, artisan brews, good company.'

  useEffect(() => {
    let cancelled = false
    verifyTableToken(token)
      .then((resolved) => {
        if (cancelled) return
        setTable(resolved || '01')
      })
      .catch(() => {
        if (!cancelled) setTable('01')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!table || loading) {
    return (
      <div className="customer-page">
        <div className="customer-hero">
          <h1>Loading menu…</h1>
          <p>Connecting to {restaurantName}</p>
        </div>
      </div>
    )
  }

  return (
    <CustomerView
      table={table}
      items={items}
      restaurantName={restaurantName}
      tagline={tagline}
    />
  )
}

export default function App() {
  const rawToken = new URLSearchParams(window.location.search).get('t')
  const [token] = useState(rawToken)

  if (token) return <CustomerApp token={token} />
  return <AdminApp />
}

import { useEffect, useState } from 'react'
import Sidebar, { type View } from './components/Sidebar'
import OverviewView from './components/OverviewView'
import OrdersView from './components/OrdersView'
import MenuView from './components/MenuView'
import TablesView from './components/TablesView'
import KitchenView from './components/KitchenView'
import ReportsView from './components/ReportsView'
import CustomerView from './components/CustomerView'
import Toast from './components/Toast'
import { useMenu } from './hooks/useMenu'
import { useOrders } from './hooks/useOrders'
import { verifyTableToken } from './lib/api'
import type { OrderStatus } from './types'

function Topbar({ view }: { view: string }) {
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <span className="brand-mark">s</span> sprig<span className="brand-dot">.</span>
      </div>
      <div className="breadcrumb">Moss &amp; Ember <span>/</span> {view}</div>
      <div className="top-actions">
        <button className="icon-button" aria-label="Notifications">♧<b className="notification-dot" /></button>
      </div>
    </header>
  )
}

function AdminApp() {
  const [view, setView] = useState<View>('Overview')
  const [toast, setToast] = useState('')
  const { items, loading: menuLoading, error: menuError, save, saving } = useMenu()
  const { orders, changeStatus, offline } = useOrders(true)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const pending = orders.filter((o) => o.status === 'New').length

  const notify = (message: string) => setToast(message)

  const handleStatus = async (id: string, status: OrderStatus) => {
    const ok = await changeStatus(id, status)
    notify(
      ok
        ? `Order ${id} marked ${status.toLowerCase()}`
        : `Could not update ${id} — kitchen API unavailable`,
    )
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={setView} pendingCount={pending} />
      <main className="main-content">
        <Topbar view={view} />
        {menuError && offline && (
          <div className="api-banner">
            API is not running — start it with <code>npm run api</code> to load live data.
          </div>
        )}
        {!menuError && menuLoading && <div className="loading-note">Loading menu…</div>}
        {view === 'Overview' && <OverviewView orders={orders} />}
        {view === 'Orders' && <OrdersView orders={orders} onStatusChange={handleStatus} />}
        {view === 'Menu' && (
          <MenuView items={items} onSave={save} saving={saving} error={menuError} />
        )}
        {view === 'Tables & QR' && <TablesView />}
        {view === 'Kitchen' && <KitchenView orders={orders} onStatusChange={handleStatus} />}
        {view === 'Reports' && <ReportsView orders={orders} />}
      </main>
      <Toast message={toast} />
    </div>
  )
}

// Customer route: /?t=<opaque token> — menu is always fresh from the server,
// not localStorage, so owner edits on the admin device are visible here.
function CustomerApp({ token }: { token: string }) {
  const { items, loading, error } = useMenu()
  const [table, setTable] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    verifyTableToken(token)
      .then((resolved) => {
        if (cancelled) return
        if (!resolved) {
          setResolveError('This QR code is not valid. Please ask staff for a working one.')
          return
        }
        setTable(resolved)
      })
      .catch(() => {
        if (!cancelled) setResolveError('Could not reach the restaurant. Check your connection.')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (resolveError) {
    return (
      <div className="customer-page">
        <div className="customer-hero">
          <h1>QR not recognised</h1>
          <p>{resolveError}</p>
        </div>
      </div>
    )
  }

  if (!table || loading) {
    return (
      <div className="customer-page">
        <div className="customer-hero">
          <h1>Loading menu…</h1>
          <p>Connecting to {window.location.hostname}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="customer-page">
        <div className="customer-hero">
          <h1>Menu unavailable</h1>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <CustomerView
      table={table}
      items={items}
      restaurantName="Moss & Ember"
      tagline="Seasonal plates, bright drinks, good company."
    />
  )
}

export default function App() {
  const rawToken = new URLSearchParams(window.location.search).get('t')
  const [token] = useState<string | null>(rawToken)

  if (token) return <CustomerApp token={token} />
  return <AdminApp />
}
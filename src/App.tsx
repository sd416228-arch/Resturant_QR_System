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
import WaiterView from './components/WaiterView'
import ServiceRequestsAdminView from './components/ServiceRequestsAdminView'
import Toast from './components/Toast'
import { useMenu } from './hooks/useMenu'
import { useOrders } from './hooks/useOrders'
import { useServiceRequests } from './hooks/useServiceRequests'
import { verifyTableToken } from './lib/api'
import type { OrderStatus } from './types'

export type AppRole = 'customer' | 'kitchen' | 'waiter' | 'admin'

function getInitialRole(): AppRole {
  const path = window.location.pathname.toLowerCase()
  const search = new URLSearchParams(window.location.search)
  if (path.includes('/waiter') || search.get('role') === 'waiter') {
    return 'waiter'
  }
  if (path.includes('/kitchen') || search.get('role') === 'kitchen') {
    return 'kitchen'
  }
  if (
    path.includes('/customer') ||
    search.has('t') ||
    search.has('table') ||
    search.get('role') === 'customer'
  ) {
    return 'customer'
  }
  return 'admin'
}

function getInitialTable(): string {
  const search = new URLSearchParams(window.location.search)
  if (search.get('table')) {
    return search.get('table')!.replace(/\D/g, '').padStart(2, '0') || '04'
  }
  return localStorage.getItem('sprig_active_table') || '04'
}

export default function App() {
  const [role, setRole] = useState<AppRole>(getInitialRole)
  const [adminView, setAdminView] = useState<'Overview' | 'Orders' | 'Menu' | 'Tables & QR' | 'Kitchen' | 'Kitchen Monitor' | 'Service Requests' | 'Reports' | 'Settings'>('Overview')
  const [activeTable, setActiveTable] = useState<string>(getInitialTable)
  const [toast, setToast] = useState('')

  const { items, loading: menuLoading, error: menuError, save: saveMenu, saving: menuSaving, reload: reloadMenu } = useMenu()
  const { orders, changeStatus, offline: ordersOffline, refresh: refreshOrders } = useOrders(true)
  const {
    requests: serviceRequests,
    reload: reloadServiceRequests,
    acceptRequest: acceptServiceReq,
    setStatus: setServiceReqStatus,
    reassign: reassignServiceReq,
  } = useServiceRequests(true)

  const restaurantName = localStorage.getItem('sprig_restaurant_name') || 'Moss & Ember'
  const tagline = localStorage.getItem('sprig_restaurant_tagline') || 'Artisanal plates, craft brews, good company.'

  // Resolve QR token if opened via ?t=token
  useEffect(() => {
    const rawToken = new URLSearchParams(window.location.search).get('t')
    if (rawToken) {
      verifyTableToken(rawToken).then((resolved) => {
        if (resolved) {
          const t = resolved.replace(/\D/g, '').padStart(2, '0') || '04'
          setActiveTable(t)
          localStorage.setItem('sprig_active_table', t)
        }
      })
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sprig_active_table', activeTable)
  }, [activeTable])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const notify = (msg: string) => setToast(msg)

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    const ok = await changeStatus(id, status)
    if (ok) {
      notify(`Order ${id} marked ${status.toLowerCase()}`)
    } else {
      notify(`Could not update order ${id}`)
    }
  }

  const handleRoleSwitch = (newRole: AppRole) => {
    setRole(newRole)
    const url = new URL(window.location.href)
    url.searchParams.set('role', newRole)
    if (newRole === 'customer') {
      url.searchParams.set('table', activeTable)
    } else {
      url.searchParams.delete('t')
      url.searchParams.delete('table')
    }
    window.history.replaceState({}, '', url.toString())
  }

  const handleDataReset = () => {
    void reloadMenu()
    refreshOrders()
    notify('Reset restaurant data to defaults')
  }

  const activeKitchenOrders = orders.filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled')
  const newOrdersCount = orders.filter((o) => o.status === 'New').length
  const pendingServiceCount = serviceRequests.filter((r) => r.status === 'Pending').length

  return (
    <div className="role-app-root">
      {/* Universal Top Role Selector Bar */}
      <header
        className="role-switcher-bar"
        style={{
          background: '#15241d',
          borderBottom: '1px solid #284435',
          color: '#e2e8f0',
          padding: '0.5rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#f8fafc' }}>
            <span
              style={{
                background: 'var(--green)',
                color: 'white',
                borderRadius: '6px',
                width: '24px',
                height: '24px',
                display: 'inline-grid',
                placeItems: 'center',
                font: 'italic bold 16px Georgia',
              }}
            >
              s
            </span>
            <span style={{ fontSize: '1rem', letterSpacing: '-0.5px' }}>
              sprig<span style={{ color: 'var(--rust)' }}>.</span>
            </span>
          </div>

          <span style={{ color: '#475569', fontSize: '0.8rem' }}>|</span>

          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
            Active Mode:
          </span>
        </div>

        {/* 3 Core Roles Buttons */}
        <div
          className="role-buttons-group"
          style={{
            display: 'inline-flex',
            background: '#0d1813',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #233b2f',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => handleRoleSwitch('customer')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: 0,
              fontSize: '0.82rem',
              fontWeight: role === 'customer' ? 700 : 500,
              background: role === 'customer' ? 'var(--green)' : 'transparent',
              color: role === 'customer' ? 'white' : '#94a3b8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📱 Customer</span>
            <small style={{ opacity: 0.85, fontSize: '0.72rem' }}>
              (Table {activeTable})
            </small>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('kitchen')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: 0,
              fontSize: '0.82rem',
              fontWeight: role === 'kitchen' ? 700 : 500,
              background: role === 'kitchen' ? '#cf5c3a' : 'transparent',
              color: role === 'kitchen' ? 'white' : '#94a3b8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>👨‍🍳 Kitchen Display</span>
            {activeKitchenOrders.length > 0 && (
              <span
                style={{
                  background: role === 'kitchen' ? 'white' : '#ef4444',
                  color: role === 'kitchen' ? '#cf5c3a' : 'white',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {activeKitchenOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('waiter')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: 0,
              fontSize: '0.82rem',
              fontWeight: role === 'waiter' ? 700 : 500,
              background: role === 'waiter' ? '#d97706' : 'transparent',
              color: role === 'waiter' ? 'white' : '#94a3b8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🧑‍💼 Waiter Staff</span>
            {pendingServiceCount > 0 && (
              <span
                style={{
                  background: role === 'waiter' ? 'white' : '#ef4444',
                  color: role === 'waiter' ? '#d97706' : 'white',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {pendingServiceCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('admin')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: 0,
              fontSize: '0.82rem',
              fontWeight: role === 'admin' ? 700 : 500,
              background: role === 'admin' ? '#2563eb' : 'transparent',
              color: role === 'admin' ? 'white' : '#94a3b8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>👑 Admin Console</span>
          </button>
        </div>

        {/* Status / Quick Table Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: ordersOffline ? '#f87171' : '#4ade80',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: ordersOffline ? '#ef4444' : '#22c55e',
                boxShadow: ordersOffline ? 'none' : '0 0 6px #22c55e',
              }}
            />
            {ordersOffline ? 'Offline Cache' : 'Live Sync Online'}
          </span>
        </div>
      </header>

      {/* Main Role Content */}
      {role === 'customer' && (
        <main className="role-content customer-role-view">
          <CustomerView
            table={activeTable}
            items={items}
            restaurantName={restaurantName}
            tagline={tagline}
            onChangeTable={(newT) => {
              setActiveTable(newT)
              notify(`Table switched to ${newT}`)
            }}
          />
        </main>
      )}

      {role === 'kitchen' && (
        <main className="role-content kitchen-role-view" style={{ background: '#f5f3ed', minHeight: 'calc(100vh - 45px)' }}>
          <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem' }}>
            <KitchenView orders={orders} onStatusChange={handleStatusChange} />
          </div>
        </main>
      )}

      {role === 'waiter' && (
        <main className="role-content waiter-role-view" style={{ minHeight: 'calc(100vh - 45px)' }}>
          <WaiterView
            requests={serviceRequests}
            onAccept={acceptServiceReq}
            onStatusChange={(id, status, waiterId) => setServiceReqStatus(id, status, waiterId, false)}
            onRelease={(id, waiterId) => reassignServiceReq(id, { waiterId, isAdmin: false })}
            onRefresh={reloadServiceRequests}
          />
        </main>
      )}

      {role === 'admin' && (
        <div className="app-shell">
          <Sidebar
            view={adminView}
            onNavigate={(newView) => setAdminView(newView)}
            pendingCount={newOrdersCount}
            activeKitchenCount={activeKitchenOrders.length}
            pendingServiceCount={pendingServiceCount}
          />
          <main className="main-content">
            <header className="topbar">
              <div className="mobile-brand">
                <span className="brand-mark">s</span> sprig<span className="brand-dot">.</span>
              </div>
              <div className="breadcrumb">
                {restaurantName} <span>/</span> {adminView}
              </div>
              <div className="top-actions">
                <span
                  style={{
                    fontSize: '0.78rem',
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>👁️ Supervisory Monitor</span>
                </span>
                <span className="live-indicator">
                  <i /> Live Sync
                </span>
              </div>
            </header>

            {menuLoading && <div className="loading-note" style={{ padding: '1rem', color: 'var(--muted)' }}>Loading live menu…</div>}
            {menuError && <div style={{ padding: '1rem', color: '#b91c1c' }}>{menuError}</div>}

            {adminView === 'Overview' && (
              <OverviewView orders={orders} />
            )}

            {adminView === 'Orders' && (
              <OrdersView orders={orders} onStatusChange={handleStatusChange} />
            )}

            {adminView === 'Menu' && (
              <MenuView
                items={items}
                onSave={saveMenu}
                saving={menuSaving}
                error={menuError}
              />
            )}

            {adminView === 'Tables & QR' && (
              <TablesView orders={orders} />
            )}

            {(adminView === 'Kitchen' || adminView === 'Kitchen Monitor') && (
              <KitchenView orders={orders} readOnly={true} />
            )}

            {adminView === 'Service Requests' && (
              <ServiceRequestsAdminView
                requests={serviceRequests}
                onReassign={(id, params) => reassignServiceReq(id, params)}
                onStatusChange={(id, status, isAdmin) => setServiceReqStatus(id, status, undefined, isAdmin)}
              />
            )}

            {adminView === 'Reports' && (
              <ReportsView orders={orders} />
            )}

            {adminView === 'Settings' && (
              <SettingsView onDataReset={handleDataReset} />
            )}
          </main>
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}

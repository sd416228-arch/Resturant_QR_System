import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { requestTableToken } from '../lib/api'
import PageTitle from './PageTitle'

const DEFAULT_TABLES = Array.from({ length: 12 }, (_, index) => ({
  number: String(index + 1).padStart(2, '0'),
  capacity: index % 3 === 0 ? 6 : index % 2 === 0 ? 2 : 4,
}))

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]' || hostname.endsWith('.localhost')
}

function isLoopbackUrl(value) {
  try {
    return isLoopbackHost(new URL(value).hostname)
  } catch {
    return false
  }
}

// Public base URL for QR codes: stored setting > env > LAN origin > fallback guess
function resolvePublicUrl() {
  const stored = localStorage.getItem('sprig_public_url')
  if (stored && !isLoopbackUrl(stored)) return stored.replace(/\/$/, '')
  const envUrl = import.meta.env.VITE_PUBLIC_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !isLoopbackUrl(envUrl.trim())) {
    return envUrl.trim().replace(/\/$/, '')
  }
  if (!isLoopbackHost(window.location.hostname)) {
    return window.location.origin.replace(/\/$/, '')
  }
  return `http://192.168.1.2:${window.location.port || '5173'}`
}

// Only auto-detect when nothing custom is configured and the page is on localhost
function shouldDetectLanUrl() {
  const stored = localStorage.getItem('sprig_public_url')
  if (stored && !isLoopbackUrl(stored)) return false
  const envUrl = import.meta.env.VITE_PUBLIC_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !isLoopbackUrl(envUrl.trim())) return false
  return isLoopbackHost(window.location.hostname)
}

function QRCard({
  table,
  publicBaseUrl,
  onOpenPreview,
  onOpenPlacard,
}) {
  const [src, setSrc] = useState('')
  const [token, setToken] = useState(null)
  const [qrTargetUrl, setQrTargetUrl] = useState('')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    requestTableToken(table).then((result) => {
      if (cancelled) return
      if (!result) {
        setStatus('error')
        return
      }
      setToken(result.token)
      const qrUrl = `${publicBaseUrl.replace(/\/$/, '')}/customer/dashboard?t=${encodeURIComponent(result.token)}`
      setQrTargetUrl(qrUrl)

      QRCode.toDataURL(qrUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#1c342b', light: '#ffffff' },
      })
        .then((dataUrl) => {
          if (cancelled) return
          setSrc(dataUrl)
          setStatus('ready')
        })
        .catch(() => {
          if (!cancelled) setStatus('error')
        })
    })
    return () => {
      cancelled = true
    }
  }, [table, publicBaseUrl])

  const download = () => {
    if (!src || !token) return
    const link = document.createElement('a')
    link.download = `table-${table}-qr.png`
    link.href = src
    link.click()
  }

  return (
    <div className="qr-placeholder" style={{ minHeight: '190px', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
      {status === 'loading' && <span style={{ fontSize: '0.85rem' }}>Generating secure QR…</span>}
      {status === 'error' && <small style={{ color: '#ef4444' }}>Error generating QR</small>}
      {status === 'ready' && src && (
        <img
          src={src}
          alt={`QR code for table ${table}`}
          style={{ width: '115px', height: '115px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        />
      )}
      <small style={{ marginTop: '0.35rem', fontWeight: 600, color: 'var(--ink)' }}>
        SCAN FOR TABLE {table}
      </small>

      <div style={{ display: 'flex', gap: '0.4rem', width: '100%', marginTop: '0.6rem' }}>
        <button
          type="button"
          className="qr-download"
          onClick={() => token && onOpenPreview(token)}
          disabled={status !== 'ready'}
          title="Open customer order page for this table"
          style={{
            flex: 1,
            background: 'var(--green)',
            color: 'white',
            fontWeight: 600,
            padding: '0.4rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            textDecoration: 'none',
          }}
        >
          Preview ↗
        </button>
        <button
          type="button"
          className="qr-download"
          onClick={() => src && onOpenPlacard(table, src, qrTargetUrl)}
          disabled={status !== 'ready'}
          title="Open printable table placard"
          style={{
            flex: 1,
            background: '#e2e8f0',
            color: '#334155',
            fontWeight: 600,
            padding: '0.4rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            textDecoration: 'none',
          }}
        >
          Placard ⎙
        </button>
        <button
          type="button"
          className="qr-download"
          onClick={download}
          disabled={status !== 'ready'}
          title="Download PNG for print"
          style={{
            background: 'transparent',
            color: '#64748b',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '0.4rem 0.5rem',
            fontSize: '0.75rem',
          }}
        >
          PNG ↓
        </button>
      </div>
    </div>
  )
}

export default function TablesView({ orders = [] }) {
  const [tables, setTables] = useState(() => {
    try {
      const stored = localStorage.getItem('sprig_restaurant_tables')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // fallback
    }
    return DEFAULT_TABLES
  })

  // Dynamic public URL configuration for mobile QR scans
  const [publicBaseUrl, setPublicBaseUrl] = useState(resolvePublicUrl)

  const [urlInput, setUrlInput] = useState(publicBaseUrl)
  const initialUrlRef = useRef(publicBaseUrl)
  const [showUrlSettings, setShowUrlSettings] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [placardModal, setPlacardModal] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newTableNum, setNewTableNum] = useState('')
  const [newCapacity, setNewCapacity] = useState('4')

  // Ask the dev/prod server for this machine's real LAN IP so scanned QR codes work
  useEffect(() => {
    if (!shouldDetectLanUrl()) return
    let cancelled = false
    fetch('/api/lan-info')
      .then((res) => (res.ok ? res.json() : null))
      .then((info) => {
        if (cancelled || !info || !info.lanIp) return
        const stored = localStorage.getItem('sprig_public_url')
        if (stored && !isLoopbackUrl(stored)) return
        const detected = `http://${info.lanIp}:${window.location.port || '5173'}`
        setPublicBaseUrl(detected)
        setUrlInput((prev) => (prev === initialUrlRef.current ? detected : prev))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const saveTables = (updated) => {
    setTables(updated)
    try {
      localStorage.setItem('sprig_restaurant_tables', JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  const handleSavePublicUrl = (e) => {
    e.preventDefault()
    const cleaned = urlInput.trim().replace(/\/$/, '')
    setPublicBaseUrl(cleaned)
    localStorage.setItem('sprig_public_url', cleaned)
    setShowUrlSettings(false)
  }

  const handleUseCurrentHost = () => {
    const currentOrigin = isLoopbackHost(window.location.hostname)
      ? publicBaseUrl.replace(/\/$/, '')
      : window.location.origin.replace(/\/$/, '')
    setUrlInput(currentOrigin)
    setPublicBaseUrl(currentOrigin)
    localStorage.setItem('sprig_public_url', currentOrigin)
    setShowUrlSettings(false)
  }

  // Active orders per table
  const activeOrdersByTable = new Map()
  orders.forEach((o) => {
    if (o.status === 'New' || o.status === 'Preparing') {
      const num = o.tableNumber?.padStart(2, '0') || o.table.replace(/\D/g, '').padStart(2, '0')
      const existing = activeOrdersByTable.get(num) || []
      activeOrdersByTable.set(num, [...existing, o])
    }
  })

  const handleOpenPreview = (token) => {
    const url = `${publicBaseUrl.replace(/\/$/, '')}/customer/dashboard?t=${encodeURIComponent(token)}`
    window.open(url, '_blank')
  }

  const handleOpenPlacard = (table, qrSrc, fullUrl) => {
    setPlacardModal({ table, qrSrc, fullUrl })
  }

  const handleAddTable = () => {
    const num = newTableNum.trim() ? newTableNum.trim().padStart(2, '0') : null
    const cap = Number(newCapacity) || 4
    if (!num) return
    if (tables.some((t) => t.number === num)) {
      alert(`Table ${num} already exists.`)
      return
    }
    const updated = [...tables, { number: num, capacity: cap }].sort((a, b) => Number(a.number) - Number(b.number))
    saveTables(updated)
    setNewTableNum('')
    setAddModalOpen(false)
  }

  const deleteTable = (tableNumber) => {
    if (activeOrdersByTable.has(tableNumber)) {
      alert(`Cannot delete Table ${tableNumber} because it currently has active orders!`)
      return
    }
    if (window.confirm(`Are you sure you want to remove Table ${tableNumber}?`)) {
      saveTables(tables.filter((t) => t.number !== tableNumber))
    }
  }

  const filteredTables = tables.filter((t) => {
    const isOccupied = activeOrdersByTable.has(t.number)
    if (activeFilter === 'occupied') return isOccupied
    if (activeFilter === 'available') return !isOccupied
    return true
  })

  const occupiedCount = tables.filter((t) => activeOrdersByTable.has(t.number)).length

  return (
    <div className="page">
      <PageTitle
        eyebrow={`Floor plan · ${tables.length} tables · ${occupiedCount} active orders`}
        title="Tables & QR Codes"
        action={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                const max = tables.reduce((largest, t) => Math.max(largest, Number(t.number) || 0), 0)
                setNewTableNum(String(max + 1).padStart(2, '0'))
                setAddModalOpen(true)
              }}
            >
              ＋ Add table
            </button>
          </div>
        }
      />

      {/* Mobile Network Configuration Banner */}
      <div
        style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📱</span>
            <strong style={{ color: '#166534', fontSize: '0.9rem' }}>Mobile Scanner Network URL:</strong>
            <code style={{ background: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 600, color: 'var(--green)' }}>
              {publicBaseUrl}
            </code>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#15803d' }}>
            When phones scan the QR code on your Wi-Fi, they will connect to this address. (Your mobile phone and this computer must be on the same Wi-Fi network).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUrlSettings(!showUrlSettings)}
          className="secondary-button"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
        >
          {showUrlSettings ? 'Hide URL Config' : 'Change Wi-Fi IP / Port ⚙'}
        </button>
      </div>

      {showUrlSettings && (
        <form
          onSubmit={handleSavePublicUrl}
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <label>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
              QR Base URL (e.g. your computer's Wi-Fi IP and Vite port):
            </span>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://192.168.1.2:5173"
              style={{ width: '100%', maxWidth: '400px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.85rem' }}
            />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="primary-button" type="submit" style={{ padding: '0.45rem 1rem' }}>
              Update QR Codes
            </button>
            <button className="secondary-button" type="button" onClick={handleUseCurrentHost} style={{ padding: '0.45rem 1rem' }}>
              Auto-Set to {window.location.origin}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="filter-tabs">
          <button
            type="button"
            className={activeFilter === 'all' ? 'selected' : ''}
            onClick={() => setActiveFilter('all')}
          >
            All tables ({tables.length})
          </button>
          <button
            type="button"
            className={activeFilter === 'occupied' ? 'selected' : ''}
            onClick={() => setActiveFilter('occupied')}
          >
            Occupied ({occupiedCount})
          </button>
          <button
            type="button"
            className={activeFilter === 'available' ? 'selected' : ''}
            onClick={() => setActiveFilter('available')}
          >
            Available ({tables.length - occupiedCount})
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
          Each QR code is uniquely encrypted per table to prevent order spoofing.
        </p>
      </div>

      {/* Add Table Modal */}
      {addModalOpen && (
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
        >
          <div
            className="panel"
            style={{
              maxWidth: '400px',
              width: '100%',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div className="panel-heading">
              <div>
                <h2>Add Table</h2>
                <p>Register a new dining table to the floor plan</p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                style={{ background: 'transparent', fontSize: '1.25rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '0.85rem', marginTop: '1rem' }}>
              <label>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Table Number
                </span>
                <input
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  placeholder="e.g. 13"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)' }}
                />
              </label>

              <label>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Seating Capacity (Guests)
                </span>
                <select
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)' }}
                >
                  <option value="2">2 Seats (Intimate / Bistro)</option>
                  <option value="4">4 Seats (Standard Booth)</option>
                  <option value="6">6 Seats (Family Table)</option>
                  <option value="8">8 Seats (Large Group)</option>
                  <option value="12">12 Seats (Party Banquet)</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="secondary-button" onClick={() => setAddModalOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleAddTable} disabled={!newTableNum.trim()}>
                Save Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placard Print / Preview Modal */}
      {placardModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: '440px',
              width: '100%',
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <strong style={{ fontSize: '1rem' }}>Table Placard Preview</strong>
              <button
                type="button"
                onClick={() => setPlacardModal(null)}
                style={{ background: 'transparent', fontSize: '1.25rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Printable Placard Card */}
            <div
              id="printable-placard"
              style={{
                border: '3px solid var(--green)',
                borderRadius: '12px',
                padding: '2rem 1.5rem',
                background: '#fafaf9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                margin: '0 auto',
              }}
            >
              <div style={{ font: 'italic bold 20px Georgia, serif', color: 'var(--green)' }}>
                Moss &amp; Ember
              </div>
              <div style={{ fontSize: '0.8rem', color: '#78716c', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '0.2rem' }}>
                Artisan Kitchen &amp; Bar
              </div>

              <div style={{ margin: '1.25rem 0 0.5rem', font: '700 48px "Playfair Display", serif', color: 'var(--ink)' }}>
                {placardModal.table}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rust)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Table {placardModal.table}
              </div>

              <div style={{ margin: '1.25rem 0', background: 'white', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
                <img
                  src={placardModal.qrSrc}
                  alt={`QR for Table ${placardModal.table}`}
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--green)', margin: '0.5rem 0 0.2rem' }}>
                Scan to View Menu &amp; Order
              </div>
              <div style={{ fontSize: '0.75rem', color: '#78716c', maxWidth: '240px', lineHeight: 1.4 }}>
                Point your phone camera at the QR code. No app or download required.
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', wordBreak: 'break-all' }}>
                {placardModal.fullUrl}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'center' }}>
              <button
                className="primary-button"
                onClick={() => window.print()}
                style={{ padding: '0.6rem 1.25rem' }}
              >
                Print Placard ⎙
              </button>
              <button
                className="secondary-button"
                onClick={() => setPlacardModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Cards Grid */}
      <div className="table-grid">
        {filteredTables.map((table) => {
          const activeOrders = activeOrdersByTable.get(table.number) || []
          const hasActiveOrder = activeOrders.length > 0

          return (
            <article className="table-card" key={table.number} style={{ position: 'relative' }}>
              <div className="table-card-top">
                <span
                  className={`table-status ${hasActiveOrder ? 'occupied' : 'available'}`}
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: hasActiveOrder ? '#f59e0b' : '#10b981',
                    marginRight: '6px',
                  }}
                />
                {hasActiveOrder ? (
                  <span style={{ color: '#d97706', fontWeight: 600 }}>
                    {activeOrders.length} Active {activeOrders.length === 1 ? 'Order' : 'Orders'}
                  </span>
                ) : (
                  <span style={{ color: '#059669' }}>Available</span>
                )}

                <button
                  type="button"
                  onClick={() => deleteTable(table.number)}
                  title={`Remove Table ${table.number}`}
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    marginLeft: 'auto',
                    padding: '0 0.2rem',
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="table-number">{table.number}</div>
              <p>Table {table.number} · Seats {table.capacity}</p>

              <QRCard
                table={table.number}
                publicBaseUrl={publicBaseUrl}
                onOpenPreview={handleOpenPreview}
                onOpenPlacard={handleOpenPlacard}
              />
            </article>
          )
        })}

        {filteredTables.length === 0 && (
          <p className="empty-note" style={{ gridColumn: '1 / -1', padding: '3rem 0' }}>
            No tables matching filter.
          </p>
        )}
      </div>
    </div>
  )
}

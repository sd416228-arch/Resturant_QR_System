import { useEffect, useRef, useState } from 'react'
import type { CartLine, MenuItem, Order, OrderStatus, ServiceRequest, ServiceRequestType } from '../types'
import { formatPaisa } from '../lib/money'
import { fetchOrders, placeOrder, fetchServiceRequests, createServiceRequest, updateServiceRequestStatus } from '../lib/api'
import { playFoodReadyChime } from '../lib/sound'
import CallWaiterModal from './CallWaiterModal'

interface ConfirmViewProps {
  table: string
  cart: CartLine[]
  totalPaisa: number
  onBack: () => void
  onUpdateQuantity: (itemId: number, delta: number) => void
  onRemoveItem: (itemId: number) => void
  onSubmit: (note: string) => Promise<{ ok: boolean; error?: string }>
}

export function ConfirmView({
  table,
  cart,
  totalPaisa,
  onBack,
  onUpdateQuantity,
  onRemoveItem,
  onSubmit,
}: ConfirmViewProps) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    setError('')
    const result = await onSubmit(note)
    if (!result.ok) {
      setError(result.error || 'The kitchen could not accept this order right now. Please ask staff.')
      setSubmitting(false)
    }
  }

  return (
    <div className="customer-page">
      <div className="customer-hero">
        <span className="customer-logo">m&amp;e</span>
        <span className="customer-table">Table {table}</span>
        <h1>Review your order</h1>
        <p>Confirm your dishes and send directly to the kitchen display</p>
      </div>
      <div className="customer-content">
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p className="empty-note">Your cart is empty.</p>
            <button className="primary-button" onClick={onBack} style={{ marginTop: '1rem' }}>
              ← Browse Menu
            </button>
          </div>
        ) : (
          <>
            <div className="cart-list" style={{ display: 'grid', gap: '0.75rem' }}>
              {cart.map((line) => (
                <div
                  className="confirm-line"
                  key={line.item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 0',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' }}>{line.item.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {formatPaisa(line.item.pricePaisa)} each · {line.item.prep}m prep
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f0f3ed', borderRadius: '6px', border: '1px solid var(--line)' }}>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(line.item.id, -1)}
                        style={{ padding: '0.3rem 0.6rem', background: 'transparent', fontWeight: 'bold', fontSize: '1rem', color: 'var(--green)' }}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(line.item.id, 1)}
                        style={{ padding: '0.3rem 0.6rem', background: 'transparent', fontWeight: 'bold', fontSize: '1rem', color: 'var(--green)' }}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <strong style={{ minWidth: '70px', textAlign: 'right', fontSize: '0.95rem' }}>
                      {formatPaisa(line.item.pricePaisa * line.quantity)}
                    </strong>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(line.item.id)}
                      title="Remove item"
                      style={{ background: 'transparent', color: '#94a3b8', fontSize: '1rem', padding: '0.3rem' }}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="confirm-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '2px solid var(--line)' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total amount</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--green)' }}>{formatPaisa(totalPaisa)}</span>
            </div>

            <label className="note-field" style={{ display: 'block', marginTop: '1.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.4rem' }}>
                Special instructions or kitchen note (optional):
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Extra spicy, no onions, allergies, water on side…"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </label>

            {error && <p className="order-error" style={{ color: '#b91c1c', marginTop: '0.75rem' }}>{error}</p>}

            <div className="confirm-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1.75rem' }}>
              <button className="secondary-button" onClick={onBack} disabled={submitting}>
                ← Back to menu
              </button>
              <button className="primary-button" onClick={submit} disabled={submitting || cart.length === 0} style={{ padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}>
                {submitting ? 'Transmitting to kitchen…' : 'Send to Kitchen ➔'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function FoodPreparationMonitor({
  order,
  table,
  onOrderMore,
  onCallWaiter,
}: {
  order: Order
  table: string
  onOrderMore: () => void
  onCallWaiter: () => void
}) {
  const status = order.status

  const isStepDone = (stepStatus: OrderStatus) => {
    const sequence: OrderStatus[] = ['New', 'Preparing', 'Ready', 'Completed']
    const currentIndex = sequence.indexOf(status)
    const stepIndex = sequence.indexOf(stepStatus)
    return currentIndex >= stepIndex
  }

  // Calculate elapsed time
  const getElapsedMin = () => {
    if (order.isoTime) {
      const ms = Date.now() - new Date(order.isoTime).getTime()
      return Math.max(0, Math.floor(ms / 60000))
    }
    return 0
  }
  const [elapsed, setElapsed] = useState(getElapsedMin)

  useEffect(() => {
    const calc = () => {
      if (order.isoTime) {
        const ms = Date.now() - new Date(order.isoTime).getTime()
        return Math.max(0, Math.floor(ms / 60000))
      }
      return 0
    }
    setElapsed(calc())
    const t = setInterval(() => setElapsed(calc()), 10000)
    return () => clearInterval(t)
  }, [order.isoTime])

  // Estimated preparation time based on items (average ~12-15 mins)
  const estTotalMins = 15
  const remainingMins = Math.max(1, estTotalMins - elapsed)

  return (
    <div className="prep-monitor" style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--line)', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--line)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--rust)' }}>
              LIVE KITCHEN TRACKER
            </span>
            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
              ● Live Sync
            </span>
          </div>
          <h2 style={{ margin: '0.3rem 0 0', font: '600 1.5rem "Playfair Display", serif', color: 'var(--ink)' }}>
            Order {order.id} · Table {table}
          </h2>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Placed at {order.time}</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--green)', marginTop: '0.2rem' }}>
            {status === 'Ready'
              ? '🛎️ Freshly Plated & Ready!'
              : status === 'Preparing'
              ? `🍳 Est. ${remainingMins} min remaining`
              : '🕒 Queueing for chefs (~15 min)'}
          </div>
        </div>
      </div>

      {/* Progress Timeline */}
      <div style={{ margin: '1.5rem 0 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {/* Timeline background track line */}
          <div style={{ position: 'absolute', top: '16px', left: '10%', right: '10%', height: '4px', background: '#e2e8f0', zIndex: 0 }} />
          {/* Filled track line based on status */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '10%',
              width:
                status === 'New'
                  ? '0%'
                  : status === 'Preparing'
                  ? '40%'
                  : status === 'Ready'
                  ? '75%'
                  : '80%',
              height: '4px',
              background: 'var(--green)',
              transition: 'width 0.5s ease',
              zIndex: 0,
            }}
          />

          {[
            { key: 'New' as OrderStatus, label: 'Received', icon: '📝', desc: 'Queued in kitchen' },
            { key: 'Preparing' as OrderStatus, label: 'Cooking', icon: '🍳', desc: 'Chefs on stove' },
            { key: 'Ready' as OrderStatus, label: 'Ready', icon: '🛎️', desc: 'Plated & fresh' },
            { key: 'Completed' as OrderStatus, label: 'Served', icon: '🎉', desc: 'Enjoy your meal!' },
          ].map((step) => {
            const active = isStepDone(step.key)
            const isCurrent = status === step.key
            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isCurrent ? 'var(--rust)' : active ? 'var(--green)' : '#f1f5f9',
                    color: active ? 'white' : '#94a3b8',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    boxShadow: isCurrent ? '0 0 0 5px #fed7aa' : '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isCurrent ? step.icon : active ? '✓' : step.icon}
                </div>
                <strong style={{ fontSize: '0.85rem', marginTop: '0.45rem', color: isCurrent ? 'var(--rust)' : active ? 'var(--green)' : '#64748b' }}>
                  {step.label}
                </strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                  {step.desc}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Status banner box */}
      <div
        style={{
          padding: '0.9rem 1.2rem',
          borderRadius: '8px',
          background:
            status === 'Ready'
              ? '#ecfdf5'
              : status === 'Preparing'
              ? '#fffbeb'
              : status === 'Completed'
              ? '#f8fafc'
              : '#f0fdf4',
          border: `1px solid ${
            status === 'Ready'
              ? '#a7f3d0'
              : status === 'Preparing'
              ? '#fde68a'
              : status === 'Completed'
              ? '#e2e8f0'
              : '#bbf7d0'
          }`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          marginBottom: '1.25rem',
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>
          {status === 'Ready' ? '🛎️' : status === 'Preparing' ? '🍳' : status === 'Completed' ? '🍽️' : '⏱️'}
        </span>
        <div>
          <strong style={{ display: 'block', fontSize: '0.95rem', color: status === 'Ready' ? '#065f46' : status === 'Preparing' ? '#92400e' : 'var(--ink)' }}>
            {status === 'Ready'
              ? 'Your dishes are ready to serve!'
              : status === 'Preparing'
              ? 'Our kitchen is actively preparing your order'
              : status === 'Completed'
              ? 'Order completed and served'
              : 'Order confirmed and queued in kitchen display'}
          </strong>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            {status === 'Ready'
              ? `Plated fresh in the kitchen. Staff is delivering to Table ${table} right now.`
              : status === 'Preparing'
              ? `Our chefs are grilling, roasting, and plating your selected dishes.`
              : status === 'Completed'
              ? 'We hope you enjoy every bite! Call waiter below if you need anything else.'
              : 'Our head chef has acknowledged your ticket. Preparation begins momentarily.'}
          </span>
        </div>
      </div>

      {/* Ordered items summary */}
      <div style={{ background: '#fafaf9', padding: '1rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
          Dishes on this ticket
        </div>
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          {order.items.map((line) => (
            <div key={line.itemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>
                <b style={{ color: 'var(--green)', marginRight: '0.4rem' }}>{line.quantity}×</b>
                {line.name}
              </span>
              <span>{formatPaisa(line.pricePaisa * line.quantity)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px dashed var(--line)', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '0.95rem' }}>
          <span>Total:</span>
          <span style={{ color: 'var(--green)' }}>{formatPaisa(order.totalPaisa)}</span>
        </div>
        {order.note && (
          <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.6rem', background: '#fffbeb', borderRadius: '4px', border: '1px solid #fef08a', fontSize: '0.8rem', color: '#854d0e' }}>
            Note to kitchen: "{order.note}"
          </div>
        )}
      </div>

      {/* Action buttons for Customer */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="secondary-button"
          onClick={onCallWaiter}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <span>🛎️ Call Waiter / Service</span>
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onOrderMore}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <span>＋ Order More Food or Drinks</span>
        </button>
      </div>
    </div>
  )
}

export function QrScannerModal({
  currentTable,
  onSelectTable,
  onClose,
}: {
  currentTable: string
  onSelectTable: (table: string) => void
  onClose: () => void
}) {
  const [customTable, setCustomTable] = useState('')
  const [useCamera, setUseCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraError, setCameraError] = useState('')

  const tables = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

  useEffect(() => {
    if (!useCamera) return
    let stream: MediaStream | null = null
    navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      })
      .catch((err) => {
        setCameraError('Camera access not available or permission denied: ' + (err as Error).message)
      })

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [useCamera])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
        padding: '1rem',
      }}
    >
      <div
        className="panel"
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, font: '600 1.25rem "Playfair Display", serif', color: 'var(--ink)' }}>
              Scan Table QR / Select Table
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
              Currently connected to Table {currentTable}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', fontSize: '1.25rem', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* Camera simulation or quick picker */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              className={!useCamera ? 'primary-button' : 'secondary-button'}
              onClick={() => setUseCamera(false)}
              style={{ flex: 1, padding: '0.5rem' }}
            >
              1-Click Table Scanner
            </button>
            <button
              type="button"
              className={useCamera ? 'primary-button' : 'secondary-button'}
              onClick={() => setUseCamera(true)}
              style={{ flex: 1, padding: '0.5rem' }}
            >
              📷 Live Camera Scan
            </button>
          </div>

          {useCamera ? (
            <div style={{ textAlign: 'center', background: '#0f172a', borderRadius: '8px', padding: '1rem', color: 'white' }}>
              {cameraError ? (
                <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{cameraError}</p>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', maxHeight: '200px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0 0' }}>
                    Point phone camera at table placard QR code
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 0.5rem' }}>
                Tap any dining table below to simulate scanning its unique QR code:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {tables.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onSelectTable(t)
                      onClose()
                    }}
                    style={{
                      padding: '0.6rem 0.3rem',
                      borderRadius: '6px',
                      border: currentTable === t ? '2px solid var(--green)' : '1px solid var(--line)',
                      background: currentTable === t ? '#ecfdf5' : 'white',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: currentTable === t ? 'var(--green)' : 'var(--ink)',
                      cursor: 'pointer',
                    }}
                  >
                    Table {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom manual table entry */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
            Or type table number directly:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={customTable}
              onChange={(e) => setCustomTable(e.target.value)}
              placeholder="e.g. 08"
              style={{ flex: 1, padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.85rem' }}
            />
            <button
              type="button"
              className="primary-button"
              disabled={!customTable.trim()}
              onClick={() => {
                if (customTable.trim()) {
                  onSelectTable(customTable.trim().padStart(2, '0'))
                  onClose()
                }
              }}
            >
              Set Table
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CustomerView({
  table,
  items,
  restaurantName,
  tagline,
  onChangeTable,
}: {
  table: string
  items: MenuItem[]
  restaurantName: string
  tagline: string
  onChangeTable?: (newTable: string) => void
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState<CartLine[]>([])
  const [confirming, setConfirming] = useState(false)
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [showMonitor, setShowMonitor] = useState(false)
  const [showScannerModal, setShowScannerModal] = useState(false)
  const [toast, setToast] = useState('')
  const prevStatusesRef = useRef<Record<string, OrderStatus>>({})

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  // Poll for active orders belonging to this table
  useEffect(() => {
    let active = true
    const checkTableOrders = async () => {
      try {
        const all = await fetchOrders()
        if (!active) return
        const forThisTable = all.filter((o) => {
          const matchTable =
            o.tableNumber === table ||
            o.table.replace(/\D/g, '').padStart(2, '0') === table.padStart(2, '0') ||
            o.table.toLowerCase().includes(`table ${table.toLowerCase()}`)
          return matchTable
        })

        // Check if any order upgraded to Ready or Preparing to play sound
        forThisTable.forEach((o) => {
          const prev = prevStatusesRef.current[o.id]
          if (prev && prev !== o.status) {
            if (o.status === 'Ready') {
              playFoodReadyChime()
              setToast(`🛎️ Your order ${o.id} is READY to serve!`)
            } else if (o.status === 'Preparing') {
              setToast(`🍳 Kitchen started cooking order ${o.id}!`)
            }
          }
          prevStatusesRef.current[o.id] = o.status
        })

        setActiveOrders(forThisTable)
      } catch {}
    }

    checkTableOrders()
    const timer = setInterval(checkTableOrders, 2000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [table])

  const categories = ['All', ...Array.from(new Set(items.map((item) => item.category)))]
  const filteredItems = items.filter(
    (item) =>
      item.available &&
      (category === 'All' || item.category === category) &&
      (item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))),
  )

  const cartTotal = cart.reduce((sum, line) => sum + line.item.pricePaisa * line.quantity, 0)
  const totalItemCount = cart.reduce((sum, line) => sum + line.quantity, 0)

  const getItemQuantity = (id: number) => {
    const found = cart.find((l) => l.item.id === id)
    return found ? found.quantity : 0
  }

  const addToCart = (item: MenuItem) => {
    setCart((current) => {
      const found = current.find((line) => line.item.id === item.id)
      return found
        ? current.map((line) => (line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line))
        : [...current, { item, quantity: 1 }]
    })
    setToast(`${item.name} added to order`)
  }

  const updateQuantity = (itemId: number, delta: number) => {
    setCart((current) =>
      current
        .map((line) => (line.item.id === itemId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    )
  }

  const removeItem = (itemId: number) => {
    setCart((current) => current.filter((line) => line.item.id !== itemId))
  }

  const handleSubmit = async (note: string) => {
    const result = await placeOrder({
      tableToken: new URLSearchParams(window.location.search).get('t') ?? '',
      tableNumber: table,
      items: cart.map((line) => ({ itemId: line.item.id, quantity: line.quantity })),
      note: note || undefined,
    })
    if (result.ok === false) return { ok: false, error: result.error }
    if (result.order) {
      setActiveOrders((prev) => [result.order, ...prev.filter((o) => o.id !== result.order.id)])
      setCart([])
      setConfirming(false)
      setShowMonitor(true)
      setToast(`Order ${result.order.id} sent directly to kitchen display!`)
    }
    return { ok: true }
  }

  const [showWaiterModal, setShowWaiterModal] = useState(false)
  const [activeServiceReq, setActiveServiceReq] = useState<ServiceRequest | null>(null)

  // Poll for active service requests for this table
  useEffect(() => {
    let active = true
    const checkServiceReqs = async () => {
      try {
        const allReqs = await fetchServiceRequests()
        if (!active) return
        const forThisTable = allReqs.filter(
          (r) =>
            r.tableNumber === table ||
            r.tableNumber.padStart(2, '0') === table.padStart(2, '0')
        )
        // Find latest active request that is not finished
        const currentActive = forThisTable.find(
          (r) => r.status === 'Pending' || r.status === 'Accepted' || r.status === 'In Progress'
        )
        setActiveServiceReq(currentActive || null)
      } catch {}
    }

    checkServiceReqs()
    const timer = setInterval(checkServiceReqs, 2500)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [table])

  const handleOpenWaiterModal = () => {
    setShowWaiterModal(true)
  }

  const handleServiceSubmit = async (type: ServiceRequestType, message: string) => {
    const rawToken = new URLSearchParams(window.location.search).get('t') || undefined
    const res = await createServiceRequest({
      tableToken: rawToken,
      tableNumber: table,
      requestType: type,
      message,
    })
    if (res.ok) {
      setActiveServiceReq(res.request)
      setToast(`🛎️ Request for ${type} sent! Staff notified.`)
      return { ok: true }
    } else {
      return { ok: false, error: 'error' in res ? res.error : 'Failed to submit request' }
    }
  }

  const handleCancelServiceRequest = async (id: string) => {
    const res = await updateServiceRequestStatus(id, 'Cancelled')
    if (res.ok) {
      setActiveServiceReq(null)
      setShowWaiterModal(false)
      setToast('Service request cancelled.')
    }
  }

  const activeInKitchenOrder = activeOrders.find(
    (o) => o.status === 'New' || o.status === 'Preparing' || o.status === 'Ready'
  )

  if (confirming) {
    return (
      <ConfirmView
        table={table}
        cart={cart}
        totalPaisa={cartTotal}
        onBack={() => setConfirming(false)}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onSubmit={handleSubmit}
      />
    )
  }

  return (
    <div className="customer-page">
      {/* Top Banner with Table and Active Order Monitor */}
      <div
        style={{
          padding: '0.6rem 1.25rem',
          background: '#1c342b',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a7f3d0' }}>
            🍽️ Table {table}
          </span>
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            style={{
              background: '#2d4a3e',
              color: '#d1fae5',
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid #3d6354',
            }}
          >
            📷 Scan QR / Change Table
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Call Waiter button in header */}
          <button
            type="button"
            onClick={handleOpenWaiterModal}
            style={{
              background: activeServiceReq ? '#f59e0b' : '#3d6354',
              color: 'white',
              padding: '0.3rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: activeServiceReq ? '0 0 8px rgba(245, 158, 11, 0.4)' : 'none',
            }}
          >
            <span>🛎️</span>
            <span>
              {activeServiceReq
                ? `Waiter: ${activeServiceReq.status}`
                : 'Call Waiter / Service'}
            </span>
          </button>

          {activeInKitchenOrder && (
            <button
              type="button"
              onClick={() => setShowMonitor(!showMonitor)}
              style={{
                background: activeInKitchenOrder.status === 'Ready' ? '#10b981' : '#ea580c',
                color: 'white',
                border: 0,
                borderRadius: '20px',
                padding: '0.3rem 0.8rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>
                {activeInKitchenOrder.status === 'Ready'
                  ? '🛎️ Food Ready to Serve!'
                  : activeInKitchenOrder.status === 'Preparing'
                  ? '🍳 Food is Cooking'
                  : '📝 Kitchen Received Order'}
              </span>
              <span>{showMonitor ? 'Hide Tracker ▲' : 'Track Prep Progress →'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="customer-hero">
        <span className="customer-logo">m&amp;e</span>
        <span className="customer-table">
          Table {table}
        </span>
        <h1>{restaurantName}</h1>
        <p>{tagline}</p>
      </div>

      <div className="customer-content">
        {/* Live Food Preparation Monitor (if toggled or active) */}
        {showMonitor && activeInKitchenOrder && (
          <FoodPreparationMonitor
            order={activeInKitchenOrder}
            table={table}
            onOrderMore={() => setShowMonitor(false)}
            onCallWaiter={handleOpenWaiterModal}
          />
        )}

        {/* Active Waiter Request Card */}
        {activeServiceReq && activeServiceReq.status !== 'Completed' && activeServiceReq.status !== 'Cancelled' && (
          <div
            onClick={handleOpenWaiterModal}
            style={{
              background: activeServiceReq.status === 'Accepted' || activeServiceReq.status === 'In Progress' ? '#ecfdf5' : '#fffbeb',
              border: `1px solid ${activeServiceReq.status === 'Accepted' || activeServiceReq.status === 'In Progress' ? '#a7f3d0' : '#fde68a'}`,
              borderRadius: '10px',
              padding: '0.9rem 1.25rem',
              marginBottom: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>
                {activeServiceReq.status === 'In Progress' ? '✨' : activeServiceReq.status === 'Accepted' ? '👋' : '⏳'}
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b' }}>
                  Waiter Request ({activeServiceReq.requestType}): {activeServiceReq.status}
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                  {activeServiceReq.assignedWaiterName
                    ? `Assigned to ${activeServiceReq.assignedWaiterName}. Attending your table.`
                    : 'Queued for floor staff. Tap to view or cancel.'}
                </span>
              </div>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--green)' }}>
              View Details →
            </span>
          </div>
        )}

        {/* If an order is cooking but monitor is collapsed, show a clickable alert card */}
        {!showMonitor && activeInKitchenOrder && (
          <div
            onClick={() => setShowMonitor(true)}
            style={{
              background: activeInKitchenOrder.status === 'Ready' ? '#ecfdf5' : '#fffbeb',
              border: `1px solid ${activeInKitchenOrder.status === 'Ready' ? '#a7f3d0' : '#fde68a'}`,
              borderRadius: '8px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>
                {activeInKitchenOrder.status === 'Ready' ? '🛎️' : '🍳'}
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: activeInKitchenOrder.status === 'Ready' ? '#065f46' : '#92400e' }}>
                  Live Food Preparation: Order {activeInKitchenOrder.id} is {activeInKitchenOrder.status}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Tap here to monitor live cooking status, prep timer, and kitchen progress.
                </span>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--green)' }}>
              Open Monitor →
            </span>
          </div>
        )}

        <div className="customer-toolbar">
          <h2>Fresh artisanal plates, zero wait.</h2>
          <label>
            ⌕
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes, drinks, tags…"
            />
          </label>
        </div>

        <div className="category-scroll">
          {categories.map((entry) => (
            <button
              className={category === entry ? 'selected' : ''}
              onClick={() => setCategory(entry)}
              key={entry}
              type="button"
            >
              {entry}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <p className="empty-note">No items found matching "{search}".</p>
        )}

        <div className="customer-menu">
          {filteredItems.map((item) => {
            const qty = getItemQuantity(item.id)
            return (
              <article className="food-card" key={item.id}>
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80'
                    }}
                  />
                ) : null}
                <div>
                  <div className="food-card-heading">
                    <span>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                          ⏱ ~{item.prep} min
                        </span>
                        {item.tags.map((tag) => (
                          <span key={tag} className="tag" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </span>
                    <strong>{formatPaisa(item.pricePaisa)}</strong>
                  </div>

                  {qty > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff3ed', borderRadius: '4px', padding: '0.2rem 0.4rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{ width: '32px', height: '32px', background: 'transparent', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--green)', display: 'grid', placeItems: 'center' }}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--green)' }}>
                        {qty} in order
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{ width: '32px', height: '32px', background: 'transparent', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--green)', display: 'grid', placeItems: 'center' }}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => addToCart(item)} style={{ marginTop: '0.5rem' }}>
                      Add to order <span>＋</span>
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* Floating cart bar */}
      {cart.length > 0 && (
        <div className="cart-bar">
          <div>
            <b>{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}</b>
            <span> · {formatPaisa(cartTotal)}</span>
          </div>
          <button type="button" onClick={() => setConfirming(true)}>
            Review order →
          </button>
        </div>
      )}

      {/* QR Scanner / Table Modal */}
      {showScannerModal && (
        <QrScannerModal
          currentTable={table}
          onSelectTable={(newT) => {
            if (onChangeTable) onChangeTable(newT)
            setToast(`Connected to Table ${newT}`)
          }}
          onClose={() => setShowScannerModal(false)}
        />
      )}

      {/* Call Waiter & Assistance Modal */}
      {showWaiterModal && (
        <CallWaiterModal
          tableNumber={table}
          activeRequest={activeServiceReq}
          onClose={() => setShowWaiterModal(false)}
          onSubmit={handleServiceSubmit}
          onCancelRequest={handleCancelServiceRequest}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

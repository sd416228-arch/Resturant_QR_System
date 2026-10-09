import { useEffect, useState } from 'react'
import { formatPaisa } from '../lib/money'
import { fetchOrders, placeOrder } from '../lib/api'

export function ConfirmView({
  table,
  cart,
  totalPaisa,
  onBack,
  onUpdateQuantity,
  onRemoveItem,
  onSubmit,
}) {
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
      <div className="demo-return-bar" style={{ padding: '0.75rem 1.5rem', background: '#1c342b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ color: '#a7f3d0', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Staff Dashboard
        </a>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Live Table {table}</span>
      </div>
      <div className="customer-hero">
        <span className="customer-logo">m&amp;e</span>
        <span className="customer-table">Table {table}</span>
        <h1>Review your order</h1>
        <p>Confirm items and send directly to the kitchen</p>
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
                      {formatPaisa(line.item.pricePaisa)} each
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
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total (incl. taxes)</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--green)' }}>{formatPaisa(totalPaisa)}</span>
            </div>

            <label className="note-field" style={{ display: 'block', marginTop: '1.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.4rem' }}>
                Note for the kitchen (optional)
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Allergies, less spicy, dressing on side…"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </label>

            {error && <p className="order-error">{error}</p>}

            <div className="confirm-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1.75rem' }}>
              <button className="secondary-button" onClick={onBack} disabled={submitting}>
                ← Back to menu
              </button>
              <button className="primary-button" onClick={submit} disabled={submitting || cart.length === 0} style={{ padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}>
                {submitting ? 'Sending to kitchen…' : 'Confirm & Place Order →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function OrderConfirmation({
  initialOrder,
  table,
  onNewOrder,
}) {
  const [order, setOrder] = useState(initialOrder)

  // Live polling for order status updates from kitchen
  useEffect(() => {
    let active = true
    const checkStatus = async () => {
      try {
        const orders = await fetchOrders()
        if (!active) return
        const match = orders.find((o) => o.id === initialOrder.id)
        if (match) {
          setOrder(match)
        }
      } catch {
        // ignore network tick
      }
    }

    const timer = setInterval(checkStatus, 2500)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [initialOrder.id])

  const status = order.status

  const isStepDone = (stepStatus) => {
    const sequence = ['New', 'Preparing', 'Ready', 'Completed']
    const currentIndex = sequence.indexOf(status)
    const stepIndex = sequence.indexOf(stepStatus)
    return currentIndex >= stepIndex
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'New':
        return 'The kitchen has received your order and queued it for preparation.'
      case 'Preparing':
        return 'Our chefs are actively cooking and preparing your items.'
      case 'Ready':
        return 'Your dishes are freshly prepared! Staff will serve them to your table shortly.'
      case 'Completed':
        return 'Order served! Thank you for dining with us at Moss & Ember.'
      case 'Cancelled':
        return 'This order was cancelled. Please speak with a member of staff.'
      default:
        return 'Order is being processed.'
    }
  }

  return (
    <div className="customer-page">
      <div className="demo-return-bar" style={{ padding: '0.75rem 1.5rem', background: '#1c342b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ color: '#a7f3d0', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Staff Dashboard
        </a>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Live Table {table}</span>
      </div>
      <div className="customer-hero">
        <span className="customer-logo">m&amp;e</span>
        <span className="customer-table">Table {table}</span>
        <h1>Order {order.id}</h1>
        <p>{getStatusMessage()}</p>
      </div>

      <div className="customer-content">
        {status === 'Cancelled' ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
            <strong>Order Cancelled</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>If you have any questions or need to reorder, please notify your server.</p>
          </div>
        ) : (
          <div className="status-timeline" style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
              {[
                { key: 'New', label: 'Received' },
                { key: 'Preparing', label: 'Preparing' },
                { key: 'Ready', label: 'Ready' },
                { key: 'Completed', label: 'Served' },
              ].map((step) => {
                const done = isStepDone(step.key)
                const isCurrent = status === step.key
                return (
                  <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: done ? 'var(--green)' : '#e2e8f0',
                        color: done ? 'white' : '#64748b',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        boxShadow: isCurrent ? '0 0 0 4px #bbf7d0' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {done ? '✓' : '•'}
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        marginTop: '0.4rem',
                        fontWeight: isCurrent ? 700 : 500,
                        color: done ? 'var(--green)' : 'var(--muted)',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="panel" style={{ textAlign: 'left', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Order Receipt</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Placed {order.time}</span>
          </div>

          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {order.items.map((line) => (
              <div key={line.itemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.9rem' }}>
                <span>
                  <b>{line.quantity}×</b> {line.name}
                </span>
                <span>{formatPaisa(line.pricePaisa * line.quantity)}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              marginTop: '0.85rem',
              paddingTop: '0.85rem',
              borderTop: '2px dashed var(--line)',
              fontSize: '1.05rem',
            }}
          >
            <span>Total Paid / Billed:</span>
            <span style={{ color: 'var(--green)' }}>{formatPaisa(order.totalPaisa)}</span>
          </div>

          {order.note && (
            <div style={{ marginTop: '0.85rem', padding: '0.6rem 0.8rem', background: '#fefce8', borderRadius: '6px', border: '1px solid #fef08a', fontSize: '0.85rem', color: '#854d0e' }}>
              Kitchen note: <em>"{order.note}"</em>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button className="secondary-button" onClick={onNewOrder}>
            ＋ Order more items
          </button>
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
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(timer)
  }, [toast])

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

  const getItemQuantity = (id) => {
    const found = cart.find((l) => l.item.id === id)
    return found ? found.quantity : 0
  }

  const addToCart = (item) => {
    setCart((current) => {
      const found = current.find((line) => line.item.id === item.id)
      return found
        ? current.map((line) => (line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line))
        : [...current, { item, quantity: 1 }]
    })
    setToast(`${item.name} added to order`)
  }

  const updateQuantity = (itemId, delta) => {
    setCart((current) =>
      current
        .map((line) => (line.item.id === itemId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    )
  }

  const removeItem = (itemId) => {
    setCart((current) => current.filter((line) => line.item.id !== itemId))
  }

  const handleSubmit = async (note) => {
    const result = await placeOrder({
      tableToken: new URLSearchParams(window.location.search).get('t') ?? '',
      tableNumber: table,
      items: cart.map((line) => ({ itemId: line.item.id, quantity: line.quantity })),
      note: note || undefined,
    })
    if (!result.ok) return { ok: false, error: result.error }
    if (result.order) {
      setConfirmed(result.order)
      setCart([])
    }
    return { ok: true }
  }

  // Confirmation and status screens
  if (confirmed) {
    return (
      <OrderConfirmation
        initialOrder={confirmed}
        table={table}
        onNewOrder={() => setConfirmed(null)}
      />
    )
  }

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
      <div className="demo-return-bar" style={{ padding: '0.75rem 1.5rem', background: '#1c342b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ color: '#a7f3d0', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Staff Dashboard
        </a>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Live Table {table}</span>
      </div>
      <div className="customer-hero">
        <span className="customer-logo">m&amp;e</span>
        <span className="customer-table">
          Table {table}
          {onChangeTable && (
            <button
              type="button"
              onClick={onChangeTable}
              title="Change table"
              style={{
                background: 'none',
                border: 0,
                padding: 0,
                marginLeft: 6,
                font: 'inherit',
                fontSize: 10,
                color: 'inherit',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              change
            </button>
          )}
        </span>
        <h1>{restaurantName}</h1>
        <p>{tagline}</p>
      </div>
      <div className="customer-content">
        <div className="customer-toolbar">
          <h2>Fresh culinary crafts, zero wait.</h2>
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
                      e.target.src =
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
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

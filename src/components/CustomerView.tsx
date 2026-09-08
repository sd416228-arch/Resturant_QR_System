import { useEffect, useState } from 'react'
import type { CartLine, MenuItem, Order } from '../types'
import { formatPaisa } from '../lib/money'
import { placeOrder } from '../lib/api'

interface ConfirmViewProps {
  table: string
  cart: CartLine[]
  totalPaisa: number
  onBack: () => void
  onSubmit: (note: string) => Promise<{ ok: boolean; error?: string }>
}

export function ConfirmView({ table, cart, totalPaisa, onBack, onSubmit }: ConfirmViewProps) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
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
        <h1>Your order</h1>
      </div>
      <div className="customer-content">
        {cart.map((line) => (
          <div className="confirm-line" key={line.item.id}>
            <b>{line.quantity}×</b>
            <span>{line.item.name}</span>
            <span>{formatPaisa(line.item.pricePaisa * line.quantity)}</span>
          </div>
        ))}
        <div className="confirm-total">
          <b>Total</b>
          <b>{formatPaisa(totalPaisa)}</b>
        </div>
        <label className="note-field">
          Note for the kitchen (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. no onions" />
        </label>
        {error && <p className="order-error">{error}</p>}
        <div className="confirm-actions">
          <button className="secondary-button" onClick={onBack} disabled={submitting}>← Back</button>
          <button className="primary-button" onClick={submit} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send to kitchen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function OrderConfirmation({ order, table }: { order: Order; table: string }) {
  return (
    <div className="customer-page">
      <div className="customer-hero">
        <span className="customer-logo">m&amp;e</span>
        <span className="customer-table">Table {table}</span>
        <h1>Order sent ✓</h1>
        <p>Your order {order.id} is with the kitchen.</p>
      </div>
      <div className="customer-content">
        <div className="status-timeline">
          <div className="status-step active"><i />Received</div>
          <div className="status-step"><i />Preparing</div>
          <div className="status-step"><i />Ready</div>
        </div>
        <p className="empty-note">
          Status updates appear here. You can also ask your server.
        </p>
      </div>
    </div>
  )
}

export default function CustomerView({
  table,
  items,
  restaurantName,
  tagline,
}: {
  table: string
  items: MenuItem[]
  restaurantName: string
  tagline: string
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState<CartLine[]>([])
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState<Order | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const categories = ['All', ...Array.from(new Set(items.map((item) => item.category)))]
  const filteredItems = items.filter(
    (item) =>
      item.available &&
      (category === 'All' || item.category === category) &&
      item.name.toLowerCase().includes(search.toLowerCase()),
  )
  const cartTotal = cart.reduce((sum, line) => sum + line.item.pricePaisa * line.quantity, 0)

  const addToCart = (item: MenuItem) => {
    setCart((current) => {
      const found = current.find((line) => line.item.id === item.id)
      return found
        ? current.map((line) => (line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line))
        : [...current, { item, quantity: 1 }]
    })
    setToast(`${item.name} added to your order`)
  }

  const handleSubmit = async (note: string) => {
    const result = await placeOrder({
      tableToken: new URLSearchParams(window.location.search).get('t') ?? '',
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
  if (confirmed) return <OrderConfirmation order={confirmed} table={table} />
  if (confirming)
    return (
      <ConfirmView
        table={table}
        cart={cart}
        totalPaisa={cartTotal}
        onBack={() => setConfirming(false)}
        onSubmit={handleSubmit}
      />
    )

  return (
    <div className="customer-page">
      <div className="customer-hero">
        <span className="customer-logo">m&amp;e</span>
        <span className="customer-table">Table {table}</span>
        <h1>{restaurantName}</h1>
        <p>{tagline}</p>
      </div>
      <div className="customer-content">
        <div className="customer-toolbar">
          <h2>Good food, no waiting.</h2>
          <label>⌕
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the menu" />
          </label>
        </div>
        <div className="category-scroll">
          {categories.map((entry) => (
            <button
              className={category === entry ? 'selected' : ''}
              onClick={() => setCategory(entry)}
              key={entry}
            >
              {entry}
            </button>
          ))}
        </div>
        {items.length === 0 && <p className="empty-note">Menu is loading…</p>}
        <div className="customer-menu">
          {filteredItems.map((item) => (
            <article className="food-card" key={item.id}>
              {item.image && <img src={item.image} alt={item.name} />}
              <div>
                <div className="food-card-heading">
                  <span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                  </span>
                  <strong>{formatPaisa(item.pricePaisa)}</strong>
                </div>
                <button onClick={() => addToCart(item)}>Add to order <span>＋</span></button>
              </div>
            </article>
          ))}
        </div>
      </div>
      {cart.length > 0 && (
        <div className="cart-bar">
          <div>
            <b>{cart.reduce((sum, line) => sum + line.quantity, 0)} items</b>
            <span> · {formatPaisa(cartTotal)}</span>
          </div>
          <button onClick={() => setConfirming(true)}>Review order →</button>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
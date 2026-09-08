import type { MenuItem, Order, OrderStatus } from '../types'

const API_PORT = import.meta.env.VITE_API_PORT || 8787
const API_URL = `http://${window.location.hostname}:${API_PORT}`

function isMenuItem(value: unknown): value is MenuItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'number' &&
    typeof item.name === 'string' &&
    typeof item.pricePaisa === 'number' &&
    typeof item.category === 'string' &&
    typeof item.available === 'boolean'
  )
}

export async function fetchMenu(): Promise<MenuItem[]> {
  const response = await fetch(`${API_URL}/api/menu`)
  if (!response.ok) throw new Error('Could not load the menu')
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new Error('Menu has an unexpected format')
  return data.filter(isMenuItem)
}

export interface PlaceOrderResult {
  ok: boolean
  order?: Order
  error?: string
}

export interface PlaceOrderInput {
  tableToken: string
  items: { itemId: number; quantity: number }[]
  note?: string
}

// Server recomputes prices and validates every line. We never trust client totals.
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) {
      let message = 'The kitchen could not accept this order right now.'
      try {
        const body: unknown = await response.json()
        if (body && typeof body === 'object' && 'error' in body) {
          message = String((body as { error: unknown }).error)
        }
      } catch {
        // keep default message
      }
      return { ok: false, error: message }
    }
    const body: unknown = await response.json()
    const order = body && typeof body === 'object' ? (body as { order?: Order }).order : undefined
    return { ok: true, order }
  } catch {
    return { ok: false, error: 'Could not reach the kitchen. Please try again.' }
  }
}

export async function fetchOrders(): Promise<Order[]> {
  try {
    const response = await fetch(`${API_URL}/api/orders`)
    if (!response.ok) return []
    const data: unknown = await response.json()
    return Array.isArray(data) ? (data as Order[]) : []
  } catch {
    return []
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function updateMenu(items: MenuItem[]): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/menu`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    })
    return response.ok
  } catch {
    return false
  }
}

// --- QR table tokens ---------------------------------------------------------

// A QR encodes a single opaque token. Scanning it resolves the table securely
// (verified server-side, not a raw ?table=99 the customer can spoof).
export async function requestTableToken(table: string): Promise<{ token: string; restaurantId: string } | null> {
  try {
    const response = await fetch(`${API_URL}/api/tables/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table }),
    })
    if (!response.ok) return null
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const { token, restaurantId } = body as { token?: string; restaurantId?: string }
      if (typeof token === 'string' && typeof restaurantId === 'string') return { token, restaurantId }
    }
    return null
  } catch {
    return null
  }
}

// Resolve an opaque QR token back to a verified table. Returns null if invalid.
export async function verifyTableToken(token: string): Promise<string | null> {
  if (!token) return null
  try {
    const response = await fetch(`${API_URL}/api/tables/verify?token=${encodeURIComponent(token)}`)
    if (!response.ok) return null
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && typeof (body as { table?: unknown }).table === 'string') {
      return (body as { table: string }).table
    }
    return null
  } catch {
    return null
  }
}

export { API_URL }

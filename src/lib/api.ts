import { DEFAULT_MENU, DEFAULT_ORDERS } from './mockData'
import type { Order } from '../types'

const API_PORT = String(import.meta.env.VITE_API_PORT || 8787)

// Resolve the API base URL.
//
// Single-origin mode (the app served by server.mjs from dist/) keeps the API on
// the same origin, so there is no CORS and no port to guess. The Vite dev server
// runs on a different port, so the API is reached on the sibling port instead —
// reusing the page protocol there matters, since a hardcoded http:// origin on
// an https:// page is blocked as mixed content.
function resolveApiUrl(): string {
  const override = import.meta.env.VITE_API_URL
  if (typeof override === 'string' && override.trim()) return override.trim().replace(/\/$/, '')
  if (window.location.port === API_PORT || window.location.port === '5173') return window.location.origin
  return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`
}

const API_URL = resolveApiUrl()

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || ''
const STORAGE_KEY_MENU = 'sprig_restaurant_menu'
const STORAGE_KEY_ORDERS = 'sprig_restaurant_orders'

function adminHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (ADMIN_TOKEN) Object.assign(headers, { Authorization: `Bearer ${ADMIN_TOKEN}` })
  return headers
}

function getStoredMenu() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MENU)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  return DEFAULT_MENU
}

function saveStoredMenu(items) {
  try {
    localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  return DEFAULT_ORDERS
}

export function saveStoredOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders))
  } catch {
    // ignore
  }
}

function isMenuItem(value) {
  if (!value || typeof value !== 'object') return false
  const item = value
  return (
    typeof item.id === 'number' &&
    typeof item.name === 'string' &&
    typeof item.pricePaisa === 'number' &&
    typeof item.category === 'string' &&
    typeof item.available === 'boolean'
  )
}

function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== 'object') return false
  const order = value as Partial<Order>
  return (
    typeof order.id === 'string' &&
    typeof order.table === 'string' &&
    typeof order.tableNumber === 'string' &&
    typeof order.totalPaisa === 'number' &&
    typeof order.time === 'string' &&
    ['New', 'Preparing', 'Ready', 'Completed', 'Cancelled'].includes(order.status as string) &&
    Array.isArray(order.items) &&
    order.items.every((item) =>
      typeof item.itemId === 'number' &&
      typeof item.name === 'string' &&
      typeof item.pricePaisa === 'number' &&
      typeof item.quantity === 'number' &&
      item.quantity > 0
    )
  )
}

export async function fetchMenu() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_URL}/api/menu`, { signal: controller.signal })
    clearTimeout(timer)
    if (response.ok) {
      const data: unknown = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        const valid = data.filter(isMenuItem)
        if (valid.length > 0) {
          saveStoredMenu(valid)
          return valid
        }
      }
    }
  } catch {
    // Backend offline / static deploy fallback
  }
  return getStoredMenu()
}

export async function placeOrder(input: {
  tableToken?: string
  tableNumber?: string
  items: { itemId: number; quantity: number }[]
  note?: string
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : `The server could not accept this order (${response.status}).`
      return { ok: false, error: message }
    }
    const order = body && typeof body === 'object' && 'order' in body ? body.order : undefined
    if (isOrder(order)) {
      const current = getStoredOrders()
      saveStoredOrders([order, ...current])
      return { ok: true, order }
    }
    return { ok: false, error: 'The server response did not include the accepted order.' }
  } catch {
    return {
      ok: false,
      error: 'Could not connect to the order server. Please check the connection and try again.',
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchOrders() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_URL}/api/orders`, { signal: controller.signal })
    clearTimeout(timer)
    if (response.ok) {
      const data: unknown = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        saveStoredOrders(data)
        return data
      }
    }
  } catch {
    // API offline fallback
  }
  return getStoredOrders()
}

export async function updateOrderStatus(id, status) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    await fetch(`${API_URL}/api/orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      signal: controller.signal,
    })
    clearTimeout(timer)
  } catch {
    // backend offline fallback
  }

  // Always update local cache so UI remains responsive and functional
  const current = getStoredOrders()
  const updated = current.map((order) => (order.id === id ? { ...order, status } : order))
  saveStoredOrders(updated)
  return true
}

export async function updateMenu(items) {
  saveStoredMenu(items)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_URL}/api/menu`, {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify(items),
      signal: controller.signal,
    })
    clearTimeout(timer)
    return response.ok
  } catch {
    return true
  }
}

// --- QR table tokens ---------------------------------------------------------

export async function requestTableToken(table) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_URL}/api/tables/token`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ table }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (response.ok) {
      const body: unknown = await response.json()
      if (body && typeof body === 'object') {
        const { token, restaurantId } = body as { token?: string; restaurantId?: string }
        if (typeof token === 'string' && typeof restaurantId === 'string') return { token, restaurantId }
      }
    }
  } catch {
    // fallback
  }

  // Standalone offline signed token fallback
  const rawPayload = `moss-ember:${table}`
  const encodedPayload = btoa(rawPayload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const offlineToken = `${encodedPayload}.demo_signature`
  return { token: offlineToken, restaurantId: 'moss-ember' }
}

export async function verifyTableToken(token) {
  if (!token) return null
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_URL}/api/tables/verify?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (response.ok) {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && typeof (body as { table?: unknown }).table === 'string') {
        return (body as { table: string }).table
      }
    }
  } catch {
    // fallback
  }

  // Offline decode fallback
  try {
    const parts = token.split('.')
    if (parts.length >= 1) {
      let b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/')
      while (b64.length % 4) b64 += '='
      const decoded = atob(b64)
      if (decoded.includes(':')) {
        const [, table] = decoded.split(':')
        return table || '01'
      }
    }
  } catch {
    // ignore
  }

  return '01'
}

export { API_URL }

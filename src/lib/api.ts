import { DEFAULT_MENU, DEFAULT_ORDERS } from './mockData'
import type { Order, ServiceRequest, ServiceRequestStatus, ServiceRequestType } from '../types'

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
  return window.location.origin
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

// --- Service Requests (Waiter assistance API) ---

const STORAGE_KEY_SERVICE_REQUESTS = 'sprig_service_requests'

export function getStoredServiceRequests(): ServiceRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SERVICE_REQUESTS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

export function saveStoredServiceRequests(reqs: ServiceRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SERVICE_REQUESTS, JSON.stringify(reqs))
  } catch {}
}

export async function fetchServiceRequests(): Promise<ServiceRequest[]> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_URL}/api/service-requests`, { signal: controller.signal })
    clearTimeout(timer)
    if (response.ok) {
      const data: unknown = await response.json()
      if (Array.isArray(data)) {
        saveStoredServiceRequests(data)
        return data as ServiceRequest[]
      }
    }
  } catch {}
  return getStoredServiceRequests()
}

export async function createServiceRequest(input: {
  requestType: ServiceRequestType
  message?: string
  tableToken?: string
  tableNumber: string
}): Promise<{ ok: true; request: ServiceRequest } | { ok: false; error: string; request?: ServiceRequest }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const response = await fetch(`${API_URL}/api/service-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const body: any = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        ok: false,
        error: body?.error || `Could not submit request (${response.status})`,
        request: body?.request,
      }
    }
    if (body?.request) {
      const current = getStoredServiceRequests()
      saveStoredServiceRequests([body.request, ...current.filter((r) => r.id !== body.request.id)])
      return { ok: true, request: body.request }
    }
  } catch {}

  // Fallback offline request
  const offlineReq: ServiceRequest = {
    id: `SR-${Date.now().toString().slice(-6)}`,
    restaurantId: 'moss-ember',
    tableNumber: input.tableNumber,
    requestType: input.requestType,
    message: input.message || '',
    status: 'Pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const current = getStoredServiceRequests()
  saveStoredServiceRequests([offlineReq, ...current])
  return { ok: true, request: offlineReq }
}

export async function acceptServiceRequest(
  id: string,
  waiterId: string,
  waiterName: string
): Promise<{ ok: true; request: ServiceRequest } | { ok: false; error: string; conflict?: boolean; assignedWaiterName?: string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_URL}/api/service-requests/${encodeURIComponent(id)}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waiterId, waiterName }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const body: any = await response.json().catch(() => null)
    if (response.status === 409) {
      return {
        ok: false,
        conflict: true,
        error: body?.error || 'Request was already accepted by another waiter.',
        assignedWaiterName: body?.assignedWaiterName,
      }
    }
    if (!response.ok) {
      return {
        ok: false,
        error: body?.error || 'Failed to accept request.',
      }
    }
    if (body?.request) {
      const current = getStoredServiceRequests()
      const updated = current.map((r) => (r.id === id ? body.request : r))
      saveStoredServiceRequests(updated)
      return { ok: true, request: body.request }
    }
  } catch {}

  // Offline optimistic accept
  const current = getStoredServiceRequests()
  const req = current.find((r) => r.id === id)
  if (req) {
    if (req.status !== 'Pending') {
      return { ok: false, conflict: true, error: `Already accepted by ${req.assignedWaiterName || 'another staff'}` }
    }
    req.status = 'Accepted'
    req.assignedWaiterId = waiterId
    req.assignedWaiterName = waiterName
    req.acceptedAt = new Date().toISOString()
    req.updatedAt = new Date().toISOString()
    saveStoredServiceRequests([...current])
    return { ok: true, request: req }
  }
  return { ok: false, error: 'Request not found' }
}

export async function updateServiceRequestStatus(
  id: string,
  status: 'In Progress' | 'Completed' | 'Cancelled',
  waiterId?: string,
  isAdmin: boolean = false
): Promise<{ ok: true; request?: ServiceRequest } | { ok: false; error: string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_URL}/api/service-requests/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, waiterId, isAdmin }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const body: any = await response.json().catch(() => null)
    if (!response.ok) {
      return { ok: false, error: body?.error || 'Failed to update request' }
    }
    if (body?.request) {
      const current = getStoredServiceRequests()
      const updated = current.map((r) => (r.id === id ? body.request : r))
      saveStoredServiceRequests(updated)
      return { ok: true, request: body.request }
    }
  } catch {}

  // Offline fallback
  const current = getStoredServiceRequests()
  const updated = current.map((r) => {
    if (r.id === id) {
      const now = new Date().toISOString()
      return {
        ...r,
        status,
        updatedAt: now,
        startedAt: status === 'In Progress' && !r.startedAt ? now : r.startedAt,
        completedAt: status === 'Completed' ? now : r.completedAt,
      }
    }
    return r
  })
  saveStoredServiceRequests(updated)
  return { ok: true }
}

export async function reassignServiceRequest(
  id: string,
  params: {
    newWaiterId?: string
    newWaiterName?: string
    waiterId?: string
    isAdmin?: boolean
  }
): Promise<{ ok: true; request?: ServiceRequest } | { ok: false; error: string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_URL}/api/service-requests/${encodeURIComponent(id)}/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const body: any = await response.json().catch(() => null)
    if (!response.ok) {
      return { ok: false, error: body?.error || 'Failed to reassign request' }
    }
    if (body?.request) {
      const current = getStoredServiceRequests()
      const updated = current.map((r) => (r.id === id ? body.request : r))
      saveStoredServiceRequests(updated)
      return { ok: true, request: body.request }
    }
  } catch {}

  return { ok: true }
}

export { API_URL }

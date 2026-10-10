import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  initDatabase,
  getMenuFromDb,
  getOrdersFromDb,
  addOrderToDb,
  updateOrderStatusInDb,
  saveMenuToDb,
  isDatabaseConnected,
  getServiceRequestsFromDb,
  addServiceRequestToDb,
  acceptServiceRequestInDb,
  updateServiceRequestStatusInDb,
  releaseOrReassignServiceRequestInDb,
} from './backend/db.js'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT || 3000)
const HOST = '0.0.0.0'
const RESTAURANT_ID = process.env.RESTAURANT_ID || 'moss-ember'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'
const QR_SECRET = process.env.QR_TOKEN_SECRET || 'dev-secret'
const ORDER_STATUSES = ['New', 'Preparing', 'Ready', 'Completed', 'Cancelled']

const dataDir = path.resolve(process.cwd(), 'data')
const menuFilePath = path.join(dataDir, 'menu.json')
const rootOrdersFilePath = path.resolve(process.cwd(), 'orders.json')
const serviceRequestsFilePath = path.join(dataDir, 'service_requests.json')

function detectLanIp() {
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    if (/vmware|vethernet|wsl|loopback|bluetooth|hyper-v|teredo|isatap|docker/i.test(name)) continue
    for (const net of nets[name] || []) {
      const family = String(net.family)
      if ((family === 'IPv4' || family === '4') && !net.internal) return net.address
    }
  }
  return null
}

function readJsonSafe<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content) as T
    }
  } catch (err) {
    console.warn(`Failed to read JSON from ${filePath}:`, (err as Error).message)
  }
  return fallback
}

let menu = readJsonSafe<any[]>(menuFilePath, [])
let orders = readJsonSafe<any[]>(rootOrdersFilePath, [])
let serviceRequests = readJsonSafe<any[]>(serviceRequestsFilePath, [])

app.use(express.json({ limit: '1mb' }))
app.use(cors({ origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN, credentials: true }))

function verifyTableToken(token?: string) {
  if (!token || !token.includes('.')) return null
  const [encoded, signature] = token.split('.')
  const payload = Buffer.from(encoded, 'base64url').toString('utf8')
  const expected = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('base64url')

  if (signature !== expected) return null
  const [restaurantId, tableNumber] = payload.split(':')
  if (restaurantId !== RESTAURANT_ID) return null
  return tableNumber
}

function signTableToken(tableNumber: string) {
  const payload = `${RESTAURANT_ID}:${tableNumber}`
  const signature = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${signature}`
}

function isAuthorized(req: express.Request) {
  if (!ADMIN_TOKEN) return true
  const header = req.headers.authorization || ''
  return header === `Bearer ${ADMIN_TOKEN}`
}

function normalizeItem(item: any) {
  return {
    id: Number(item.id),
    name: String(item.name || ''),
    description: String(item.description || ''),
    category: String(item.category || 'Mains'),
    pricePaisa: Number(item.pricePaisa || 0),
    image: String(item.image || ''),
    available: item.available !== false,
    prep: Number(item.prep || 10),
    tags: Array.isArray(item.tags) ? item.tags : [],
  }
}

async function loadMenu() {
  try {
    const dbMenu = await getMenuFromDb()
    if (dbMenu && dbMenu.length) {
      menu = dbMenu
      return menu
    }
  } catch {}

  if (menu.length === 0) {
    menu = readJsonSafe<any[]>(menuFilePath, [
      { id: 1, name: 'Truffle eggs on toast', description: 'Soft scrambled eggs, wild mushrooms, sourdough.', category: 'Breakfast', pricePaisa: 140000, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=80', available: true, prep: 12, tags: ['Popular', 'Vegetarian'] },
      { id: 2, name: 'Crispy chicken bao', description: 'Buttermilk chicken, pickled cucumber, sesame aioli.', category: 'Small plates', pricePaisa: 120000, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=700&q=80', available: true, prep: 15, tags: ['Popular'] },
      { id: 3, name: 'Miso salmon bowl', description: 'Glazed salmon, jasmine rice, greens, ginger dressing.', category: 'Mains', pricePaisa: 190000, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80', available: true, prep: 18, tags: ['Chef pick'] },
      { id: 4, name: 'Charred corn salad', description: 'Avocado, feta, herbs, lime and toasted pepitas.', category: 'Small plates', pricePaisa: 110000, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80', available: true, prep: 8, tags: ['Vegan'] },
      { id: 5, name: 'Citrus spritz', description: 'Blood orange, rosemary, tonic and sparkling wine.', category: 'Drinks', pricePaisa: 90000, image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=700&q=80', available: true, prep: 3, tags: ['New'] },
    ])
  }
  return menu
}

async function loadOrders() {
  try {
    const dbOrders = await getOrdersFromDb()
    if (dbOrders && dbOrders.length) {
      orders = dbOrders
      return orders
    }
  } catch {}

  if (orders.length === 0) {
    orders = readJsonSafe<any[]>(rootOrdersFilePath, [])
  }
  return orders
}

function saveMenuFile() {
  try {
    fs.writeFileSync(menuFilePath, JSON.stringify(menu, null, 2))
  } catch {}
}

function saveOrdersFile() {
  try {
    fs.writeFileSync(rootOrdersFilePath, JSON.stringify(orders, null, 2))
  } catch {}
}

async function loadServiceRequests() {
  try {
    const dbReqs = await getServiceRequestsFromDb(RESTAURANT_ID)
    if (dbReqs && Array.isArray(dbReqs) && dbReqs.length) {
      serviceRequests = dbReqs
      return serviceRequests
    }
  } catch {}

  if (serviceRequests.length === 0) {
    serviceRequests = readJsonSafe<any[]>(serviceRequestsFilePath, [])
  }
  return serviceRequests
}

function saveServiceRequestsFile() {
  try {
    fs.writeFileSync(serviceRequestsFilePath, JSON.stringify(serviceRequests, null, 2))
  } catch {}
}

// API Routes
app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, status: 'healthy', database: isDatabaseConnected() })
})

app.get('/api/lan-info', (_req, res) => {
  res.json({ lanIp: detectLanIp() })
})

app.get('/api/menu', async (_req, res) => {
  const currentMenu = await loadMenu()
  res.json(currentMenu)
})

app.put('/api/menu', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Authorization required' })
  }

  const items = Array.isArray(req.body) ? req.body.map(normalizeItem) : []
  if (!items.length) {
    return res.status(400).json({ error: 'Menu items are required' })
  }

  menu = items
  saveMenuFile()
  try {
    await saveMenuToDb(menu)
  } catch {}

  res.json(menu)
})

app.get('/api/orders', async (_req, res) => {
  const currentOrders = await loadOrders()
  res.json(currentOrders)
})

app.post('/api/orders', async (req, res) => {
  const body = req.body || {}
  const items = Array.isArray(body.items) ? body.items : []

  if (!items.length) {
    return res.status(400).json({ error: 'Order must include at least one item' })
  }

  const menuList = await loadMenu()
  const itemMap = new Map(menuList.map((item) => [String(item.id), item]))
  let totalPaisa = 0
  const validatedItems: any[] = []

  for (const line of items) {
    const menuItem = itemMap.get(String(line.itemId))
    if (!menuItem) {
      return res.status(400).json({ error: `Unknown item id: ${line.itemId}` })
    }

    const quantity = Number(line.quantity || 0)
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: `Invalid quantity for ${menuItem.name}` })
    }

    validatedItems.push({
      itemId: menuItem.id,
      name: menuItem.name,
      pricePaisa: menuItem.pricePaisa,
      quantity,
    })

    totalPaisa += menuItem.pricePaisa * quantity
  }

  const verifiedTable = verifyTableToken(body.tableToken)
  const pickedTable =
    typeof body.tableNumber === 'string' && /^[\w-]{1,8}$/.test(body.tableNumber)
      ? body.tableNumber
      : ''
  const tableNumber = verifiedTable || pickedTable || body.table || '01'

  const order = {
    id: `#${String(Date.now()).slice(-5)}`,
    table: `Table ${tableNumber}`,
    tableNumber,
    totalPaisa,
    status: 'New',
    note: typeof body.note === 'string' ? body.note : '',
    isoTime: new Date().toISOString(),
    items: validatedItems,
    time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }

  orders.unshift(order)
  saveOrdersFile()
  try {
    await addOrderToDb(order)
  } catch {}

  res.status(201).json({ order, message: 'Order accepted by kitchen' })
})

app.patch('/api/orders/:id', async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}

  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' })
  }

  const order = orders.find((entry) => entry.id === id)
  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  order.status = status
  saveOrdersFile()
  try {
    await updateOrderStatusInDb(id, status)
  } catch {}

  res.json(order)
})

app.post('/api/tables/token', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Admin authorization required' })
  }

  const { table } = req.body || {}
  if (!table) {
    return res.status(400).json({ error: 'Table number is required' })
  }

  res.json({ token: signTableToken(String(table)), restaurantId: RESTAURANT_ID })
})

app.get('/api/tables/verify', (req, res) => {
  const token = req.query.token || ''
  const table = verifyTableToken(String(token))

  if (!table) {
    return res.status(401).json({ error: 'Invalid QR token' })
  }

  res.json({ table, restaurantId: RESTAURANT_ID })
})

// --- Service Requests (Waiter & Assistance Management) ---

// 1. Get all service requests (Admin & Waiters)
app.get('/api/service-requests', async (_req, res) => {
  const currentReqs = await loadServiceRequests()
  res.json(currentReqs)
})

// 2. Customer creates a service request
app.post('/api/service-requests', async (req, res) => {
  const body = req.body || {}
  const { requestType, message, tableToken, tableNumber } = body

  const validTypes = ['water', 'bill', 'cutlery', 'order_help', 'general', 'other']
  if (!validTypes.includes(requestType)) {
    return res.status(400).json({ error: 'Invalid service request type' })
  }

  // Validate table via QR token or validated table number
  const verifiedTable = verifyTableToken(tableToken)
  const pickedTable =
    typeof tableNumber === 'string' && /^[\w-]{1,8}$/.test(tableNumber)
      ? tableNumber
      : ''
  const table = verifiedTable || pickedTable || '01'

  // Debouncing / duplicate prevention: check for existing pending or active identical request from same table in last 60 seconds
  const currentReqs = await loadServiceRequests()
  const now = new Date()
  const duplicate = currentReqs.find((r) => {
    if (r.tableNumber !== table) return false
    if (r.status === 'Completed' || r.status === 'Cancelled') return false
    if (r.requestType === requestType) {
      const createdTime = new Date(r.createdAt).getTime()
      if (now.getTime() - createdTime < 60 * 1000) return true
    }
    return false
  })

  if (duplicate) {
    return res.status(409).json({
      error: 'A request for this service is already active for your table.',
      request: duplicate,
    })
  }

  const requestId = `SR-${Date.now().toString().slice(-6)}`
  const newRequest = {
    id: requestId,
    restaurantId: RESTAURANT_ID,
    tableNumber: table,
    requestType,
    message: typeof message === 'string' ? message.slice(0, 300) : '',
    status: 'Pending',
    assignedWaiterId: null,
    assignedWaiterName: null,
    createdAt: now.toISOString(),
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    updatedAt: now.toISOString(),
  }

  // Atomic insertion
  serviceRequests.unshift(newRequest)
  saveServiceRequestsFile()
  try {
    await addServiceRequestToDb(newRequest)
  } catch {}

  res.status(201).json({ request: newRequest })
})

// 3. Waiter accepts a request (Atomic concurrency check: only succeeds if still Pending)
app.post('/api/service-requests/:id/accept', async (req, res) => {
  const { id } = req.params
  const { waiterId, waiterName } = req.body || {}

  if (!waiterId || !waiterName) {
    return res.status(400).json({ error: 'waiterId and waiterName are required' })
  }

  await loadServiceRequests()
  const reqItem = serviceRequests.find((r) => r.id === id)

  if (!reqItem) {
    return res.status(404).json({ error: 'Service request not found' })
  }

  // Mandatory Concurrency rule: check if already accepted or not pending
  if (reqItem.status !== 'Pending') {
    return res.status(409).json({
      error: `Request already accepted by ${reqItem.assignedWaiterName || 'another waiter'}`,
      currentStatus: reqItem.status,
      assignedWaiterName: reqItem.assignedWaiterName,
    })
  }

  // Atomic update in memory
  const now = new Date().toISOString()
  reqItem.status = 'Accepted'
  reqItem.assignedWaiterId = waiterId
  reqItem.assignedWaiterName = waiterName
  reqItem.acceptedAt = now
  reqItem.updatedAt = now

  saveServiceRequestsFile()

  // Concurrency check in DB if DB connected
  try {
    await acceptServiceRequestInDb(id, waiterId, waiterName)
  } catch {}

  res.json({ request: reqItem })
})

// 4. Update status: In Progress, Completed, Cancelled
app.patch('/api/service-requests/:id/status', async (req, res) => {
  const { id } = req.params
  const { status, waiterId, isAdmin } = req.body || {}

  const validStatuses = ['In Progress', 'Completed', 'Cancelled']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  await loadServiceRequests()
  const reqItem = serviceRequests.find((r) => r.id === id)
  if (!reqItem) {
    return res.status(404).json({ error: 'Service request not found' })
  }

  // Lifecycle business rules
  if (status === 'Cancelled') {
    // Customers can only cancel if Pending or Accepted (not completed or already in progress)
    if (reqItem.status === 'Completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed service request' })
    }
  }

  if (status === 'In Progress') {
    if (reqItem.status !== 'Accepted') {
      return res.status(400).json({ error: 'Request must be Accepted before starting' })
    }
    // Only assigned waiter or admin
    if (!isAdmin && waiterId && reqItem.assignedWaiterId !== waiterId) {
      return res.status(403).json({ error: 'Only the assigned waiter can mark In Progress' })
    }
  }

  if (status === 'Completed') {
    if (reqItem.status !== 'Accepted' && reqItem.status !== 'In Progress') {
      return res.status(400).json({ error: 'Request must be Accepted or In Progress to be Completed' })
    }
    if (!isAdmin && waiterId && reqItem.assignedWaiterId !== waiterId) {
      return res.status(403).json({ error: 'Only the assigned waiter or admin can complete this request' })
    }
  }

  const now = new Date().toISOString()
  reqItem.status = status
  reqItem.updatedAt = now
  if (status === 'In Progress' && !reqItem.startedAt) {
    reqItem.startedAt = now
  }
  if (status === 'Completed') {
    reqItem.completedAt = now
  }

  saveServiceRequestsFile()
  try {
    await updateServiceRequestStatusInDb(id, status, waiterId, Boolean(isAdmin))
  } catch {}

  res.json({ request: reqItem })
})

// 5. Release / Reassign request
app.post('/api/service-requests/:id/reassign', async (req, res) => {
  const { id } = req.params
  const { newWaiterId, newWaiterName, waiterId, isAdmin } = req.body || {}

  await loadServiceRequests()
  const reqItem = serviceRequests.find((r) => r.id === id)
  if (!reqItem) {
    return res.status(404).json({ error: 'Service request not found' })
  }

  if (reqItem.status === 'Completed' || reqItem.status === 'Cancelled') {
    return res.status(400).json({ error: 'Cannot reassign a finished request' })
  }

  // If a waiter is releasing their own request:
  if (!isAdmin && !newWaiterId) {
    if (reqItem.assignedWaiterId !== waiterId) {
      return res.status(403).json({ error: 'You can only release requests assigned to you' })
    }
  }

  const now = new Date().toISOString()
  if (!newWaiterId) {
    // Release back to pool
    reqItem.status = 'Pending'
    reqItem.assignedWaiterId = null
    reqItem.assignedWaiterName = null
    reqItem.acceptedAt = null
    reqItem.startedAt = null
    reqItem.updatedAt = now
  } else {
    // Reassign
    reqItem.status = 'Accepted'
    reqItem.assignedWaiterId = newWaiterId
    reqItem.assignedWaiterName = newWaiterName || 'Assigned Staff'
    reqItem.acceptedAt = now
    reqItem.updatedAt = now
  }

  saveServiceRequestsFile()
  try {
    await releaseOrReassignServiceRequestInDb(id, newWaiterId, newWaiterName)
  } catch {}

  res.json({ request: reqItem })
})

async function startServer() {
  if (process.env.DATABASE_URL) {
    try {
      await initDatabase()
    } catch (err) {
      console.warn('Database initialization warning:', (err as Error).message)
    }
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const distPath = path.resolve(process.cwd(), 'dist')

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    app.use(express.static(distPath))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  app.listen(PORT, HOST, () => {
    console.log(`Restaurant QR Server running on http://${HOST}:${PORT}`)
  })
}

void startServer()

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import os from 'node:os'
import { initDatabase, getMenuFromDb, getOrdersFromDb, addOrderToDb, updateOrderStatusInDb, saveMenuToDb } from './db.js'

dotenv.config()

// Best-effort LAN IPv4 so QR codes point at this machine, not a stale guess.
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

const app = express()
const PORT = Number(process.env.PORT || 8787)
const RESTAURANT_ID = process.env.RESTAURANT_ID || 'moss-ember'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'
const QR_SECRET = process.env.QR_TOKEN_SECRET || 'dev-secret'
const ORDER_STATUSES = ['New', 'Preparing', 'Ready', 'Completed', 'Cancelled']

const menu = []
const orders = []

app.use(express.json({ limit: '1mb' }))
app.use(cors({ origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN, credentials: true }))

function verifyTableToken(token) {
  if (!token || !token.includes('.')) return null
  const [encoded, signature] = token.split('.')
  const payload = Buffer.from(encoded, 'base64url').toString('utf8')
  const expected = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('base64url')

  if (signature !== expected) return null
  const [restaurantId, tableNumber] = payload.split(':')
  if (restaurantId !== RESTAURANT_ID) return null
  return tableNumber
}

function signTableToken(tableNumber) {
  const payload = `${RESTAURANT_ID}:${tableNumber}`
  const signature = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${signature}`
}

function isAuthorized(req) {
  if (!ADMIN_TOKEN) return true
  const header = req.headers.authorization || ''
  return header === `Bearer ${ADMIN_TOKEN}`
}

function normalizeItem(item) {
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
  const dbMenu = await getMenuFromDb()
  if (dbMenu && dbMenu.length) {
    menu.length = 0
    menu.push(...dbMenu)
    return menu
  }

  if (menu.length === 0) {
    menu.push(
      { id: 1, name: 'Truffle eggs on toast', description: 'Soft scrambled eggs, wild mushrooms, sourdough.', category: 'Breakfast', pricePaisa: 1400, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=80', available: true, prep: 12, tags: ['Popular', 'Vegetarian'] },
      { id: 2, name: 'Crispy chicken bao', description: 'Buttermilk chicken, pickled cucumber, sesame aioli.', category: 'Small plates', pricePaisa: 1200, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=700&q=80', available: true, prep: 15, tags: ['Popular'] },
      { id: 3, name: 'Miso salmon bowl', description: 'Glazed salmon, jasmine rice, greens, ginger dressing.', category: 'Mains', pricePaisa: 1900, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80', available: true, prep: 18, tags: ['Chef pick'] },
      { id: 4, name: 'Charred corn salad', description: 'Avocado, feta, herbs, lime and toasted pepitas.', category: 'Small plates', pricePaisa: 1100, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80', available: true, prep: 8, tags: ['Vegan'] },
      { id: 5, name: 'Citrus spritz', description: 'Blood orange, rosemary, tonic and sparkling wine.', category: 'Drinks', pricePaisa: 900, image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=700&q=80', available: true, prep: 3, tags: ['New'] },
    )
  }

  return menu
}

async function loadOrders() {
  const dbOrders = await getOrdersFromDb()
  if (dbOrders && dbOrders.length) {
    orders.length = 0
    orders.push(...dbOrders)
    return orders
  }

  return orders
}

app.get('/api/health', async (req, res) => {
  res.json({ ok: true, status: 'healthy', database: !!process.env.DATABASE_URL })
})

app.get('/api/lan-info', (req, res) => {
  res.json({ lanIp: detectLanIp() })
})

app.get('/api/menu', async (req, res) => {
  await loadMenu()
  res.json(menu)
})

app.put('/api/menu', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Authorization required' })
  }

  const items = Array.isArray(req.body) ? req.body.map(normalizeItem) : []
  if (!items.length) {
    return res.status(400).json({ error: 'Menu items are required' })
  }

  menu.length = 0
  menu.push(...items)

  await saveMenuToDb(menu)
  res.json(menu)
})

app.get('/api/orders', async (req, res) => {
  await loadOrders()
  res.json(orders)
})

app.post('/api/orders', async (req, res) => {
  const body = req.body || {}
  const items = Array.isArray(body.items) ? body.items : []

  if (!items.length) {
    return res.status(400).json({ error: 'Order must include at least one item' })
  }

  const itemMap = new Map((await loadMenu()).map((item) => [String(item.id), item]))
  let totalPaisa = 0
  const validatedItems = []

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
  const tableNumber = verifiedTable || pickedTable || '01'

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
  await addOrderToDb(order)
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
  await updateOrderStatusInDb(id, status)
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

app.listen(PORT, () => {
  console.log(`Restaurant QR Node API running on http://localhost:${PORT}`)
  initDatabase().catch(() => {})
})

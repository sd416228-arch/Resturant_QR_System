import { createServer } from 'node:http'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import os from 'node:os'

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

const root = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.API_PORT || 8787)
const hostname = process.env.API_HOST || '0.0.0.0'
const dataDir = join(root, 'data')
const ordersFile = join(dataDir, 'orders.json')
const menuFile = join(dataDir, 'menu.json')
const distDir = resolve(root, 'dist')

// --- Storage ---------------------------------------------------------------

function readJsonFile(path, fallback) {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

// Atomic write: write to temp then rename to avoid corrupting the file on crash.
function writeJsonFile(path, value) {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(value, null, 2))
  renameSync(tmp, path)
}

let orders = readJsonFile(ordersFile, [])
let menu = readJsonFile(menuFile, [])

const saveOrders = () => writeJsonFile(ordersFile, orders)
const saveMenu = () => writeJsonFile(menuFile, menu)

// --- Constants --------------------------------------------------------------

const ORDER_STATUSES = ['New', 'Preparing', 'Ready', 'Completed', 'Cancelled']
const RESTAURANT_ID = process.env.RESTAURANT_ID || 'moss-ember'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || ''

// Bearer secret guarding the owner-only write endpoints (menu edits, token
// issuance). When empty (development) those endpoints stay open, matching the
// local-network trust model. Set ADMIN_TOKEN before deploying further.
const ADMIN_SECRET = process.env.ADMIN_TOKEN || process.env.API_SECRET || ''

// --- Crypto / QR tokens ------------------------------------------------------

const TOKEN_SECRET = process.env.QR_TOKEN_SECRET || process.env.API_SECRET || `dev-only-secret-${RESTAURANT_ID}`

// Signed, opaque token for a table. Prevents raw table spoofing via ?table=99.
function signTableToken(table) {
  const payload = `${RESTAURANT_ID}:${table}`
  const sig = createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

function verifyTableToken(token) {
  if (!token || !token.includes('.')) return null
  const [encoded, sig] = token.split('.')
  const expected = createHmac('sha256', TOKEN_SECRET).update(Buffer.from(encoded, 'base64url').toString()).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  const payload = Buffer.from(encoded, 'base64url').toString()
  if (!payload.includes(':')) return null
  const [rid, table] = payload.split(':')
  if (rid !== RESTAURANT_ID) return null
  return table
}

// Guard for owner-only endpoints. Once ADMIN_SECRET is set, the request must
// carry Authorization: Bearer <secret>; comparison is timing-safe.
function isAuthorized(request) {
  if (!ADMIN_SECRET) return true
  const header = String(request.headers['authorization'] || '')
  if (!header.startsWith('Bearer ')) return false
  const provided = Buffer.from(header.slice('Bearer '.length))
  const expected = Buffer.from(ADMIN_SECRET)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

// --- Validation -------------------------------------------------------------

// Guarded JSON body parser: never throws, never crashes the server.
function parseRequestBody(raw) {
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function isValidStatus(value) {
  return typeof value === 'string' && ORDER_STATUSES.includes(value)
}

// Returns { ok, totalPaisa, lines } or { ok: false, error }.
// Validates every line against the SERVER-SIDE menu and recomputes the total.
function validateOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'Order must include at least one item' }
  }
  const menuById = new Map(menu.map((item) => [String(item.id), item]))
  const lines = []
  let totalPaisa = 0
  for (const line of items) {
    if (!line || typeof line.itemId !== 'number' && typeof line.itemId !== 'string') {
      return { ok: false, error: 'Each order line must include an itemId' }
    }
    const menuItem = menuById.get(String(line.itemId))
    if (!menuItem) return { ok: false, error: `Unknown item id: ${line.itemId}` }
    if (!menuItem.available) return { ok: false, error: `Item is unavailable: ${menuItem.name}` }
    const quantity = Number(line.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return { ok: false, error: `Invalid quantity for item ${menuItem.name}` }
    }
    lines.push({ itemId: menuItem.id, name: menuItem.name, pricePaisa: menuItem.pricePaisa, quantity })
    totalPaisa += menuItem.pricePaisa * quantity
  }
  return { ok: true, lines, totalPaisa }
}

// Sanitize/save validated order; ignore any price/table field the client sent.
function normalizeOrder(payload, table) {
  const validation = validateOrderItems(payload && payload.items)
  if (!validation.ok) return { error: validation.error, status: 400 }

  // Table comes from the verified token (server-side); otherwise a sanitized
  // client-picked table number (plain /customer/dashboard link with picker).
  const pickedTable =
    typeof payload.tableNumber === 'string' && /^[\w-]{1,8}$/.test(payload.tableNumber)
      ? payload.tableNumber
      : ''
  const safeTable = verifyTableToken(payload.tableToken) || pickedTable || table || '0'

  const id = `#${String(Date.now()).slice(-5)}`
  const now = new Date()
  return {
    order: {
      id,
      table: `Table ${safeTable}`,
      tableNumber: safeTable,
      items: validation.lines,
      totalPaisa: validation.totalPaisa,
      status: 'New',
      time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      isoTime: now.toISOString(),
      note: typeof payload.note === 'string' && payload.note.length <= 500 ? payload.note : undefined,
    },
    status: 201,
  }
}

// --- HTTP helpers -------------------------------------------------------------

function setCorsHeaders(response) {
  // Restrict CORS to the app origin when configured; only wildcard in dev by default.
  const origin = ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '*'
  response.setHeader('Access-Control-Allow-Origin', origin)
  if (ALLOWED_ORIGIN) response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function send(response, status, body) {
  const encoded = JSON.stringify(body)
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(encoded)
}

// --- Static frontend -----------------------------------------------------------
// Serving the built bundle from the same process as the API gives the app and
// its API a single origin: no CORS, no port guessing, and one URL for the QR
// codes. That is what lets the whole thing sit behind one TLS terminator.

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

const hasBuild = existsSync(join(distDir, 'index.html'))

// Resolve a URL path to a file inside dist/, refusing anything that escapes it.
function resolveStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname)
  const candidate = resolve(distDir, `.${normalize(decoded)}`)
  if (candidate !== distDir && !candidate.startsWith(distDir + sep)) return null
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  return null
}

function serveStatic(request, response, pathname) {
  // Hashed asset filenames are safe to cache hard; index.html must not be.
  const file = resolveStaticPath(pathname) || resolveStaticPath('/index.html')
  if (!file) return false
  const isIndex = file === join(distDir, 'index.html')
  const type = MIME_TYPES[extname(file).toLowerCase()] || 'application/octet-stream'
  const etag = `W/"${file.length}-${file.split(sep).pop()}"`
  if (request.headers['if-none-match'] === etag) {
    response.writeHead(304, { ETag: etag })
    response.end()
    return true
  }
  response.writeHead(200, {
    'Content-Type': type,
    ETag: etag,
    'Cache-Control': isIndex ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  createReadStream(file).pipe(response)
  return true
}

// Basic in-memory rate limiter for public order endpoints (per IP).
const rateBuckets = new Map()
const RATE_LIMIT = {
  windowMs: 60000,
  max: 30,
}
function rateLimited(ip) {
  const now = Date.now()
  const bucket = rateBuckets.get(ip) || { count: 0, reset: now + RATE_LIMIT.windowMs }
  if (now > bucket.reset) {
    bucket.count = 0
    bucket.reset = now + RATE_LIMIT.windowMs
  }
  rateBuckets.set(ip, bucket)
  bucket.count += 1
  return bucket.count > RATE_LIMIT.max
}

function readBody(request) {
  return new Promise((resolve) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 100_000) {
        // Cap body size to avoid memory abuse; reject oversized payloads.
        request.destroy()
        resolve(null)
      }
    })
    request.on('end', () => resolve(body))
    request.on('error', () => resolve(null))
  })
}

// --- Server ---------------------------------------------------------------------

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const pathname = url.pathname.replace(/\/+$/, '') || '/'
  const ip = request.socket.remoteAddress || 'unknown'

  setCorsHeaders(response)

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  // --- Public: canonical menu (single source of truth for all devices) ---
  if (request.method === 'GET' && (pathname === '/api/menu' || pathname === '/api/menu/')) {
    menu = readJsonFile(menuFile, menu)
    return send(response, 200, menu)
  }

  // --- Public: resolve an opaque QR token back to a table (server-side verify) ---
  if (request.method === 'GET' && pathname === '/api/tables/verify') {
    const token = url.searchParams.get('token')
    const table = verifyTableToken(token)
    if (!table) return send(response, 401, { error: 'This QR code is not valid. Ask staff for a working code.' })
    return send(response, 200, { table, restaurantId: RESTAURANT_ID })
  }

  // --- Owner: sign a table QR token (requires admin bearer token) ---
  if (request.method === 'POST' && (pathname === '/api/tables/token')) {
    if (!isAuthorized(request)) return send(response, 401, { error: 'Admin authorization required to issue table tokens' })
    const body = parseRequestBody(await readBody(request))
    const table = body && typeof body.table === 'string' && /^\d+$/.test(body.table) ? body.table : null
    if (!table) return send(response, 400, { error: 'table is required and must be numeric' })
    return send(response, 200, { token: signTableToken(table), restaurantId: RESTAURANT_ID })
  }

  // --- Owner: update menu (persists the canonical menu; requires bearer token) ---
  if (request.method === 'PUT' && pathname === '/api/menu') {
    if (!isAuthorized(request)) return send(response, 401, { error: 'Admin authorization required to modify the menu' })
    const body = parseRequestBody(await readBody(request))
    if (!Array.isArray(body)) return send(response, 400, { error: 'menu must be an array' })
    const normalized = body.map((item) => {
      const pricePaisa = Number(item.pricePaisa ?? item.price * 100)
      return {
        id: item.id,
        name: String(item.name ?? ''),
        description: String(item.description ?? ''),
        pricePaisa: Number.isFinite(pricePaisa) && pricePaisa >= 0 ? Math.round(pricePaisa) : 0,
        category: String(item.category ?? 'Mains'),
        image: String(item.image ?? ''),
        available: item.available !== false,
        prep: Number.isInteger(Number(item.prep)) && Number(item.prep) >= 0 ? Number(item.prep) : 5,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      }
    })
    menu = normalized
    saveMenu()
    return send(response, 200, menu)
  }

  // --- Orders: POST (customer) ---
  if (request.method === 'POST' && pathname === '/api/orders') {
    if (rateLimited(ip)) return send(response, 429, { error: 'Too many orders. Please wait a moment and try again.' })
    const body = parseRequestBody(await readBody(request))
    if (!body) return send(response, 400, { error: 'Request body must be valid JSON' })
    const result = normalizeOrder(body, body.table)
    if (result.error) return send(response, result.status, { error: result.error })
    orders = [result.order, ...orders]
    saveOrders()
    return send(response, result.status, { order: result.order, message: 'Order accepted by the kitchen' })
  }

  // --- Orders: PATCH status (kitchen/owner) ---
  const orderMatch = pathname.match(/^\/api\/orders\/(.+)$/)
  if (orderMatch && request.method === 'PATCH') {
    const id = decodeURIComponent(orderMatch[1])
    const body = parseRequestBody(await readBody(request))
    if (!body) return send(response, 400, { error: 'Request body must be valid JSON' })
    if (!isValidStatus(body.status)) {
      return send(response, 400, { error: `status must be one of: ${ORDER_STATUSES.join(', ')}` })
    }
    const order = orders.find((entry) => entry.id === id)
    if (!order) return send(response, 404, { error: 'Order not found' })
    if (order.status === 'Cancelled' || order.status === 'Completed') {
      return send(response, 409, { error: `Order ${id} is already ${order.status.toLowerCase()} and cannot be changed` })
    }
    order.status = body.status
    saveOrders()
    return send(response, 200, order)
  }

  // --- Orders: GET ---
  if (request.method === 'GET' && pathname === '/api/orders') {
    orders = readJsonFile(ordersFile, orders)
    return send(response, 200, orders)
  }

  // --- Health check ---
  if (request.method === 'GET' && pathname === '/api/health') {
    orders = readJsonFile(ordersFile, orders)
    return send(response, 200, { ok: true, restaurantId: RESTAURANT_ID, orders: orders.length })
  }

  // --- LAN IP for QR base URL auto-detection ---
  if (request.method === 'GET' && pathname === '/api/lan-info') {
    return send(response, 200, { lanIp: detectLanIp() })
  }

  // --- Static frontend (SPA fallback) ---
  // Any non-API GET resolves to a built asset, else to index.html so the
  // client-side router can handle deep links such as /?t=<token>.
  if (request.method === 'GET' && !pathname.startsWith('/api/')) {
    if (!hasBuild) {
      return send(response, 503, {
        error: 'Frontend not built. Run `npm run build`, or use `npm run dev` for the Vite dev server.',
      })
    }
    if (serveStatic(request, response, pathname)) return
  }

  send(response, 404, { error: 'Not found' })
})

server.listen(port, hostname, () => {
  console.log(`Sprig API listening on http://${hostname}:${port}`)
  console.log(`Restaurant: ${RESTAURANT_ID} | menu items: ${menu.length} | stored orders: ${orders.length}`)
  if (hasBuild) {
    console.log(`Frontend: serving ${distDir} on the same origin (single-URL mode)`)
  } else {
    console.log('Frontend: no dist/ build found — API only. Run `npm run build` to serve the app here.')
  }
  if (!ALLOWED_ORIGIN) console.log('CORS: wildcard (development). Set ALLOWED_ORIGIN for production.')
  if (!process.env.QR_TOKEN_SECRET && !process.env.API_SECRET) console.log('WARNING: using a default QR token secret. Set QR_TOKEN_SECRET in production.')
  if (!ADMIN_SECRET) console.log('WARNING: no ADMIN_TOKEN set — menu edits and QR-token issuance are unauthenticated (dev mode).')
})

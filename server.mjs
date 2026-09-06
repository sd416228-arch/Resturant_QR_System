import { createServer } from 'node:http'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const port = Number(process.env.API_PORT || 8787)
const dataFile = join(dirname(fileURLToPath(import.meta.url)), 'orders.json')
const seedOrders = [
  { id: '#1048', table: 'Table 04', items: [], total: 37, status: 'Preparing', time: '12:41 PM' },
  { id: '#1047', table: 'Table 02', items: [], total: 28, status: 'New', time: '12:38 PM', note: 'One egg fully cooked, please.' },
  { id: '#1046', table: 'Table 11', items: [], total: 23, status: 'Ready', time: '12:30 PM' },
  { id: '#1045', table: 'Table 07', items: [], total: 38, status: 'Completed', time: '12:15 PM' },
]
let orders = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : seedOrders
const save = () => writeFileSync(dataFile, JSON.stringify(orders, null, 2))
const send = (response, status, body) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); response.end(JSON.stringify(body)) }
const server = createServer((request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return response.end() }
  if (request.url === '/api/orders' && request.method === 'GET') return send(response, 200, orders)
  if (request.url === '/api/orders' && request.method === 'POST') { let body = ''; request.on('data', chunk => { body += chunk }); request.on('end', () => { const order = JSON.parse(body); orders = [order, ...orders]; save(); send(response, 201, order) }); return }
  const match = request.url?.match(/^\/api\/orders\/(.+)$/)
  if (match && request.method === 'PATCH') { let body = ''; request.on('data', chunk => { body += chunk }); request.on('end', () => { const order = orders.find(entry => entry.id === decodeURIComponent(match[1])); if (!order) return send(response, 404, { error: 'Order not found' }); Object.assign(order, JSON.parse(body)); save(); send(response, 200, order) }); return }
  send(response, 404, { error: 'Not found' })
})
server.listen(port, '0.0.0.0', () => console.log(`Order API listening on http://0.0.0.0:${port}`))

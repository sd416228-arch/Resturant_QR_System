import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const connectionString = process.env.DATABASE_URL || ''
const pool = connectionString ? new Pool({ connectionString }) : null

export async function initDatabase() {
  if (!pool) {
    console.warn('DATABASE_URL is not set. The server is running in fallback mode without PostgreSQL.')
    return false
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        price_paisa INTEGER NOT NULL,
        image TEXT,
        available BOOLEAN DEFAULT TRUE,
        prep INTEGER DEFAULT 10,
        tags TEXT[] DEFAULT '{}'
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        table_number VARCHAR(20) NOT NULL,
        total_paisa INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'New',
        note TEXT,
        iso_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        items JSONB NOT NULL DEFAULT '[]'
      );
    `)

    return true
  } catch (error) {
    console.error('PostgreSQL init failed:', error.message)
    return false
  }
}

export async function getMenuFromDb() {
  if (!pool) return null

  const result = await pool.query(
    'SELECT id, name, description, category, price_paisa AS "pricePaisa", image, available, prep, tags FROM menu_items ORDER BY id ASC'
  )

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category || 'Mains',
    pricePaisa: Number(row.pricePaisa),
    image: row.image || '',
    available: row.available !== false,
    prep: Number(row.prep || 10),
    tags: Array.isArray(row.tags) ? row.tags : [],
  }))
}

export async function saveMenuToDb(menuItems) {
  if (!pool) return null

  await pool.query('DELETE FROM menu_items')

  for (const item of menuItems) {
    await pool.query(
      `INSERT INTO menu_items (id, name, description, category, price_paisa, image, available, prep, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        item.id,
        item.name,
        item.description || '',
        item.category || 'Mains',
        Number(item.pricePaisa || 0),
        item.image || '',
        item.available !== false,
        Number(item.prep || 10),
        Array.isArray(item.tags) ? item.tags : [],
      ]
    )
  }

  return true
}

export async function getOrdersFromDb() {
  if (!pool) return null

  const result = await pool.query(
    `SELECT id, table_number AS "tableNumber", total_paisa AS "totalPaisa", status, note, iso_time AS "isoTime", items
     FROM orders ORDER BY iso_time DESC`
  )

  return result.rows.map((row) => ({
    id: row.id,
    table: `Table ${row.tableNumber}`,
    tableNumber: row.tableNumber,
    totalPaisa: Number(row.totalPaisa),
    status: row.status,
    note: row.note || '',
    isoTime: row.isoTime,
    time: new Date(row.isoTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    items: row.items || [],
  }))
}

export async function addOrderToDb(order) {
  if (!pool) return null

  await pool.query(
    `INSERT INTO orders (id, table_number, total_paisa, status, note, iso_time, items)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      order.id,
      order.tableNumber,
      Number(order.totalPaisa || 0),
      order.status || 'New',
      order.note || '',
      order.isoTime || new Date().toISOString(),
      JSON.stringify(order.items || []),
    ]
  )

  return order
}

export async function updateOrderStatusInDb(id, status) {
  if (!pool) return null

  const result = await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  )

  return result.rows[0] || null
}

export const db = pool

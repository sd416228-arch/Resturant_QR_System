import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const connectionString = (process.env.DATABASE_URL || '').trim()
// Only create a pool if connectionString looks non-empty and is not a placeholder
const pool = connectionString && !connectionString.includes('localhost:5432') && !connectionString.includes('127.0.0.1:5432')
  ? new Pool({ connectionString, connectionTimeoutMillis: 2000 })
  : null

let isConnected = false

export async function initDatabase() {
  if (!pool) {
    isConnected = false
    return false
  }

  try {
    const client = await pool.connect()
    try {
      await client.query(`
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

      await client.query(`
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

      await client.query(`
        CREATE TABLE IF NOT EXISTS service_requests (
          id VARCHAR(50) PRIMARY KEY,
          restaurant_id VARCHAR(50) NOT NULL,
          table_number VARCHAR(20) NOT NULL,
          request_type VARCHAR(30) NOT NULL,
          message TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'Pending',
          assigned_waiter_id VARCHAR(50),
          assigned_waiter_name VARCHAR(100),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          accepted_at TIMESTAMPTZ,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `)

      isConnected = true
      return true
    } finally {
      client.release()
    }
  } catch {
    isConnected = false
    return false
  }
}

export function isDatabaseConnected() {
  return isConnected
}

export async function getMenuFromDb() {
  if (!pool || !isConnected) return null
  try {
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
  } catch {
    isConnected = false
    return null
  }
}

export async function saveMenuToDb(menuItems) {
  if (!pool || !isConnected) return null
  try {
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
  } catch {
    isConnected = false
    return null
  }
}

export async function getOrdersFromDb() {
  if (!pool || !isConnected) return null
  try {
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
  } catch {
    isConnected = false
    return null
  }
}

export async function addOrderToDb(order) {
  if (!pool || !isConnected) return null
  try {
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
  } catch {
    isConnected = false
    return null
  }
}

export async function updateOrderStatusInDb(id, status) {
  if (!pool || !isConnected) return null
  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    )

    return result.rows[0] || null
  } catch {
    isConnected = false
    return null
  }
}

export async function getServiceRequestsFromDb(restaurantId) {
  if (!pool || !isConnected) return null
  try {
    const result = await pool.query(
      `SELECT id, restaurant_id AS "restaurantId", table_number AS "tableNumber", request_type AS "requestType",
              message, status, assigned_waiter_id AS "assignedWaiterId", assigned_waiter_name AS "assignedWaiterName",
              created_at AS "createdAt", accepted_at AS "acceptedAt", started_at AS "startedAt",
              completed_at AS "completedAt", updated_at AS "updatedAt"
       FROM service_requests
       WHERE restaurant_id = $1
       ORDER BY created_at DESC`,
      [restaurantId]
    )
    return result.rows
  } catch {
    isConnected = false
    return null
  }
}

export async function addServiceRequestToDb(req) {
  if (!pool || !isConnected) return null
  try {
    await pool.query(
      `INSERT INTO service_requests (id, restaurant_id, table_number, request_type, message, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.id,
        req.restaurantId,
        req.tableNumber,
        req.requestType,
        req.message || '',
        req.status || 'Pending',
        req.createdAt || new Date().toISOString(),
        req.updatedAt || new Date().toISOString(),
      ]
    )
    return req
  } catch {
    isConnected = false
    return null
  }
}

export async function acceptServiceRequestInDb(id, waiterId, waiterName) {
  if (!pool || !isConnected) return null
  try {
    // Atomic update: only if currently 'Pending'
    const now = new Date().toISOString()
    const result = await pool.query(
      `UPDATE service_requests
       SET status = 'Accepted',
           assigned_waiter_id = $2,
           assigned_waiter_name = $3,
           accepted_at = $4,
           updated_at = $4
       WHERE id = $1 AND status = 'Pending'
       RETURNING id, restaurant_id AS "restaurantId", table_number AS "tableNumber", request_type AS "requestType",
                 message, status, assigned_waiter_id AS "assignedWaiterId", assigned_waiter_name AS "assignedWaiterName",
                 created_at AS "createdAt", accepted_at AS "acceptedAt", started_at AS "startedAt",
                 completed_at AS "completedAt", updated_at AS "updatedAt"`,
      [id, waiterId, waiterName, now]
    )
    return result.rows[0] || null
  } catch {
    isConnected = false
    return null
  }
}

export async function updateServiceRequestStatusInDb(id, status, waiterId, isAdmin = false) {
  if (!pool || !isConnected) return null
  try {
    const now = new Date().toISOString()
    let query = ''
    let params = []

    if (status === 'In Progress') {
      if (isAdmin) {
        query = `UPDATE service_requests
                 SET status = 'In Progress', started_at = COALESCE(started_at, $2), updated_at = $2
                 WHERE id = $1 AND status IN ('Accepted', 'In Progress')
                 RETURNING *`
        params = [id, now]
      } else {
        query = `UPDATE service_requests
                 SET status = 'In Progress', started_at = COALESCE(started_at, $3), updated_at = $3
                 WHERE id = $1 AND assigned_waiter_id = $2 AND status IN ('Accepted', 'In Progress')
                 RETURNING *`
        params = [id, waiterId, now]
      }
    } else if (status === 'Completed') {
      if (isAdmin) {
        query = `UPDATE service_requests
                 SET status = 'Completed', completed_at = $2, updated_at = $2
                 WHERE id = $1 AND status IN ('Accepted', 'In Progress')
                 RETURNING *`
        params = [id, now]
      } else {
        query = `UPDATE service_requests
                 SET status = 'Completed', completed_at = $3, updated_at = $3
                 WHERE id = $1 AND assigned_waiter_id = $2 AND status IN ('Accepted', 'In Progress')
                 RETURNING *`
        params = [id, waiterId, now]
      }
    } else if (status === 'Cancelled') {
      query = `UPDATE service_requests
               SET status = 'Cancelled', updated_at = $2
               WHERE id = $1 AND status IN ('Pending', 'Accepted')
               RETURNING *`
      params = [id, now]
    }

    if (!query) return null
    const result = await pool.query(query, params)
    return result.rows[0] || null
  } catch {
    isConnected = false
    return null
  }
}

export async function releaseOrReassignServiceRequestInDb(id, newWaiterId, newWaiterName) {
  if (!pool || !isConnected) return null
  try {
    const now = new Date().toISOString()
    let query = ''
    let params = []

    if (!newWaiterId) {
      // Release back to Pending
      query = `UPDATE service_requests
               SET status = 'Pending', assigned_waiter_id = NULL, assigned_waiter_name = NULL,
                   accepted_at = NULL, started_at = NULL, updated_at = $2
               WHERE id = $1 AND status IN ('Accepted', 'In Progress')
               RETURNING *`
      params = [id, now]
    } else {
      // Reassign to specific waiter
      query = `UPDATE service_requests
               SET status = 'Accepted', assigned_waiter_id = $2, assigned_waiter_name = $3,
                   accepted_at = $4, updated_at = $4
               WHERE id = $1 AND status IN ('Pending', 'Accepted', 'In Progress')
               RETURNING *`
      params = [id, newWaiterId, newWaiterName, now]
    }
    const result = await pool.query(query, params)
    return result.rows[0] || null
  } catch {
    isConnected = false
    return null
  }
}

export const db = pool

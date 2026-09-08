import { useCallback, useEffect, useRef, useState } from 'react'
import type { Order, OrderStatus } from '../types'
import { fetchOrders, updateOrderStatus } from '../lib/api'

const POLL_MS = 2000

export function useOrders(active = true) {
  const [orders, setOrders] = useState<Order[]>([])
  const [offline, setOffline] = useState(false)
  const timer = useRef<number | null>(null)

  const refresh = useCallback(() => {
    fetchOrders().then((data) => {
      setOrders(data)
      setOffline(!data.length)
    })
  }, [])

  useEffect(() => {
    if (!active) return
    refresh()
    timer.current = window.setInterval(refresh, POLL_MS)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [active, refresh])

  const changeStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const ok = await updateOrderStatus(id, status)
      if (ok) {
        setOrders((current) => current.map((o) => (o.id === id ? { ...o, status } : o)))
      }
      return ok
    },
    [],
  )

  return { orders, changeStatus, offline, refresh }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchOrders, getStoredOrders, updateOrderStatus } from '../lib/api'

const POLL_MS = 3000

export function useOrders(active = true) {
  const [orders, setOrders] = useState(() => getStoredOrders())
  const [offline, setOffline] = useState(false)
  const timer = useRef<number | null>(null)

  const refresh = useCallback(() => {
    fetchOrders()
      .then((data) => {
        if (data && data.length > 0) {
          setOrders(data)
        }
        setOffline(false)
      })
      .catch(() => {
        setOffline(true)
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
    async (id, status) => {
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

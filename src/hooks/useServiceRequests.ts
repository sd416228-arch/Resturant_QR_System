import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchServiceRequests,
  createServiceRequest,
  acceptServiceRequest,
  updateServiceRequestStatus,
  reassignServiceRequest,
} from '../lib/api'
import type { ServiceRequest, ServiceRequestStatus, ServiceRequestType } from '../types'

export function useServiceRequests(poll = true) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const prevCountRef = useRef(0)
  const hasNewAlertRef = useRef(false)

  const reload = useCallback(async () => {
    try {
      const data = await fetchServiceRequests()
      setRequests(data)
      setError(null)
      return data
    } catch (err) {
      setError((err as Error).message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    if (!poll) return

    const interval = setInterval(async () => {
      try {
        const data = await fetchServiceRequests()
        setRequests(data)
      } catch {}
    }, 2500)

    return () => clearInterval(interval)
  }, [poll, reload])

  const submitRequest = async (input: {
    requestType: ServiceRequestType
    message?: string
    tableToken?: string
    tableNumber: string
  }) => {
    const res = await createServiceRequest(input)
    if (res.ok) {
      await reload()
    }
    return res
  }

  const acceptRequest = async (id: string, waiterId: string, waiterName: string) => {
    const res = await acceptServiceRequest(id, waiterId, waiterName)
    await reload()
    return res
  }

  const setStatus = async (
    id: string,
    status: 'In Progress' | 'Completed' | 'Cancelled',
    waiterId?: string,
    isAdmin = false
  ) => {
    const res = await updateServiceRequestStatus(id, status, waiterId, isAdmin)
    await reload()
    return res
  }

  const reassign = async (
    id: string,
    params: {
      newWaiterId?: string
      newWaiterName?: string
      waiterId?: string
      isAdmin?: boolean
    }
  ) => {
    const res = await reassignServiceRequest(id, params)
    await reload()
    return res
  }

  return {
    requests,
    loading,
    error,
    reload,
    submitRequest,
    acceptRequest,
    setStatus,
    reassign,
  }
}

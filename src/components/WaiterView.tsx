import { useState, useEffect, useRef } from 'react'
import type { ServiceRequest, ServiceRequestStatus, WaiterProfile } from '../types'
import { playServiceRequestChime } from '../lib/sound'

interface WaiterViewProps {
  requests: ServiceRequest[]
  onAccept: (id: string, waiterId: string, waiterName: string) => Promise<{ ok: boolean; error?: string; conflict?: boolean; assignedWaiterName?: string }>
  onStatusChange: (id: string, status: 'In Progress' | 'Completed' | 'Cancelled', waiterId?: string) => Promise<{ ok: boolean; error?: string }>
  onRelease: (id: string, waiterId: string) => Promise<{ ok: boolean; error?: string }>
  onRefresh?: () => void
}

const DEFAULT_WAITERS: WaiterProfile[] = [
  { id: 'W-01', name: 'Alex Rivera', role: 'waiter' },
  { id: 'W-02', name: 'Sam Chen', role: 'waiter' },
  { id: 'W-03', name: 'Elena Rostova', role: 'waiter' },
  { id: 'W-04', name: 'Marcus Taylor', role: 'waiter' },
]

export default function WaiterView({
  requests,
  onAccept,
  onStatusChange,
  onRelease,
  onRefresh,
}: WaiterViewProps) {
  // Current Waiter Staff selector
  const [currentWaiter, setCurrentWaiter] = useState<WaiterProfile>(() => {
    const saved = localStorage.getItem('sprig_active_waiter')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    return DEFAULT_WAITERS[0]
  })

  // Filters: 'All Active' | 'Pending' | 'Assigned to me' | 'In Progress' | 'Completed'
  const [filter, setFilter] = useState<'All Active' | 'Pending' | 'Assigned to me' | 'In Progress' | 'Completed'>('All Active')
  const [searchTable, setSearchTable] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('sprig_waiter_sound') !== 'false')
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successToast, setSuccessToast] = useState('')

  // Track previous pending request IDs to alert only on genuinely NEW requests
  const prevPendingIdsRef = useRef<Set<string>>(new Set())
  const isFirstMountRef = useRef(true)

  useEffect(() => {
    localStorage.setItem('sprig_active_waiter', JSON.stringify(currentWaiter))
  }, [currentWaiter])

  useEffect(() => {
    localStorage.setItem('sprig_waiter_sound', soundEnabled ? 'true' : 'false')
  }, [soundEnabled])

  // Play audio chime and flash alert on new pending requests
  useEffect(() => {
    const currentPending = requests.filter((r) => r.status === 'Pending')
    const currentPendingIds = new Set(currentPending.map((r) => r.id))

    if (!isFirstMountRef.current) {
      // Find newly arrived requests
      let hasNew = false
      currentPendingIds.forEach((id) => {
        if (!prevPendingIdsRef.current.has(id)) {
          hasNew = true
        }
      })

      if (hasNew && soundEnabled) {
        playServiceRequestChime()
        setSuccessToast('🔔 New service request received from dining floor!')
      }
    } else {
      isFirstMountRef.current = false
    }

    prevPendingIdsRef.current = currentPendingIds
  }, [requests, soundEnabled])

  useEffect(() => {
    if (!successToast) return
    const t = setTimeout(() => setSuccessToast(''), 3000)
    return () => clearTimeout(t)
  }, [successToast])

  useEffect(() => {
    if (!errorMessage) return
    const t = setTimeout(() => setErrorMessage(''), 4000)
    return () => clearTimeout(t)
  }, [errorMessage])

  // Calculate elapsed waiting minutes
  const getElapsedMinutes = (isoString?: string) => {
    if (!isoString) return 0
    const diff = Date.now() - new Date(isoString).getTime()
    return Math.max(0, Math.floor(diff / 60000))
  }

  // Handle Accept
  const handleAccept = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    setErrorMessage('')
    try {
      const res = await onAccept(id, currentWaiter.id, currentWaiter.name)
      if (!res.ok) {
        if (res.conflict) {
          setErrorMessage(`⚠️ Conflict: Request was just accepted by ${res.assignedWaiterName || 'another waiter'}!`)
        } else {
          setErrorMessage(res.error || 'Could not accept request.')
        }
      } else {
        setSuccessToast(`✓ You accepted request #${id} for Table ${requests.find((r) => r.id === id)?.tableNumber}`)
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  // Handle Start (In Progress)
  const handleStart = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await onStatusChange(id, 'In Progress', currentWaiter.id)
      if (!res.ok) {
        setErrorMessage(res.error || 'Could not mark In Progress.')
      } else {
        setSuccessToast(`Attending Table #${requests.find((r) => r.id === id)?.tableNumber}`)
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  // Handle Complete
  const handleComplete = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await onStatusChange(id, 'Completed', currentWaiter.id)
      if (!res.ok) {
        setErrorMessage(res.error || 'Could not complete request.')
      } else {
        setSuccessToast(`Service completed for Table #${requests.find((r) => r.id === id)?.tableNumber}!`)
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  // Handle Release
  const handleRelease = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await onRelease(id, currentWaiter.id)
      if (!res.ok) {
        setErrorMessage(res.error || 'Could not release request.')
      } else {
        setSuccessToast(`Request released back to floor pool.`)
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (searchTable && !r.tableNumber.toLowerCase().includes(searchTable.toLowerCase())) {
      return false
    }

    if (filter === 'All Active') {
      return r.status === 'Pending' || r.status === 'Accepted' || r.status === 'In Progress'
    }
    if (filter === 'Pending') {
      return r.status === 'Pending'
    }
    if (filter === 'Assigned to me') {
      return r.assignedWaiterId === currentWaiter.id && r.status !== 'Completed' && r.status !== 'Cancelled'
    }
    if (filter === 'In Progress') {
      return r.status === 'In Progress'
    }
    if (filter === 'Completed') {
      return r.status === 'Completed'
    }
    return true
  })

  // Sort: Pending first sorted by oldest waiting time descending; then by updatedAt
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (a.status === 'Pending' && b.status === 'Pending') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    if (a.status === 'Pending') return -1
    if (b.status === 'Pending') return 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  // Metric counts
  const pendingCount = requests.filter((r) => r.status === 'Pending').length
  const myAssignedCount = requests.filter((r) => r.assignedWaiterId === currentWaiter.id && r.status !== 'Completed').length
  const inProgressCount = requests.filter((r) => r.status === 'In Progress').length
  const completedTodayCount = requests.filter((r) => r.status === 'Completed').length

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'water':
        return '💧'
      case 'cutlery':
        return '🍴'
      case 'bill':
        return '💳'
      case 'order_help':
        return '📝'
      case 'general':
        return '🛎️'
      default:
        return '💬'
    }
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Banner / Waiter Identity Switcher */}
      <div
        style={{
          background: '#15241d',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#233d30',
              border: '1px solid #365947',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.4rem',
            }}
          >
            🧑‍💼
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', font: '600 1.3rem "Playfair Display", serif', color: '#f8fafc' }}>
                Service Staff &amp; Waiter Station
              </h2>
              <span style={{ fontSize: '0.72rem', background: '#22c55e', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                ● Live 2.5s Polling
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Real-time floor calls, concurrency-locked task acceptance &amp; guest assistance
            </p>
          </div>
        </div>

        {/* Waiter Switcher & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
            <span>Logged in as:</span>
            <select
              value={currentWaiter.id}
              onChange={(e) => {
                const found = DEFAULT_WAITERS.find((w) => w.id === e.target.value)
                if (found) setCurrentWaiter(found)
              }}
              style={{
                background: '#0d1813',
                color: '#f8fafc',
                border: '1px solid #284435',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {DEFAULT_WAITERS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.id})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: soundEnabled ? '#22c55e' : '#334155',
              color: 'white',
              border: 0,
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
            title={soundEnabled ? 'Chime sound is ON' : 'Chime sound is MUTED'}
          >
            <span>{soundEnabled ? '🔔 Chime On' : '🔕 Muted'}</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              style={{
                background: '#284435',
                color: '#e2e8f0',
                border: 0,
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>
          )}
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Pending Calls
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: pendingCount > 0 ? '#b45309' : '#1e293b' }}>
              {pendingCount}
            </span>
            <small style={{ color: '#64748b', fontSize: '0.8rem' }}>Unassigned</small>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Assigned to You
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--green)' }}>
              {myAssignedCount}
            </span>
            <small style={{ color: '#64748b', fontSize: '0.8rem' }}>Active tasks</small>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            In Progress
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1d4ed8' }}>
              {inProgressCount}
            </span>
            <small style={{ color: '#64748b', fontSize: '0.8rem' }}>At tables</small>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Resolved
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#334155' }}>
              {completedTodayCount}
            </span>
            <small style={{ color: '#64748b', fontSize: '0.8rem' }}>Completed</small>
          </div>
        </div>
      </div>

      {/* Alert Messages / Conflict Notifications */}
      {errorMessage && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            color: '#991b1b',
            marginBottom: '1.25rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')} style={{ background: 'transparent', border: 0, color: '#991b1b', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {successToast && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #6ee7b7',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            color: '#065f46',
            marginBottom: '1.25rem',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {successToast}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          background: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['All Active', 'Pending', 'Assigned to me', 'In Progress', 'Completed'] as const).map((tab) => {
            const isSelected = filter === tab
            let badge = null
            if (tab === 'Pending' && pendingCount > 0) {
              badge = <i style={{ background: '#ea580c', color: 'white', padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '4px' }}>{pendingCount}</i>
            }
            if (tab === 'Assigned to me' && myAssignedCount > 0) {
              badge = <i style={{ background: 'var(--green)', color: 'white', padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '4px' }}>{myAssignedCount}</i>
            }
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  border: isSelected ? '1px solid var(--green)' : '1px solid transparent',
                  background: isSelected ? 'var(--green)' : 'transparent',
                  color: isSelected ? 'white' : '#475569',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {tab}
                {badge}
              </button>
            )
          })}
        </div>

        <div>
          <input
            type="text"
            placeholder="Search by table #…"
            value={searchTable}
            onChange={(e) => setSearchTable(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              width: '180px',
            }}
          />
        </div>
      </div>

      {/* Service Request Cards Grid */}
      {sortedRequests.length === 0 ? (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            padding: '3.5rem 1rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🛎️</span>
          <strong style={{ fontSize: '1.1rem', color: '#1e293b', display: 'block' }}>
            No service requests match the "{filter}" filter.
          </strong>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem' }}>
            When guests at tables call a waiter, request water, cutlery, or the bill, tickets appear here instantly.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.25rem' }}>
          {sortedRequests.map((req) => {
            const elapsed = getElapsedMinutes(req.createdAt)
            const isOverdue = req.status === 'Pending' && elapsed >= 4
            const isMyAssignment = req.assignedWaiterId === currentWaiter.id
            const isOtherAssignment = req.assignedWaiterId && !isMyAssignment
            const isLoading = Boolean(actionLoading[req.id])

            // Border color by urgency
            let borderColor = 'var(--line)'
            let topRibbon = null
            if (req.status === 'Pending') {
              borderColor = isOverdue ? '#f87171' : '#fcd34d'
              topRibbon = isOverdue ? (
                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, borderBottom: '1px solid #fca5a5' }}>
                  ⚠️ OVERDUE · WAITING {elapsed} MIN
                </div>
              ) : (
                <div style={{ background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, borderBottom: '1px solid #fde68a' }}>
                  ⏳ PENDING · WAITING {elapsed} MIN
                </div>
              )
            } else if (req.status === 'In Progress') {
              borderColor = '#93c5fd'
            } else if (req.status === 'Accepted') {
              borderColor = '#86efac'
            }

            return (
              <div
                key={req.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: `2px solid ${borderColor}`,
                  overflow: 'hidden',
                  boxShadow: isOverdue ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                }}
              >
                {topRibbon}

                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Card Header: Table # and Status Pill */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Dining Table
                      </span>
                      <h3 style={{ margin: '0.1rem 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                        Table {req.tableNumber}
                      </h3>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '16px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          background:
                            req.status === 'Pending'
                              ? '#fef3c7'
                              : req.status === 'Accepted'
                              ? '#dcfce7'
                              : req.status === 'In Progress'
                              ? '#dbeafe'
                              : '#f1f5f9',
                          color:
                            req.status === 'Pending'
                              ? '#92400e'
                              : req.status === 'Accepted'
                              ? '#166534'
                              : req.status === 'In Progress'
                              ? '#1e40af'
                              : '#475569',
                          border: `1px solid ${
                            req.status === 'Pending'
                              ? '#fde68a'
                              : req.status === 'Accepted'
                              ? '#bbf7d0'
                              : req.status === 'In Progress'
                              ? '#bfdbfe'
                              : '#e2e8f0'
                          }`,
                        }}
                      >
                        {req.status}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Request Type and Note */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      marginBottom: '1rem',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{getServiceTypeIcon(req.requestType)}</span>
                      <strong style={{ fontSize: '0.92rem', color: '#1e293b', textTransform: 'capitalize' }}>
                        {req.requestType.replace('_', ' ')}
                      </strong>
                    </div>

                    {req.message ? (
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#475569', fontStyle: 'italic', lineHeight: 1.4 }}>
                        "{req.message}"
                      </p>
                    ) : (
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>No extra note provided</span>
                    )}
                  </div>

                  {/* Assignment Status display */}
                  <div style={{ marginBottom: '1.25rem', fontSize: '0.82rem' }}>
                    {req.status === 'Pending' ? (
                      <div style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        <span>⏱️</span>
                        <span>Waiting for acceptance · {elapsed}m elapsed</span>
                      </div>
                    ) : isMyAssignment ? (
                      <div style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                        <span>✓</span>
                        <span>Assigned to You ({currentWaiter.name})</span>
                      </div>
                    ) : (
                      <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>🧑‍💼</span>
                        <span>
                          Accepted by <b>{req.assignedWaiterName || 'Another Waiter'}</b>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons (Strictly enforced by business rules) */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                    {req.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => handleAccept(req.id)}
                        disabled={isLoading}
                        className="primary-button"
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <span>{isLoading ? 'Accepting…' : 'Accept Request'}</span>
                      </button>
                    )}

                    {req.status === 'Accepted' && isMyAssignment && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleStart(req.id)}
                          disabled={isLoading}
                          style={{
                            padding: '0.6rem 0.5rem',
                            background: '#2563eb',
                            color: 'white',
                            border: 0,
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                          }}
                        >
                          Start Attending
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRelease(req.id)}
                          disabled={isLoading}
                          style={{
                            padding: '0.6rem 0.5rem',
                            background: 'white',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                          }}
                        >
                          Release Task
                        </button>
                      </div>
                    )}

                    {req.status === 'In Progress' && isMyAssignment && (
                      <button
                        type="button"
                        onClick={() => handleComplete(req.id)}
                        disabled={isLoading}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          background: 'var(--green)',
                          color: 'white',
                          border: 0,
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Mark Service Completed
                      </button>
                    )}

                    {req.status !== 'Pending' && isOtherAssignment && req.status !== 'Completed' && (
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          textAlign: 'center',
                          fontSize: '0.8rem',
                          color: '#64748b',
                          fontWeight: 600,
                          border: '1px dashed #cbd5e1',
                        }}
                      >
                        Handled by {req.assignedWaiterName}
                      </div>
                    )}

                    {req.status === 'Completed' && (
                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: '0.8rem',
                          color: '#16a34a',
                          fontWeight: 600,
                          padding: '0.4rem',
                        }}
                      >
                        ✓ Resolved and closed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

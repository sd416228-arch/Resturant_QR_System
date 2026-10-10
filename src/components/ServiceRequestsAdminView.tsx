import { useState } from 'react'
import type { ServiceRequest, WaiterProfile } from '../types'

interface ServiceRequestsAdminViewProps {
  requests: ServiceRequest[]
  onReassign: (id: string, params: { newWaiterId?: string; newWaiterName?: string; isAdmin: boolean }) => Promise<{ ok: boolean; error?: string }>
  onStatusChange: (id: string, status: 'In Progress' | 'Completed' | 'Cancelled', isAdmin: boolean) => Promise<{ ok: boolean; error?: string }>
}

const AVAILABLE_WAITERS: WaiterProfile[] = [
  { id: 'W-01', name: 'Alex Rivera', role: 'waiter' },
  { id: 'W-02', name: 'Sam Chen', role: 'waiter' },
  { id: 'W-03', name: 'Elena Rostova', role: 'waiter' },
  { id: 'W-04', name: 'Marcus Taylor', role: 'waiter' },
]

export default function ServiceRequestsAdminView({
  requests,
  onReassign,
  onStatusChange,
}: ServiceRequestsAdminViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>('All')
  const [searchTable, setSearchTable] = useState<string>('')
  const [reassignModalReq, setReassignModalReq] = useState<ServiceRequest | null>(null)
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('')
  const [reassigning, setReassigning] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const handleOpenReassign = (req: ServiceRequest) => {
    setReassignModalReq(req)
    setSelectedWaiterId(req.assignedWaiterId || AVAILABLE_WAITERS[0].id)
  }

  const handleExecuteReassign = async () => {
    if (!reassignModalReq) return
    setReassigning(true)
    const waiter = AVAILABLE_WAITERS.find((w) => w.id === selectedWaiterId)
    const res = await onReassign(reassignModalReq.id, {
      newWaiterId: waiter ? waiter.id : undefined,
      newWaiterName: waiter ? waiter.name : undefined,
      isAdmin: true,
    })
    setReassigning(false)
    if (res.ok) {
      setToastMsg(`Request #${reassignModalReq.id} reassigned to ${waiter?.name || 'pool'}.`)
      setReassignModalReq(null)
    }
  }

  const handleReleaseToPool = async (req: ServiceRequest) => {
    const res = await onReassign(req.id, {
      newWaiterId: undefined,
      newWaiterName: undefined,
      isAdmin: true,
    })
    if (res.ok) {
      setToastMsg(`Request #${req.id} released back to Pending pool.`)
    }
  }

  const handleForceComplete = async (req: ServiceRequest) => {
    const res = await onStatusChange(req.id, 'Completed', true)
    if (res.ok) {
      setToastMsg(`Request #${req.id} marked Completed by Admin.`)
    }
  }

  const handleCancelReq = async (req: ServiceRequest) => {
    const res = await onStatusChange(req.id, 'Cancelled', true)
    if (res.ok) {
      setToastMsg(`Request #${req.id} cancelled.`)
    }
  }

  // Analytics calculation
  const total = requests.length
  const pending = requests.filter((r) => r.status === 'Pending').length
  const accepted = requests.filter((r) => r.status === 'Accepted').length
  const inProgress = requests.filter((r) => r.status === 'In Progress').length
  const completed = requests.filter((r) => r.status === 'Completed').length

  // Average response time (from created to accepted) in seconds/minutes
  const acceptedReqs = requests.filter((r) => r.acceptedAt && r.createdAt)
  let avgResponseMinutes = 0
  if (acceptedReqs.length > 0) {
    const totalMs = acceptedReqs.reduce((sum, r) => {
      const created = new Date(r.createdAt).getTime()
      const acc = new Date(r.acceptedAt!).getTime()
      return sum + Math.max(0, acc - created)
    }, 0)
    avgResponseMinutes = Math.round((totalMs / acceptedReqs.length / 60000) * 10) / 10
  }

  const filtered = requests.filter((r) => {
    if (filterStatus !== 'All' && r.status !== filterStatus) return false
    if (searchTable && !r.tableNumber.toLowerCase().includes(searchTable.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ padding: '0 0.5rem' }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
            Pending Now
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: pending > 0 ? '#b45309' : '#1e293b', marginTop: '0.2rem' }}>
            {pending}
          </div>
          <small style={{ color: '#64748b', fontSize: '0.78rem' }}>Unattended calls</small>
        </div>

        <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>
            Active / At Tables
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.2rem' }}>
            {accepted + inProgress}
          </div>
          <small style={{ color: '#64748b', fontSize: '0.78rem' }}>Waiters attending</small>
        </div>

        <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase' }}>
            Total Resolved
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--green)', marginTop: '0.2rem' }}>
            {completed}
          </div>
          <small style={{ color: '#64748b', fontSize: '0.78rem' }}>Completed services</small>
        </div>

        <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase' }}>
            Avg Response Time
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6d28d9', marginTop: '0.2rem' }}>
            {avgResponseMinutes > 0 ? `${avgResponseMinutes}m` : '< 1m'}
          </div>
          <small style={{ color: '#64748b', fontSize: '0.78rem' }}>From call to accept</small>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600 }}>
          {toastMsg}
        </div>
      )}

      {/* Filter and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['All', 'Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: filterStatus === st ? '1px solid var(--green)' : '1px solid transparent',
                background: filterStatus === st ? 'var(--green)' : 'transparent',
                color: filterStatus === st ? 'white' : '#475569',
                fontSize: '0.82rem',
                fontWeight: filterStatus === st ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <div>
          <input
            type="text"
            placeholder="Search table #…"
            value={searchTable}
            onChange={(e) => setSearchTable(e.target.value)}
            style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '160px' }}
          />
        </div>
      </div>

      {/* Requests Table */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid var(--line)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--line)', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Request ID</th>
              <th style={{ padding: '0.75rem 1rem' }}>Table</th>
              <th style={{ padding: '0.75rem 1rem' }}>Type &amp; Message</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem' }}>Assigned Waiter</th>
              <th style={{ padding: '0.75rem 1rem' }}>Time Elapsed</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Admin Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No service requests found.
                </td>
              </tr>
            ) : (
              filtered.map((req) => {
                const diffMin = Math.max(0, Math.floor((Date.now() - new Date(req.createdAt).getTime()) / 60000))
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                      {req.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                      Table {req.tableNumber}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong style={{ textTransform: 'capitalize', display: 'block', color: '#1e293b' }}>
                        {req.requestType.replace('_', ' ')}
                      </strong>
                      {req.message && (
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                          "{req.message}"
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background:
                            req.status === 'Pending'
                              ? '#fef3c7'
                              : req.status === 'Accepted'
                              ? '#dcfce7'
                              : req.status === 'In Progress'
                              ? '#dbeafe'
                              : req.status === 'Completed'
                              ? '#f1f5f9'
                              : '#fee2e2',
                          color:
                            req.status === 'Pending'
                              ? '#92400e'
                              : req.status === 'Accepted'
                              ? '#166534'
                              : req.status === 'In Progress'
                              ? '#1e40af'
                              : req.status === 'Completed'
                              ? '#475569'
                              : '#991b1b',
                        }}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                      {req.assignedWaiterName ? (
                        <span>🧑‍💼 {req.assignedWaiterName}</span>
                      ) : (
                        <span style={{ color: '#d97706', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {diffMin} min ago
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {req.status !== 'Completed' && req.status !== 'Cancelled' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenReassign(req)}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Reassign
                            </button>
                            {req.assignedWaiterId && (
                              <button
                                type="button"
                                onClick={() => handleReleaseToPool(req)}
                                style={{
                                  background: '#fffbeb',
                                  border: '1px solid #fde68a',
                                  color: '#b45309',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Release
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleForceComplete(req)}
                              style={{
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#065f46',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Resolve
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reassign Modal */}
      {reassignModalReq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReassignModalReq(null)
          }}
        >
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '420px', width: '100%', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#0f172a' }}>
              Reassign Request #{reassignModalReq.id}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.84rem', color: '#64748b' }}>
              Table {reassignModalReq.tableNumber} · {reassignModalReq.requestType}
            </p>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>
              Select Waiter Staff:
            </label>
            <select
              value={selectedWaiterId}
              onChange={(e) => setSelectedWaiterId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '1.25rem' }}
            >
              {AVAILABLE_WAITERS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.id})
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setReassignModalReq(null)}
                style={{ padding: '0.5rem 0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReassign}
                disabled={reassigning}
                className="primary-button"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                {reassigning ? 'Reassigning…' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import type { ServiceRequest, ServiceRequestType } from '../types'

interface CallWaiterModalProps {
  tableNumber: string
  activeRequest?: ServiceRequest | null
  onClose: () => void
  onSubmit: (type: ServiceRequestType, message: string) => Promise<{ ok: boolean; error?: string }>
  onCancelRequest?: (id: string) => Promise<void>
}

const SERVICE_OPTIONS: {
  type: ServiceRequestType
  title: string
  icon: string
  description: string
}[] = [
  {
    type: 'water',
    title: 'Drinking Water',
    icon: '💧',
    description: 'Chilled or room-temp fresh table water',
  },
  {
    type: 'cutlery',
    title: 'Cutlery & Napkins',
    icon: '🍴',
    description: 'Forks, spoons, knives, or fresh napkins',
  },
  {
    type: 'bill',
    title: 'Request Bill / Check',
    icon: '💳',
    description: 'Printed bill ready for card or cash payment',
  },
  {
    type: 'order_help',
    title: 'Help with Order',
    icon: '📝',
    description: 'Questions regarding menu items or current food ticket',
  },
  {
    type: 'general',
    title: 'Call Waiter Assistance',
    icon: '🛎️',
    description: 'Staff member to visit your table in person',
  },
  {
    type: 'other',
    title: 'Other Assistance',
    icon: '💬',
    description: 'Special accommodations or custom dining requests',
  },
]

export default function CallWaiterModal({
  tableNumber,
  activeRequest,
  onClose,
  onSubmit,
  onCancelRequest,
}: CallWaiterModalProps) {
  const [selectedType, setSelectedType] = useState<ServiceRequestType>('water')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErrorMsg('')

    const res = await onSubmit(selectedType, message.trim())
    if (!res.ok) {
      setErrorMsg(res.error || 'Failed to request assistance.')
      setSubmitting(false)
    } else {
      setSubmitting(false)
      // keep modal open to show active request status or let user see progress
    }
  }

  const handleCancel = async () => {
    if (!activeRequest || cancelling) return
    setCancelling(true)
    try {
      if (onCancelRequest) {
        await onCancelRequest(activeRequest.id)
      }
    } finally {
      setCancelling(false)
    }
  }

  const getStatusBadge = (status: ServiceRequest['status']) => {
    switch (status) {
      case 'Pending':
        return {
          bg: '#fef3c7',
          color: '#92400e',
          border: '#fde68a',
          label: '⏳ Waiting for Staff to Accept',
          desc: 'Your request is queued. An available waiter is receiving this alert now.',
        }
      case 'Accepted':
        return {
          bg: '#e0e7ff',
          color: '#3730a3',
          border: '#c7d2fe',
          label: '👋 Waiter Assigned & Heading Over',
          desc: `${activeRequest?.assignedWaiterName || 'Staff'} has accepted your request.`,
        }
      case 'In Progress':
        return {
          bg: '#ecfdf5',
          color: '#065f46',
          border: '#a7f3d0',
          label: '✨ In Progress / Attending Table',
          desc: `${activeRequest?.assignedWaiterName || 'Staff'} is currently assisting your table.`,
        }
      case 'Completed':
        return {
          bg: '#f1f5f9',
          color: '#334155',
          border: '#e2e8f0',
          label: '✓ Completed',
          desc: 'Service request resolved.',
        }
      default:
        return {
          bg: '#fef2f2',
          color: '#991b1b',
          border: '#fecaca',
          label: status,
          desc: '',
        }
    }
  }

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal-card"
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: '#15241d',
            color: 'white',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🛎️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', font: '600 1.15rem "Playfair Display", serif', color: '#f8fafc' }}>
                Call Waiter & Service
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Dining at <b>Table {tableNumber}</b>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {/* Active Request Live Status Banner */}
          {activeRequest && activeRequest.status !== 'Completed' && activeRequest.status !== 'Cancelled' ? (
            <div
              style={{
                background: getStatusBadge(activeRequest.status).bg,
                border: `1px solid ${getStatusBadge(activeRequest.status).border}`,
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {SERVICE_OPTIONS.find((o) => o.type === activeRequest.requestType)?.icon || '🛎️'}
                  </span>
                  <div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: getStatusBadge(activeRequest.status).color,
                        display: 'block',
                      }}
                    >
                      Active Request #{activeRequest.id}
                    </span>
                    <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                      {SERVICE_OPTIONS.find((o) => o.type === activeRequest.requestType)?.title || activeRequest.requestType}
                    </strong>
                  </div>
                </div>

                <span
                  style={{
                    background: 'white',
                    color: getStatusBadge(activeRequest.status).color,
                    border: `1px solid ${getStatusBadge(activeRequest.status).border}`,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {activeRequest.status}
                </span>
              </div>

              <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>
                {getStatusBadge(activeRequest.status).desc}
              </p>

              {activeRequest.assignedWaiterName && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    background: 'rgba(255,255,255,0.7)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>🧑‍💼</span>
                  <span>
                    Assigned Waiter: <b>{activeRequest.assignedWaiterName}</b>
                  </span>
                </div>
              )}

              {activeRequest.message && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                  "{activeRequest.message}"
                </div>
              )}

              {/* Cancel Button (allowed only when Pending or Accepted) */}
              {(activeRequest.status === 'Pending' || activeRequest.status === 'Accepted') && (
                <div style={{ marginTop: '1rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    style={{
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      color: '#b91c1c',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel This Request'}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* New Service Request Selection */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '0.6rem', letterSpacing: '0.5px' }}>
                How can we assist you at Table {tableNumber}?
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                {SERVICE_OPTIONS.map((opt) => {
                  const isSelected = selectedType === opt.type
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setSelectedType(opt.type)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--green)' : '1px solid #e2e8f0',
                        background: isSelected ? '#f0fdf4' : '#fafaf9',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{opt.icon}</span>
                      <strong style={{ fontSize: '0.86rem', color: isSelected ? 'var(--green)' : '#1e293b' }}>
                        {opt.title}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem', lineHeight: 1.3 }}>
                        {opt.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Optional message */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Optional note or details:
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. 2 glasses of ice water, split bill, extra chili flakes…"
                maxLength={200}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="primary-button"
                style={{
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.92rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>🛎️</span>
                <span>{submitting ? 'Sending Request…' : 'Send to Waiter Staff'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

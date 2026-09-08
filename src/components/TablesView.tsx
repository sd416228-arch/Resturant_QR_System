import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { requestTableToken } from '../lib/api'
import PageTitle from './PageTitle'

// QR encodes `/t/<token>` — an opaque, HMAC-signed token that resolves to a
// table server-side. The customer can't spoof `?table=99` in the URL anymore.
function QRCard({ table }: { table: string }) {
  const [src, setSrc] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const publicUrl = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '')

  useEffect(() => {
    let cancelled = false
    requestTableToken(table).then((result) => {
      if (cancelled) return
      if (!result) {
        setStatus('error')
        return
      }
      setToken(result.token)
      const qrUrl = `${publicUrl}?t=${encodeURIComponent(result.token)}`
      QRCode.toDataURL(qrUrl, {
        width: 180,
        margin: 1,
        color: { dark: '#244537', light: '#ffffff' },
      })
        .then((dataUrl) => {
          if (cancelled) return
          setSrc(dataUrl)
          setStatus('ready')
        })
        .catch(() => {
          if (!cancelled) setStatus('error')
        })
    })
    return () => {
      cancelled = true
    }
  }, [table, publicUrl])

  const download = () => {
    if (!src || !token) return
    const link = document.createElement('a')
    link.download = `moss-ember-table-${table}.png`
    link.href = src
    link.click()
  }

  return (
    <div className="qr-placeholder">
      {status === 'loading' && <span>Generating…</span>}
      {status === 'error' && (
        <small>Start the Order API to generate QR codes.</small>
      )}
      {status === 'ready' && src && <img src={src} alt={`QR code for table ${table}`} />}
      <small>SCAN FOR TABLE {table}</small>
      <button className="qr-download" onClick={download} disabled={status !== 'ready'}>
        Download QR
      </button>
    </div>
  )
}

const DEFAULT_TABLES = Array.from({ length: 12 }, (_, index) => ({
  number: String(index + 1).padStart(2, '0'),
  capacity: index % 3 === 0 ? 6 : 4,
}))

export default function TablesView() {
  const [tables, setTables] = useState(DEFAULT_TABLES)

  const addTable = () => {
    const max = tables.reduce((largest, t) => Math.max(largest, Number(t.number)), 0)
    setTables([
      ...tables,
      { number: String(max + 1).padStart(2, '0'), capacity: 4 },
    ])
  }

  return (
    <div className="page">
      <PageTitle
        eyebrow={`Floor plan · ${tables.length} tables`}
        title="Tables & QR codes"
        action={
          <button className="primary-button" onClick={addTable}>
            ＋ Add table
          </button>
        }
      />
      <div className="table-grid">
        {tables.map((table) => (
          <article className="table-card" key={table.number}>
            <div className="table-card-top">
              <span className="table-status available" />
              Available
            </div>
            <div className="table-number">{table.number}</div>
            <p>Table {table.number} · Seats {table.capacity}</p>
            <QRCard table={table.number} />
            <button className="secondary-button full" onClick={() => window.print()}>
              Print QR
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
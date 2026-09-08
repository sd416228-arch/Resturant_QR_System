import { useState } from 'react'
import type { MenuItem } from '../types'
import { formatPaisa } from '../lib/money'
import PageTitle from './PageTitle'

export default function MenuView({
  items,
  onSave,
  saving,
  error,
}: {
  items: MenuItem[]
  onSave: (items: MenuItem[]) => void
  saving: boolean
  error: string | null
}) {
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')

  const toggle = (item: MenuItem) => {
    onSave(items.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i)))
  }

  const add = () => {
    if (!newName.trim()) return
    const priceNpr = Number(newPrice)
    onSave([
      ...items,
      {
        id: Date.now(),
        name: newName.trim(),
        description: 'Freshly prepared in our kitchen.',
        pricePaisa: Number.isFinite(priceNpr) && priceNpr > 0 ? Math.round(priceNpr * 100) : 1000,
        category: 'Mains',
        image: '',
        available: true,
        prep: 12,
        tags: ['New'],
      },
    ])
    setNewName('')
    setNewPrice('')
  }

  const startEdit = (item: MenuItem) => {
    setEditing(item)
    setEditName(item.name)
    setEditPrice(String(item.pricePaisa / 100))
  }

  const saveEdit = () => {
    if (!editing) return
    const priceNpr = Number(editPrice)
    onSave(
      items.map((i) =>
        i.id === editing.id
          ? {
              ...i,
              name: editName.trim() || i.name,
              pricePaisa: Number.isFinite(priceNpr) && priceNpr > 0 ? Math.round(priceNpr * 100) : i.pricePaisa,
            }
          : i,
      ),
    )
    setEditing(null)
  }

  return (
    <div className="page">
      <PageTitle
        eyebrow={error ? `Sync issue — ${error}` : `Menu management · ${items.length} items`}
        title="Your menu"
        action={
          <button className="primary-button" onClick={add} disabled={saving}>
            ＋ Add item
          </button>
        }
      />
      <div className="menu-toolbar">
        <div className="filter-tabs">
          <button className="selected" type="button">All items</button>
          <button className="selected" type="button">Available · {items.filter((i) => i.available).length}</button>
          <button className="selected" type="button">Hidden · {items.filter((i) => !i.available).length}</button>
        </div>
        <div className="quick-add">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && add()}
            placeholder="Quick add item name…"
            aria-label="New item name"
          />
          <input
            value={newPrice}
            onChange={(event) => setNewPrice(event.target.value)}
            placeholder="Price (NPR)"
            aria-label="New item price in NPR"
            inputMode="decimal"
          />
          <button className="primary-button" onClick={add} disabled={saving}>＋</button>
        </div>
      </div>
      {editing && (
        <div className="edit-row">
          <input value={editName} onChange={(event) => setEditName(event.target.value)} aria-label="Edit item name" />
          <input value={editPrice} onChange={(event) => setEditPrice(event.target.value)} aria-label="Edit item price" inputMode="decimal" />
          <button className="secondary-button" onClick={saveEdit}>Save</button>
          <button className="secondary-button" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      )}
      <div className="menu-list">
        {items.map((item) => (
          <article className="menu-row" key={item.id}>
            {item.image ? <img src={item.image} alt="" /> : <div className="img-placeholder" />}
            <div className="menu-info">
              <div>
                <h2>{item.name}</h2>
                {item.tags.map((tag) => (
                  <span className="tag" key={tag}>{tag}</span>
                ))}
              </div>
              <p>{item.description}</p>
              <small>{item.category} · {item.prep} min prep</small>
            </div>
            <strong>{formatPaisa(item.pricePaisa)}</strong>
            <button className="add-admin-item" onClick={() => startEdit(item)} aria-label={`Edit ${item.name}`}>Edit</button>
            <button
              className={item.available ? 'toggle on' : 'toggle'}
              onClick={() => toggle(item)}
              aria-label={`${item.available ? 'Hide' : 'Show'} ${item.name}`}
            >
              {item.available ? 'On' : 'Off'}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
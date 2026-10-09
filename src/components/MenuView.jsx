import { useState } from 'react'
import { formatPaisa } from '../lib/money'
import PageTitle from './PageTitle'

const PRESET_CATEGORIES = ['Breakfast', 'Small plates', 'Mains', 'Desserts', 'Drinks']

const PRESET_IMAGES = [
  { label: 'Brunch / Eggs', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=80' },
  { label: 'Bao / Buns', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=700&q=80' },
  { label: 'Salmon / Bowl', url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80' },
  { label: 'Salad / Vegan', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80' },
  { label: 'Burger / Wagyu', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&q=80' },
  { label: 'Pizza / Italian', url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=700&q=80' },
  { label: 'Toast / Berries', url: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=700&q=80' },
  { label: 'Dessert / Cake', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=700&q=80' },
  { label: 'Drink / Spritz', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=700&q=80' },
  { label: 'Cold Brew / Coffee', url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=700&q=80' },
]

export default function MenuView({
  items,
  onSave,
  saving,
  error,
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [search, setSearch] = useState('')

  // Modal State for Add & Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPriceNpr, setFormPriceNpr] = useState('')
  const [formCategory, setFormCategory] = useState('Mains')
  const [formDesc, setFormDesc] = useState('')
  const [formPrep, setFormPrep] = useState('12')
  const [formImage, setFormImage] = useState('')
  const [formTags, setFormTags] = useState('')

  const allCategories = ['All', ...Array.from(new Set([...PRESET_CATEGORIES, ...items.map((i) => i.category)]))]

  const toggle = (item) => {
    onSave(items.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i)))
  }

  const removeItem = (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the menu?`)) {
      onSave(items.filter((i) => i.id !== id))
    }
  }

  const openAddModal = () => {
    setEditingId(null)
    setFormName('')
    setFormPriceNpr('')
    setFormCategory('Mains')
    setFormDesc('')
    setFormPrep('10')
    setFormImage(PRESET_IMAGES[0].url)
    setFormTags('New')
    setModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditingId(item.id)
    setFormName(item.name)
    setFormPriceNpr(String(item.pricePaisa / 100))
    setFormCategory(item.category)
    setFormDesc(item.description)
    setFormPrep(String(item.prep))
    setFormImage(item.image)
    setFormTags(item.tags.join(', '))
    setModalOpen(true)
  }

  const handleSaveModal = () => {
    if (!formName.trim()) return
    const priceNpr = Number(formPriceNpr)
    const pricePaisa = Number.isFinite(priceNpr) && priceNpr > 0 ? Math.round(priceNpr * 100) : 100000
    const prep = Number(formPrep) || 10
    const tags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    if (editingId !== null) {
      // Update
      onSave(
        items.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: formName.trim(),
                pricePaisa,
                category: formCategory,
                description: formDesc.trim() || 'Freshly crafted in our kitchen.',
                prep,
                image: formImage.trim() || item.image,
                tags,
              }
            : item,
        ),
      )
    } else {
      // Create
      const newItem = {
        id: Date.now(),
        name: formName.trim(),
        pricePaisa,
        category: formCategory,
        description: formDesc.trim() || 'Freshly crafted in our kitchen.',
        prep,
        image: formImage.trim() || PRESET_IMAGES[0].url,
        available: true,
        tags: tags.length ? tags : ['New'],
      }
      onSave([...items, newItem])
    }

    setModalOpen(false)
  }

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'available' && !item.available) return false
    if (statusFilter === 'hidden' && item.available) return false
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="page">
      <PageTitle
        eyebrow={error ? `Notice: ${error}` : `Menu management · ${items.length} items`}
        title="Menu & Dishes"
        action={
          <button className="primary-button" onClick={openAddModal} disabled={saving}>
            ＋ Add dish
          </button>
        }
      />

      <div className="menu-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="filter-tabs">
            <button
              className={statusFilter === 'all' ? 'selected' : ''}
              type="button"
              onClick={() => setStatusFilter('all')}
            >
              All items ({items.length})
            </button>
            <button
              className={statusFilter === 'available' ? 'selected' : ''}
              type="button"
              onClick={() => setStatusFilter('available')}
            >
              Available ({items.filter((i) => i.available).length})
            </button>
            <button
              className={statusFilter === 'hidden' ? 'selected' : ''}
              type="button"
              onClick={() => setStatusFilter('hidden')}
            >
              Hidden ({items.filter((i) => !i.available).length})
            </button>
          </div>

          <div className="quick-add">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dish, ingredient, tag…"
              aria-label="Filter menu items"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '16px',
                fontSize: '0.8rem',
                fontWeight: selectedCategory === cat ? 700 : 500,
                background: selectedCategory === cat ? 'var(--green)' : 'var(--paper)',
                color: selectedCategory === cat ? 'white' : 'var(--muted)',
                border: '1px solid var(--line)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Edit / Add Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
              <div>
                <h2>{editingId !== null ? 'Edit Menu Dish' : 'Add New Dish'}</h2>
                <p>Changes will be saved and visible to customers on next refresh</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', fontSize: '1.25rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '0.85rem', marginTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <label>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Dish Name *
                  </span>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Truffle eggs on toast"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)' }}
                    required
                  />
                </label>
                <label>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Price (NPR) *
                  </span>
                  <input
                    value={formPriceNpr}
                    onChange={(e) => setFormPriceNpr(e.target.value)}
                    placeholder="e.g. 1400"
                    type="number"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)' }}
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Category
                  </span>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)' }}
                  >
                    {PRESET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Prep time (minutes)
                  </span>
                  <input
                    value={formPrep}
                    onChange={(e) => setFormPrep(e.target.value)}
                    placeholder="12"
                    type="number"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)' }}
                  />
                </label>
              </div>

              <label>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Description
                </span>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Appetizing description of ingredients, culinary style, and taste profile…"
                  rows={3}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)', fontFamily: 'inherit' }}
                />
              </label>

              <label>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Tags (comma-separated)
                </span>
                <input
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. Popular, Vegetarian, Chef pick"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)' }}
                />
              </label>

              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Dish Photo
                </span>
                <input
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="Paste image URL…"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)', marginBottom: '0.5rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                  Or select a preset curated photo:
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => setFormImage(img.url)}
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: formImage === img.url ? 'var(--green)' : '#f1f5f9',
                        color: formImage === img.url ? 'white' : '#334155',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
              <button className="secondary-button" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleSaveModal} disabled={!formName.trim()}>
                {editingId !== null ? 'Save Changes' : 'Add to Menu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dishes List */}
      <div className="menu-list">
        {filteredItems.map((item) => (
          <article className="menu-row" key={item.id}>
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px' }}
                onError={(e) => {
                  e.target.src =
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80'
                }}
              />
            ) : (
              <div className="img-placeholder" />
            )}
            <div className="menu-info">
              <div>
                <h2>{item.name}</h2>
                {item.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <p>{item.description}</p>
              <small>
                {item.category} · {item.prep} min prep
              </small>
            </div>
            <strong>{formatPaisa(item.pricePaisa)}</strong>

            <button
              type="button"
              className="secondary-button"
              onClick={() => openEditModal(item)}
              aria-label={`Edit ${item.name}`}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              Edit ✎
            </button>

            <button
              type="button"
              className={item.available ? 'toggle on' : 'toggle'}
              onClick={() => toggle(item)}
              aria-label={`${item.available ? 'Hide' : 'Show'} ${item.name}`}
            >
              {item.available ? 'Available' : 'Hidden'}
            </button>

            <button
              type="button"
              className="icon-button"
              onClick={() => removeItem(item.id, item.name)}
              title="Delete item"
              aria-label={`Delete ${item.name}`}
              style={{ color: '#ef4444', marginLeft: '0.25rem', fontSize: '1.1rem' }}
            >
              ✕
            </button>
          </article>
        ))}

        {filteredItems.length === 0 && (
          <p className="empty-note" style={{ padding: '3rem 0' }}>
            No dishes found matching your search or filters.
          </p>
        )}
      </div>
    </div>
  )
}

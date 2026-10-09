import { useState } from 'react'
import PageTitle from './PageTitle'
import { API_URL } from '../lib/api'
import { DEFAULT_MENU, DEFAULT_ORDERS } from '../lib/mockData'

export default function SettingsView({
  onDataReset,
}) {
  const [restaurantName, setRestaurantName] = useState(() => {
    return localStorage.getItem('sprig_restaurant_name') || 'Moss & Ember'
  })
  const [tagline, setTagline] = useState(() => {
    return (
      localStorage.getItem('sprig_restaurant_tagline') ||
      'Seasonal plates, artisan brews, good company.'
    )
  })
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('sprig_kitchen_sound') !== 'false'
  })
  const [savedNotice, setSavedNotice] = useState(false)

  const handleSaveProfile = (e) => {
    e.preventDefault()
    localStorage.setItem('sprig_restaurant_name', restaurantName.trim() || 'Moss & Ember')
    localStorage.setItem('sprig_restaurant_tagline', tagline.trim())
    localStorage.setItem('sprig_kitchen_sound', String(soundEnabled))
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  const handleResetData = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all data? This will restore the default menu and sample orders.',
      )
    ) {
      localStorage.setItem('sprig_restaurant_menu', JSON.stringify(DEFAULT_MENU))
      localStorage.setItem('sprig_restaurant_orders', JSON.stringify(DEFAULT_ORDERS))
      localStorage.removeItem('sprig_restaurant_tables')
      onDataReset()
      alert('Default menu and sample orders have been restored.')
      window.location.reload()
    }
  }

  return (
    <div className="page">
      <PageTitle eyebrow="Configuration" title="System Settings" />

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
        {savedNotice && (
          <div
            style={{
              background: '#dcfce7',
              color: '#166534',
              border: '1px solid #bbf7d0',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            ✓ Settings saved successfully.
          </div>
        )}

        {/* Restaurant Profile */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Restaurant Profile</h2>
              <p>Branding displayed on customer menus and table placards</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Restaurant Name
              </span>
              <input
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)' }}
              />
            </label>

            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Tagline &amp; Welcome Message
              </span>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                Enable audio chime alert for new incoming kitchen orders
              </span>
            </label>

            <div style={{ marginTop: '0.5rem' }}>
              <button className="primary-button" type="submit">
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>

        {/* Deployment & Diagnostic Information */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Network &amp; Deployment Info</h2>
              <p>Configuration for testing with actual mobile phones on local Wi-Fi</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--muted)' }}>Active API URL:</span>
              <code>{API_URL}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--muted)' }}>QR Code Target URL:</span>
              <code>{import.meta.env.VITE_PUBLIC_URL || window.location.origin}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--muted)' }}>Currency Mode:</span>
              <span>NPR (Nepalese Rupee, paisa integers)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ color: 'var(--muted)' }}>Storage Engine:</span>
              <span>Hybrid (Real HTTP API + Persistent Client Fallback)</span>
            </div>
          </div>
        </div>

        {/* Danger / Demo Tools */}
        <div className="panel" style={{ border: '1px solid #fecaca' }}>
          <div className="panel-heading">
            <div>
              <h2 style={{ color: '#991b1b' }}>Demo &amp; Testing Tools</h2>
              <p>Restore clean sample orders and dishes for presentations</p>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong>Reset to Factory Sample Data</strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                Overwrites current local orders and dishes with the original high-quality demo set.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={handleResetData}
              style={{
                color: '#991b1b',
                background: '#fef2f2',
                borderColor: '#fca5a5',
              }}
            >
              Reset Sample Data ↺
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

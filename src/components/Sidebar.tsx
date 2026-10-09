const NAV_ICONS = ['⌂', '▤', '◈', '⌗', '◉', '◒']

export default function Sidebar({
  view,
  onNavigate,
  pendingCount,
}) {
  const entries: ('Overview' | 'Orders' | 'Menu' | 'Tables & QR' | 'Kitchen' | 'Reports')[] = [
    'Overview',
    'Orders',
    'Menu',
    'Tables & QR',
    'Kitchen',
    'Reports',
  ]

  const restaurantName = localStorage.getItem('sprig_restaurant_name') || 'Moss & Ember'

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">s</span>
        <span>sprig<span className="brand-dot">.</span></span>
      </div>
      <div className="restaurant-switch">
        <span className="avatar">M</span>
        <span>
          <b>{restaurantName}</b>
          <small>Restaurant account</small>
        </span>
        <span className="chevron">⌄</span>
      </div>
      <nav>
        {entries.map((entry, index) => (
          <button
            className={view === entry ? 'nav-item active' : 'nav-item'}
            onClick={() => onNavigate(entry)}
            key={entry}
            type="button"
          >
            <span className="nav-icon">{NAV_ICONS[index]}</span>
            {entry}
            {entry === 'Orders' && pendingCount > 0 && <i>{pendingCount}</i>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button
          className={view === 'Settings' ? 'nav-item active' : 'nav-item'}
          onClick={() => onNavigate('Settings')}
          type="button"
        >
          <span className="nav-icon">⚙</span>Settings
        </button>
        <div className="profile">
          <span className="avatar dark">JD</span>
          <span>
            <b>Jordan Davis</b>
            <small>Owner</small>
          </span>
          <span>•••</span>
        </div>
      </div>
    </aside>
  )
}
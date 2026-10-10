const NAV_ICONS = ['⌂', '▤', '◈', '⌗', '◉', '🛎️', '◒']

export default function Sidebar({
  view,
  onNavigate,
  pendingCount,
  activeKitchenCount = 0,
  pendingServiceCount = 0,
}: {
  view: string
  onNavigate: (view: any) => void
  pendingCount: number
  activeKitchenCount?: number
  pendingServiceCount?: number
}) {
  const entries: ('Overview' | 'Orders' | 'Menu' | 'Tables & QR' | 'Kitchen' | 'Service Requests' | 'Reports')[] = [
    'Overview',
    'Orders',
    'Menu',
    'Tables & QR',
    'Kitchen',
    'Service Requests',
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
        {entries.map((entry, index) => {
          const isActive =
            view === entry ||
            (entry === 'Kitchen' && (view === 'Kitchen' || view === 'Kitchen Monitor'))

          return (
            <button
              className={isActive ? 'nav-item active' : 'nav-item'}
              onClick={() => onNavigate(entry)}
              key={entry}
              type="button"
            >
              <span className="nav-icon">{NAV_ICONS[index]}</span>
              {entry}
              {entry === 'Orders' && pendingCount > 0 && <i>{pendingCount}</i>}
              {entry === 'Kitchen' && activeKitchenCount > 0 && (
                <i style={{ background: '#ea580c' }} title={`${activeKitchenCount} active kitchen orders`}>
                  {activeKitchenCount}
                </i>
              )}
              {entry === 'Service Requests' && pendingServiceCount > 0 && (
                <i style={{ background: '#f59e0b', color: 'white' }} title={`${pendingServiceCount} pending waiter calls`}>
                  {pendingServiceCount}
                </i>
              )}
            </button>
          )
        })}
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
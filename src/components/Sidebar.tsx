export type View = 'Overview' | 'Orders' | 'Menu' | 'Tables & QR' | 'Kitchen' | 'Reports'

const NAV_ICONS = ['⌂', '▤', '◈', '⌗', '◉', '◒'] as const

export default function Sidebar({
  view,
  onNavigate,
  pendingCount,
}: {
  view: View
  onNavigate: (view: View) => void
  pendingCount: number
}) {
  const entries: View[] = ['Overview', 'Orders', 'Menu', 'Tables & QR', 'Kitchen', 'Reports']
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">s</span>
        <span>sprig<span className="brand-dot">.</span></span>
      </div>
      <div className="restaurant-switch">
        <span className="avatar">M</span>
        <span>
          <b>Moss &amp; Ember</b>
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
          >
            <span className="nav-icon">{NAV_ICONS[index]}</span>
            {entry}
            {entry === 'Orders' && pendingCount > 0 && <i>{pendingCount}</i>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" aria-disabled>
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
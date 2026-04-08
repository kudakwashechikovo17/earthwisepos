import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { formatDate, formatTime } from '../../lib/formatters'

export default function Header({ title, onMenuClick, children }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="page-header">
      <button className="btn btn-ghost btn-icon" onClick={onMenuClick} style={{ display:'none' }} id="mobile-menu-btn">
        <Menu size={20} />
      </button>
      <h1 className="page-header-title">{title}</h1>
      {children}
      <div className="page-header-right">
        <div className="datetime-chip">
          {formatDate(now.toISOString())} &nbsp;·&nbsp; {formatTime(now.toISOString())}
        </div>
      </div>
    </header>
  )
}

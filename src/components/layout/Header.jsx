import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { formatDate, formatTime } from '../../lib/formatters'
import { useOutletContext } from 'react-router-dom'

export default function Header({ title, children }) {
  const [now, setNow] = useState(new Date())
  const ctx = useOutletContext()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="page-header">
      <button className="btn btn-ghost btn-icon mobile-menu-btn" onClick={ctx?.toggleMobile}>
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

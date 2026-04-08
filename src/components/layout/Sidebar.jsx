import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Receipt,
  History, BarChart2, Settings, LogOut, Beef
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/pos',      icon: ShoppingCart,    label: 'POS / Sales',    always: true  },
  { to: '/dashboard',icon: LayoutDashboard, label: 'Dashboard',      adminOnly: false },
  { to: '/products', icon: Package,         label: 'Products',       adminOnly: false },
  { to: '/expenses', icon: Receipt,         label: 'Expenses',       adminOnly: false },
  { to: '/history',  icon: History,         label: 'Sales History',  adminOnly: false },
  { to: '/stock',    icon: BarChart2,       label: 'Stock',          adminOnly: false },
  { to: '/settings', icon: Settings,        label: 'Settings',       adminOnly: true  },
]

export default function Sidebar({ isOpen, onClose }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? ' open' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar${isOpen ? ' open' : ' collapsed'}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Beef size={20} />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">Earthwise</span>
            <span className="sidebar-logo-sub">Butcher POS</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Menu</span>
          {NAV_ITEMS.map(({ to, icon: Icon, label, adminOnly }) => {
            if (adminOnly && profile?.role !== 'admin') return null
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <Icon size={17} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.full_name || 'User'}</div>
              <div className="sidebar-user-role">{profile?.role || 'cashier'}</div>
            </div>
            <button
              className="btn btn-ghost btn-icon"
              onClick={handleLogout}
              title="Log out"
              style={{ color: 'rgba(255,255,255,0.5)', padding: '6px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

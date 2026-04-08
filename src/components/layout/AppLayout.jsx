import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:'16px' }}>
        <div className="spinner" style={{ borderColor:'rgba(45,90,45,0.3)', borderTopColor:'var(--color-primary)', width:'36px', height:'36px', borderWidth:'3px' }} />
        <p style={{ color:'var(--color-text-muted)', fontSize:'0.875rem' }}>Loading Earthwise POS…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Outlet context={{ toggleMobile: () => setSidebarOpen(o => !o) }} />
      </div>
    </div>
  )
}

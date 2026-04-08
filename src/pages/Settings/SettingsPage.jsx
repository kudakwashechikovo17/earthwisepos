import { useState } from 'react'
import { Save, Download, Upload } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { seedAll } from '../../lib/seedData'
import Header from '../../components/layout/Header'

export default function SettingsPage() {
  const { profile, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [shopName, setShopName]       = useState(localStorage.getItem('shopName') || 'Earthwise Butcher')
  const [receiptFooter, setFooter]    = useState(localStorage.getItem('receiptFooter') || 'Thank you for your purchase!')
  const [stockEnabled, setStock]      = useState(localStorage.getItem('stockEnabled') !== 'false')
  const [seeding, setSeeding]         = useState(false)

  const saveSettings = () => {
    localStorage.setItem('shopName', shopName)
    localStorage.setItem('receiptFooter', receiptFooter)
    localStorage.setItem('stockEnabled', String(stockEnabled))
    addToast('Settings saved!', 'success')
  }

  const runSeed = async () => {
    setSeeding(true)
    addToast('Seeding sample data…', 'info')
    await seedAll()
    addToast('Sample data added! Reload the app.', 'success')
    setSeeding(false)
  }

  const handleExport = async () => {
    const { data: products }  = await supabase.from('products').select('*')
    const { data: sales }     = await supabase.from('sales').select('*')
    const { data: sale_items }= await supabase.from('sale_items').select('*')
    const { data: expenses }  = await supabase.from('expenses').select('*')
    const backup = { products, sales, sale_items, expenses, exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`earthwise-backup-${new Date().toISOString().slice(0,10)}.json`; a.click()
    addToast('Backup downloaded!', 'success')
  }

  return (
    <>
      <Header title="Settings" />
      <div className="page-content" style={{ maxWidth: 680 }}>
        <h2 className="page-title">Settings</h2>
        <p className="page-sub">Configure your POS system</p>

        {/* General Settings */}
        <div className="card" style={{ marginBottom:'var(--space-5)' }}>
          <div className="card-header"><span className="card-title">🏪 General</span></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Shop Name</label>
              <input className="form-control" value={shopName} onChange={e=>setShopName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <input className="form-control" value="RWF — Rwandan Franc" disabled style={{ background:'var(--color-bg)', color:'var(--color-text-muted)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Receipt Footer Text</label>
              <input className="form-control" value={receiptFooter} onChange={e=>setFooter(e.target.value)} placeholder="e.g. Thank you!" />
            </div>
            <div className="form-group">
              <label className="toggle-switch">
                <input type="checkbox" checked={stockEnabled} onChange={e=>setStock(e.target.checked)} />
                <span className="toggle-track" />
                <span className="toggle-label">Enable stock tracking</span>
              </label>
            </div>
            <button className="btn btn-primary" onClick={saveSettings}>
              <Save size={14} /> Save Settings
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div className="card" style={{ marginBottom:'var(--space-5)' }}>
          <div className="card-header"><span className="card-title">👤 Account</span></div>
          <div className="card-body">
            <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', fontSize:'var(--font-size-sm)' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--color-text-muted)' }}>Name</span>
                <strong>{profile?.full_name}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--color-text-muted)' }}>Role</span>
                <span className={`badge ${profile?.role === 'admin' ? 'badge-primary' : 'badge-blue'}`}>{profile?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        {isAdmin && (
          <div className="card" style={{ marginBottom:'var(--space-5)' }}>
            <div className="card-header"><span className="card-title">💾 Data Management</span></div>
            <div className="card-body">
              <p style={{ fontSize:'var(--font-size-sm)', color:'var(--color-text-muted)', marginBottom:'var(--space-4)' }}>
                Export your data as a JSON backup. You can also seed the system with sample products and expenses to get started quickly.
              </p>
              <div style={{ display:'flex', gap:'var(--space-3)', flexWrap:'wrap' }}>
                <button className="btn btn-outline" onClick={handleExport}>
                  <Download size={14} /> Export Backup (JSON)
                </button>
                <button className="btn btn-amber" onClick={runSeed} disabled={seeding}>
                  {seeding ? <><div className="spinner" /> Seeding…</> : <><Upload size={14} /> Seed Sample Data</>}
                </button>
              </div>
              <div style={{ marginTop:'var(--space-4)', padding:'var(--space-3)', background:'var(--color-amber-subtle)', borderRadius:'var(--radius)', fontSize:'var(--font-size-xs)', color:'var(--color-amber-dark)', border:'1px solid #fde68a' }}>
                ⚠️ <strong>Seed data</strong> will add sample products and expenses. Only run this once on a fresh system.
              </div>
            </div>
          </div>
        )}

        {/* Supabase Connection Status */}
        <div className="card">
          <div className="card-header"><span className="card-title">🔗 Database</span></div>
          <div className="card-body">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'var(--font-size-sm)', color:'var(--color-text-muted)' }}>Supabase Connection</span>
              <span className={`badge ${import.meta.env.VITE_SUPABASE_URL ? 'badge-green' : 'badge-red'}`}>
                {import.meta.env.VITE_SUPABASE_URL ? '✓ Configured' : '✗ Not configured'}
              </span>
            </div>
            {!import.meta.env.VITE_SUPABASE_URL && (
              <div style={{ marginTop:'var(--space-3)', fontSize:'var(--font-size-xs)', color:'var(--color-text-muted)' }}>
                Add your Supabase URL and anon key to a <code>.env</code> file — see <code>.env.example</code> for the format.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

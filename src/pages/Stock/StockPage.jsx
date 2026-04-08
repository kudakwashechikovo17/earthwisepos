import { useState, useEffect } from 'react'
import { Plus, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatRWF, formatDate, todayISO } from '../../lib/formatters'
import Header from '../../components/layout/Header'

const EMPTY_FORM = { product_id: '', quantity_added: '', cost_total: '', supplier: '', purchase_date: todayISO() }
const LOW_STOCK_THRESHOLD = 5

export default function StockPage() {
  const { isAdmin } = useAuth()
  const { addToast } = useToast()

  const [products, setProducts]     = useState([])
  const [stockLevels, setStockLevels] = useState({}) // product_id => qty
  const [movements, setMovements]   = useState([])
  const [panel, setPanel]           = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [loading, setLoading]       = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: prods } = await supabase.from('products').select('id,name,category,unit_type').eq('is_active',true).order('name')
    setProducts(prods || [])

    const { data: mvts } = await supabase.from('stock_movements').select('*').order('created_at',{ ascending:false }).limit(50)
    setMovements(mvts || [])

    // Compute levels: sum ins - sum outs
    const levels = {}
    ;(prods || []).forEach(p => { levels[p.id] = 0 })
    ;(mvts || []).forEach(m => {
      if (!levels[m.product_id] && levels[m.product_id] !== 0) levels[m.product_id] = 0
      levels[m.product_id] += m.movement_type === 'in' ? Number(m.quantity) : -Number(m.quantity)
    })
    setStockLevels(levels)
    setLoading(false)
  }

  const addStock = async () => {
    if (!form.product_id || !form.quantity_added) { addToast('Select a product and quantity', 'error'); return }
    setSaving(true)
    const qty = parseFloat(form.quantity_added)

    // Insert stock entry
    const timestamp = new Date(form.purchase_date).toISOString()
    await supabase.from('stock_entries').insert({
      product_id: form.product_id,
      quantity_added: qty,
      cost_total: form.cost_total ? parseFloat(form.cost_total) : null,
      supplier: form.supplier || null,
      purchase_date: form.purchase_date,
      created_at: timestamp,
    })

    // Insert movement
    await supabase.from('stock_movements').insert({
      product_id: form.product_id,
      movement_type: 'in',
      quantity: qty,
      reference_type: 'purchase',
      created_at: timestamp,
    })

    addToast('Stock added successfully!', 'success')
    setPanel(false)
    setForm(EMPTY_FORM)
    fetchAll()
    setSaving(false)
  }

  const field = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const getProduct = (id) => products.find(p => p.id === id)

  return (
    <>
      <Header title="Stock" />
      <div className="page-content">
        <div className="section-header">
          <div>
            <h2 className="page-title">Stock</h2>
            <p className="page-sub">Track your inventory levels</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setPanel(true)}>
              <Plus size={15} /> Add Stock
            </button>
          )}
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ borderTopColor:'var(--color-primary)', borderColor:'var(--color-border)', width:32, height:32, borderWidth:3 }} /></div>
        ) : (
          <>
            {/* Low stock warnings */}
            {products.some(p => (stockLevels[p.id] || 0) < LOW_STOCK_THRESHOLD) && (
              <div style={{ background:'var(--color-amber-subtle)', border:'1px solid var(--color-amber-light)', borderRadius:'var(--radius)', padding:'var(--space-3) var(--space-4)', marginBottom:'var(--space-4)', display:'flex', gap:'var(--space-3)', alignItems:'center' }}>
                <AlertTriangle size={18} color="var(--color-amber)" />
                <div>
                  <strong>Low stock alert:</strong>{' '}
                  {products.filter(p => (stockLevels[p.id] || 0) < LOW_STOCK_THRESHOLD).map(p => p.name).join(', ')}
                </div>
              </div>
            )}

            {/* Stock table */}
            <div className="table-wrapper" style={{ marginBottom:'var(--space-6)' }}>
              <table className="table">
                <thead>
                  <tr><th>Product</th><th>Category</th><th>Unit</th><th>Current Stock</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const qty = +(stockLevels[p.id] || 0).toFixed(2)
                    const isLow = qty < LOW_STOCK_THRESHOLD
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight:600 }}>{p.name}</td>
                        <td><span className="badge badge-grey">{p.category}</span></td>
                        <td>{p.unit_type}</td>
                        <td style={{ fontWeight:700, color: isLow ? 'var(--color-red)' : 'var(--color-text)' }}>
                          {qty} {p.unit_type}
                        </td>
                        <td>
                          {qty <= 0 ? (
                            <span className="badge badge-red">Out of Stock</span>
                          ) : isLow ? (
                            <span className="badge badge-amber">⚠ Low Stock</span>
                          ) : (
                            <span className="badge badge-green">In Stock</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Recent movements */}
            <div className="section-title" style={{ marginBottom:'var(--space-3)' }}>Recent Stock Movements</div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Product</th><th>Type</th><th>Quantity</th><th>Reference</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign:'center', padding:'var(--space-8)', color:'var(--color-text-muted)' }}>No movements yet</td></tr>
                  ) : movements.map(m => {
                    const prod = getProduct(m.product_id)
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight:600 }}>{prod?.name || 'Unknown'}</td>
                        <td>
                          <span className={`badge ${m.movement_type === 'in' ? 'badge-green' : 'badge-red'}`}>
                            {m.movement_type === 'in' ? '↑ In' : '↓ Out'}
                          </span>
                        </td>
                        <td style={{ fontWeight:700 }}>{m.quantity} {prod?.unit_type || ''}</td>
                        <td style={{ color:'var(--color-text-muted)', textTransform:'capitalize' }}>{m.reference_type || '—'}</td>
                        <td>{formatDate(m.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Add Stock Panel ── */}
      {panel && (
        <>
          <div className="slide-panel-overlay" onClick={() => setPanel(false)} />
          <div className="slide-panel">
            <div className="slide-panel-header">
              <span className="slide-panel-title">Add Stock</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setPanel(false)}><X size={18} /></button>
            </div>
            <div className="slide-panel-body">
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select className="form-control" value={form.product_id} onChange={e=>field('product_id',e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity Added *</label>
                  <input className="form-control" type="number" value={form.quantity_added} onChange={e=>field('quantity_added',e.target.value)} placeholder="e.g. 10" />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Cost (RWF)</label>
                  <input className="form-control" type="number" value={form.cost_total} onChange={e=>field('cost_total',e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <input className="form-control" value={form.supplier} onChange={e=>field('supplier',e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Date</label>
                <input className="form-control" type="date" value={form.purchase_date} onChange={e=>field('purchase_date',e.target.value)} />
              </div>
            </div>
            <div className="slide-panel-footer">
              <button className="btn btn-outline" style={{ flex:1 }} onClick={() => setPanel(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:2 }} onClick={addStock} disabled={saving}>
                {saving ? <><div className="spinner" /> Adding…</> : 'Add Stock'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

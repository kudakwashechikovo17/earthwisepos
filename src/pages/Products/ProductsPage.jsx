import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, X, Package, ToggleLeft, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatRWF, getCategoryColor } from '../../lib/formatters'
import Header from '../../components/layout/Header'

const CATEGORIES = ['Chicken', 'Beef', 'Goat', 'Offal', 'Packaged', 'Other']
const UNITS = ['kg', 'piece']

const EMPTY_FORM = {
  name: '', category: 'Chicken', unit_type: 'kg',
  selling_price: '', cost_price: '', description: '',
  is_active: true, is_quick_product: false, image_url: '',
}

export default function ProductsPage() {
  const { isAdmin } = useAuth()
  const { addToast } = useToast()

  const [products, setProducts]   = useState([])
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [loading, setLoading]     = useState(true)
  const [panel, setPanel]         = useState(false)
  const [editing, setEditing]     = useState(null) // product id
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('category').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setPanel(true) }
  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id); setPanel(true) }
  const closePanel = () => { setPanel(false); setEditing(null) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.selling_price) { addToast('Name and selling price are required', 'error'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      category: form.category,
      unit_type: form.unit_type,
      selling_price: parseFloat(form.selling_price),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      description: form.description || null,
      is_active: form.is_active,
      is_quick_product: form.is_quick_product,
      image_url: form.image_url || null,
    }

    let error
    if (editing) {
      ;({ error } = await supabase.from('products').update(payload).eq('id', editing))
    } else {
      ;({ error } = await supabase.from('products').insert(payload))
    }

    if (error) { addToast('Error: ' + error.message, 'error') }
    else { addToast(editing ? 'Product updated!' : 'Product added!', 'success'); closePanel(); fetchProducts() }
    setSaving(false)
  }

  const toggleActive = async (p) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
    addToast(p.is_active ? 'Product deactivated' : 'Product activated', 'info')
  }

  const toggleQuick = async (p) => {
    await supabase.from('products').update({ is_quick_product: !p.is_quick_product }).eq('id', p.id)
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_quick_product: !x.is_quick_product } : x))
  }

  const filtered = products.filter(p => {
    const matchCat = catFilter === 'All' || p.category === catFilter
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const field = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImg(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    // Upload image to 'product-images' bucket
    const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file)
    
    if (uploadError) {
      addToast('Image upload failed: ' + uploadError.message, 'error')
      setUploadingImg(false)
      return
    }
    
    // Get the public URL for the uploaded image
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
    field('image_url', data.publicUrl)
    setUploadingImg(false)
    addToast('Image uploaded successfully!', 'success')
  }

  return (
    <>
      <Header title="Products" />
      <div className="page-content">
        {/* Top bar */}
        <div className="section-header">
          <div>
            <h2 className="page-title">Products</h2>
            <p className="page-sub">{products.filter(p=>p.is_active).length} active products</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={15} /> Add Product
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:'var(--space-3)', marginBottom:'var(--space-5)', flexWrap:'wrap' }}>
          <div className="search-bar" style={{ width:260 }}>
            <Search size={15} />
            <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-tabs">
            {['All', ...CATEGORIES].map(c => (
              <button key={c} className={`filter-tab${catFilter===c?' active':''}`} onClick={() => setCatFilter(c)}>{c}</button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ borderTopColor:'var(--color-primary)', borderColor:'var(--color-border)', width:32, height:32, borderWidth:3 }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Selling Price</th>
                  <th>Cost Price</th>
                  <th>Status</th>
                  <th>Quick</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} style={{ textAlign:'center', padding:'var(--space-10)', color:'var(--color-text-muted)' }}>
                      <Package size={32} style={{ margin:'0 auto var(--space-3)', opacity:0.3 }} />
                      <div>No products found</div>
                    </td>
                  </tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="product-thumb" />
                        ) : (
                          <div className="product-thumb"><Package size={20} /></div>
                        )}
                        <div>
                          <div style={{ fontWeight:600, color:'var(--color-text)' }}>{p.name}</div>
                          {p.description && <div style={{ fontSize:'0.75rem', color:'var(--color-text-muted)' }}>{p.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: getCategoryColor(p.category)+'22', color: getCategoryColor(p.category) }}>
                        {p.category}
                      </span>
                    </td>
                    <td style={{ textTransform:'uppercase', fontWeight:600 }}>{p.unit_type}</td>
                    <td style={{ fontWeight:700, color:'var(--color-primary)' }}>{formatRWF(p.selling_price)}</td>
                    <td style={{ color:'var(--color-text-muted)' }}>{p.cost_price ? formatRWF(p.cost_price) : '—'}</td>
                    <td>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={p.is_active} onChange={() => isAdmin && toggleActive(p)} disabled={!isAdmin} />
                        <span className="toggle-track" />
                        <span className="toggle-label">{p.is_active ? 'Active' : 'Off'}</span>
                      </label>
                    </td>
                    <td>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={p.is_quick_product} onChange={() => isAdmin && toggleQuick(p)} disabled={!isAdmin} />
                        <span className="toggle-track" />
                      </label>
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide Panel ── */}
      {panel && (
        <>
          <div className="slide-panel-overlay" onClick={closePanel} />
          <div className="slide-panel">
            <div className="slide-panel-header">
              <span className="slide-panel-title">{editing ? 'Edit Product' : 'Add New Product'}</span>
              <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={18} /></button>
            </div>
            <div className="slide-panel-body">
              <div style={{ marginBottom:'var(--space-4)', display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--space-2)' }}>
                {form.image_url ? (
                  <img src={form.image_url} alt="Preview" style={{ width:120, height:120, objectFit:'cover', borderRadius:'var(--radius-md)', border:'1px solid var(--color-border)' }} />
                ) : (
                  <div style={{ width:120, height:120, borderRadius:'var(--radius-md)', background:'var(--color-bg)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed var(--color-border-light)', color:'var(--color-text-muted)' }}>
                    <Package size={32} />
                  </div>
                )}
                <div style={{ position:'relative', overflow:'hidden', display:'inline-block' }}>
                  <button className="btn btn-outline btn-sm" disabled={uploadingImg}>
                    {uploadingImg ? 'Uploading...' : form.image_url ? 'Change Image' : 'Upload Image'}
                  </button>
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} style={{ position:'absolute', top:0, left:0, opacity:0, cursor:'pointer', height:'100%', width:'100%' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-control" value={form.name} onChange={e=>field('name',e.target.value)} placeholder="e.g. Chicken Breast" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-control" value={form.category} onChange={e=>field('category',e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Type *</label>
                  <select className="form-control" value={form.unit_type} onChange={e=>field('unit_type',e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Selling Price (RWF) *</label>
                  <input className="form-control" type="number" value={form.selling_price} onChange={e=>field('selling_price',e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost Price (RWF)</label>
                  <input className="form-control" type="number" value={form.cost_price} onChange={e=>field('cost_price',e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" value={form.description} onChange={e=>field('description',e.target.value)} placeholder="Optional description…" rows={2} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)', marginTop:'var(--space-2)' }}>
                <label className="toggle-switch">
                  <input type="checkbox" checked={form.is_active} onChange={e=>field('is_active',e.target.checked)} />
                  <span className="toggle-track" />
                  <span className="toggle-label">Active (visible on POS)</span>
                </label>
                <label className="toggle-switch">
                  <input type="checkbox" checked={form.is_quick_product} onChange={e=>field('is_quick_product',e.target.checked)} />
                  <span className="toggle-track" />
                  <span className="toggle-label">⭐ Quick product (appears first)</span>
                </label>
              </div>
            </div>
            <div className="slide-panel-footer">
              <button className="btn btn-outline" style={{ flex:1 }} onClick={closePanel} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:2 }} onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner"/> Saving…</> : editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

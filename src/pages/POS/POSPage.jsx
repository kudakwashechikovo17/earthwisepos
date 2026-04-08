import { useState, useEffect, useRef } from 'react'
import { Search, X, ShoppingCart, Trash2, Plus, Minus, ChevronDown, Printer, Pause, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatRWF, generateSaleNumber, formatDateTime, getCategoryColor } from '../../lib/formatters'
import Header from '../../components/layout/Header'

const CATEGORIES = ['All', 'Chicken', 'Beef', 'Goat', 'Offal', 'Packaged', 'Other']

export default function POSPage() {
  const { profile, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [products, setProducts]         = useState([])
  const [search, setSearch]             = useState('')
  const [category, setCategory]         = useState('All')
  const [cart, setCart]                 = useState([])
  const [note, setNote]                 = useState('')
  const [loading, setLoading]           = useState(true)

  // Quantity modal
  const [qtyModal, setQtyModal]         = useState(null) // { product }
  const [qtyValue, setQtyValue]         = useState('1')
  const [firstPress, setFirstPress]     = useState(true)
  const [overridePrice, setOverridePrice] = useState('')

  // Payment modal
  const [payModal, setPayModal]         = useState(false)
  const [payMethod, setPayMethod]       = useState('cash')
  const [saving, setSaving]             = useState(false)
  const [customDate, setCustomDate]     = useState('')

  // Receipt modal
  const [receiptModal, setReceiptModal] = useState(null) // completed sale

  // Held sales
  const [heldSales, setHeldSales]       = useState([])
  const [showHeld, setShowHeld]         = useState(false)

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('is_quick_product', { ascending: false })
      .order('name')
    setProducts(data || [])
    setLoading(false)
  }

  // Filtered products
  const filtered = products.filter(p => {
    const matchCat = category === 'All' || p.category === category
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Open quantity modal
  const openQtyModal = (product) => {
    setQtyValue('1')
    setFirstPress(true)
    setOverridePrice(product.selling_price.toString())
    setQtyModal(product)
  }

  // Numpad logic
  const numpadPress = (val) => {
    if (val === 'del') { 
      setQtyValue(prev => prev.length > 1 ? prev.slice(0,-1) : '')
      setFirstPress(false)
      return 
    }
    if (val === '.' && qtyValue.includes('.')) return
    
    if (firstPress) {
      setQtyValue(val === '.' ? '0.' : val)
      setFirstPress(false)
    } else {
      setQtyValue(prev => prev + val)
    }
  }

  const confirmQty = () => {
    const qty = parseFloat(qtyValue || '0')
    const unitPrice = parseFloat(overridePrice)
    if (!qty || qty <= 0) { addToast('Enter a valid quantity', 'error'); return }
    if (isNaN(unitPrice) || unitPrice < 0) { addToast('Enter a valid price', 'error'); return }
    const product = qtyModal
    setCart(prev => {
      // Find existing item with the EXACT same price
      const existing = prev.find(i => i.product_id === product.id && i.unit_price === unitPrice)
      if (existing) {
        return prev.map(i => i.product_id === product.id && i.unit_price === unitPrice
          ? { ...i, quantity: i.quantity + qty, subtotal: (i.quantity + qty) * i.unit_price }
          : i)
      }
      return [...prev, {
        product_id: product.id,
        product_name_snapshot: product.name,
        category: product.category,
        unit_type: product.unit_type,
        quantity: qty,
        unit_price: unitPrice,
        subtotal: qty * unitPrice,
      }]
    })
    setQtyModal(null)
  }

  // Remove from cart
  const removeItem = (productId) => setCart(prev => prev.filter(i => i.product_id !== productId))

  // Update quantity inline
  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i
      const newQty = Math.max(0.1, +(i.quantity + delta).toFixed(2))
      return { ...i, quantity: newQty, subtotal: newQty * i.unit_price }
    }))
  }

  const clearCart = () => { setCart([]); setNote('') }

  const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0)
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  // Hold sale
  const holdSale = () => {
    if (cart.length === 0) return
    const held = { id: Date.now(), items: cart, note, heldAt: new Date().toISOString() }
    setHeldSales(prev => [...prev, held])
    clearCart()
    addToast('Sale held successfully', 'info')
  }

  // Resume held sale
  const resumeHeld = (held) => {
    setCart(held.items)
    setNote(held.note || '')
    setHeldSales(prev => prev.filter(h => h.id !== held.id))
    setShowHeld(false)
  }

  // Complete sale
  const completeSale = async () => {
    if (cart.length === 0) return
    setSaving(true)
    const saleNumber = generateSaleNumber()
    
    let createdAt = new Date().toISOString()
    if (isAdmin && customDate) {
      createdAt = new Date(customDate).toISOString()
    }

    const { data: sale, error } = await supabase.from('sales').insert({
      sale_number: saleNumber,
      cashier_id: profile?.id,
      payment_method: payMethod,
      subtotal: cartTotal,
      total_amount: cartTotal,
      notes: note,
      status: 'completed',
      created_at: createdAt
    }).select().single()

    if (error) { addToast('Error saving sale: ' + error.message, 'error'); setSaving(false); return }

    const items = cart.map(i => ({
      sale_id: sale.id,
      product_id: i.product_id,
      product_name_snapshot: i.product_name_snapshot,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
      created_at: createdAt
    }))
    await supabase.from('sale_items').insert(items)

    // Stock deduction
    for (const item of cart) {
      await supabase.from('stock_movements').insert({
        product_id: item.product_id,
        movement_type: 'out',
        quantity: item.quantity,
        reference_type: 'sale',
        reference_id: sale.id,
        created_at: createdAt
      })
    }

    const fullSale = {
      ...sale,
      items: cart,
      cashier_name: profile?.full_name || 'Cashier',
    }
    setReceiptModal(fullSale)
    clearCart()
    setSaving(false)
    setPayModal(false)
    addToast('Sale completed! ✓', 'success')
  }

  return (
    <>
      <Header title="POS / Sales">
        {heldSales.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => setShowHeld(true)}>
            <Pause size={14} />
            Held ({heldSales.length})
          </button>
        )}
      </Header>

      <div className="pos-layout">
        {/* ── LEFT: Products ── */}
        <div className="pos-products">
          {/* Toolbar */}
          <div className="pos-toolbar">
            <div className="search-bar" style={{ maxWidth: '100%' }}>
              <Search size={16} />
              <input
                placeholder="Search products…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, color:'var(--color-text-subtle)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="pos-categories">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`cat-btn${category === cat ? ' active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ borderTopColor:'var(--color-primary)', borderColor:'var(--color-border)', width:32, height:32, borderWidth:3 }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={40} />
              <h3>No products found</h3>
              <p>Try a different category or search term</p>
            </div>
          ) : (
            <div className="pos-grid">
              {filtered.map(product => (
                <button
                  key={product.id}
                  className={`product-card${product.is_quick_product ? ' quick' : ''}`}
                  onClick={() => openQtyModal(product)}
                >
                  {product.image_url && (
                    <div className="product-card-img-wrapper">
                      <img src={product.image_url} alt={product.name} className="product-card-img" />
                    </div>
                  )}
                  <div className="product-card-content">
                    <span
                      className="product-card-category"
                      style={{ color: getCategoryColor(product.category) }}
                    >
                      {product.category}
                    </span>
                    <span className="product-card-name">{product.name}</span>
                    <span className="product-card-price">
                      {formatRWF(product.selling_price)}
                      <span className="product-card-unit" style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> / {product.unit_type}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Cart ── */}
        <div className="cart-panel">
          <div className="cart-header">
            <span className="cart-title">
              <ShoppingCart size={18} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
              Current Sale
              {cart.length > 0 && <span className="badge badge-primary" style={{ marginLeft:8 }}>{cart.length}</span>}
            </span>
            {cart.length > 0 && (
              <button className="btn btn-ghost btn-sm btn-icon" onClick={clearCart} title="Clear cart">
                <Trash2 size={15} style={{ color:'var(--color-red)' }} />
              </button>
            )}
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <ShoppingCart size={40} />
                <p>Tap a product to add it</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product_id} className="cart-item">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.product_name_snapshot}</div>
                    <div className="cart-item-detail" style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                      <button
                        onClick={() => updateQty(item.product_id, -0.5)}
                        style={{ width:22, height:22, borderRadius:'50%', background:'var(--color-bg)', border:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
                      >
                        <Minus size={11} />
                      </button>
                      <span style={{ fontWeight:700, color:'var(--color-text)', minWidth:32, textAlign:'center' }}>
                        {item.quantity} {item.unit_type}
                      </span>
                      <button
                        onClick={() => updateQty(item.product_id, 0.5)}
                        style={{ width:22, height:22, borderRadius:'50%', background:'var(--color-bg)', border:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
                      >
                        <Plus size={11} />
                      </button>
                      <span style={{ color:'var(--color-text-muted)', fontSize:'0.75rem' }}>
                        @ {formatRWF(item.unit_price)}/{item.unit_type}
                      </span>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <span className="cart-item-subtotal">{formatRWF(item.subtotal)}</span>
                    <button className="cart-item-remove" onClick={() => removeItem(item.product_id)}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Note field */}
            {cart.length > 0 && (
              <div style={{ padding:'var(--space-2) var(--space-1)', marginTop:'var(--space-2)' }}>
                <input
                  className="form-control"
                  style={{ fontSize:'0.8125rem' }}
                  placeholder="Add a note (optional)…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="cart-footer">
            <div className="cart-total-section">
              <div className="cart-total-row">
                <span>Items</span>
                <span>{itemCount > 0 ? `${+itemCount.toFixed(2)} units` : '—'}</span>
              </div>
              <div className="cart-total-big">
                <span className="cart-total-label">TOTAL</span>
                <span className="cart-total-amount">{formatRWF(cartTotal)}</span>
              </div>
            </div>

            {/* Hold sale button */}
            {cart.length > 0 && (
              <button className="btn btn-outline btn-block btn-sm" onClick={holdSale} style={{ marginBottom:'var(--space-2)' }}>
                <Pause size={13} /> Hold Sale
              </button>
            )}

            {/* Payment buttons */}
            <div className="payment-buttons">
              <button
                className="pay-btn pay-btn-cash"
                disabled={cart.length === 0}
                onClick={() => { setPayMethod('cash'); setCustomDate(''); setPayModal(true) }}
              >
                <span style={{ fontSize:'1.25rem' }}>💵</span>
                <span>CASH</span>
                <span className="pay-btn-label">Pay with Cash</span>
              </button>
              <button
                className="pay-btn pay-btn-momo"
                disabled={cart.length === 0}
                onClick={() => { setPayMethod('momo'); setCustomDate(''); setPayModal(true) }}
              >
                <span style={{ fontSize:'1.25rem' }}>📱</span>
                <span>MoMo</span>
                <span className="pay-btn-label">Mobile Money</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quantity Modal ── */}
      {qtyModal && (
        <div className="modal-overlay" onClick={() => setQtyModal(null)}>
          <div className="modal qty-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add to Cart</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setQtyModal(null)}><X size={18} /></button>
            </div>
            <div className="qty-display">
              <div className="qty-product-name">{qtyModal.name}</div>
              <div className="qty-price-override">
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 600 }}>RWF</span>
                <input
                  className="qty-price-input"
                  value={overridePrice}
                  onChange={e => setOverridePrice(e.target.value.replace(/[^0-9.]/g,''))}
                  type="text"
                />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>/ {qtyModal.unit_type}</span>
              </div>
              <input
                className="qty-input-large"
                value={qtyValue}
                onChange={e => {
                  setQtyValue(e.target.value.replace(/[^0-9.]/g,''))
                  setFirstPress(false)
                }}
                inputMode="decimal"
                type="text"
              />
              <div className="qty-subtotal">
                {formatRWF(parseFloat(qtyValue || '0') * (parseFloat(overridePrice) || 0))}
              </div>
            </div>
            {/* Numpad */}
            <div className="numpad">
              {['1','2','3','4','5','6','7','8','9','.','0','del'].map(k => (
                <button
                  key={k}
                  className={`numpad-btn${k === 'del' ? ' numpad-btn-del' : ''}`}
                  onClick={() => numpadPress(k)}
                >
                  {k === 'del' ? '⌫' : k}
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setQtyModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmQty}>
                <Plus size={15} /> Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Confirm Modal ── */}
      {payModal && (
        <div className="modal-overlay" onClick={() => setPayModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Confirm Payment</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setPayModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ textAlign:'center', paddingTop:'var(--space-8)' }}>
              <div style={{ fontSize:'1rem', color:'var(--color-text-muted)', marginBottom:'var(--space-2)' }}>
                {payMethod === 'cash' ? '💵 Cash Payment' : '📱 Mobile Money (MoMo)'}
              </div>
              <div style={{ fontSize:'2.5rem', fontWeight:800, color:'var(--color-primary)', marginBottom:'var(--space-4)' }}>
                {formatRWF(cartTotal)}
              </div>
              <div style={{ fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
                {cart.length} item{cart.length !== 1 ? 's' : ''}
              </div>

              {isAdmin && (
                <div style={{ marginTop: 'var(--space-6)', textAlign: 'left', background: 'var(--color-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius)' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Admin: Backdate Sale (Optional)</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                  />
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Leave blank to log this sale as taking place right now.</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPayModal(false)} disabled={saving}>Cancel</button>
              <button
                className={`btn btn-${payMethod === 'cash' ? 'green' : 'amber'}`}
                onClick={completeSale}
                disabled={saving}
              >
                {saving ? <><div className="spinner" /> Processing…</> : '✓ Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Held Sales Panel ── */}
      {showHeld && (
        <div className="modal-overlay" onClick={() => setShowHeld(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Held Sales ({heldSales.length})</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowHeld(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding:0 }}>
              {heldSales.map(h => (
                <div key={h.id} style={{ padding:'var(--space-4)', borderBottom:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{h.items.length} items — {formatRWF(h.items.reduce((s,i)=>s+i.subtotal,0))}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--color-text-muted)' }}>{new Date(h.heldAt).toLocaleTimeString()}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => resumeHeld(h)}>Resume</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {receiptModal && (
        <div className="modal-overlay" onClick={() => setReceiptModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ color:'var(--color-green)' }}>✓ Sale Complete!</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setReceiptModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* Receipt Content */}
              <div style={{ fontFamily:'monospace', borderRadius:'var(--radius)', background:'#f9fafb', padding:'var(--space-5)', fontSize:'0.8125rem' }}>
                <div style={{ textAlign:'center', marginBottom:12 }}>
                  <div style={{ fontWeight:800, fontSize:'1rem' }}>🥩 Earthwise Butcher</div>
                  <div style={{ color:'var(--color-text-muted)', fontSize:'0.75rem' }}>Kigali, Rwanda</div>
                  <div style={{ borderTop:'1px dashed #ccc', margin:'8px 0' }} />
                  <div style={{ fontSize:'0.75rem', color:'var(--color-text-muted)' }}>
                    {formatDateTime(receiptModal.created_at)} | #{receiptModal.sale_number}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--color-text-muted)' }}>
                    Cashier: {receiptModal.cashier_name}
                  </div>
                </div>
                <div style={{ borderTop:'1px dashed #ccc', marginBottom:8 }} />
                {receiptModal.items.map((item, idx) => (
                  <div key={idx} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span>{item.product_name_snapshot}</span>
                    <span>{item.quantity}{item.unit_type} × {formatRWF(item.unit_price)}</span>
                  </div>
                ))}
                <div style={{ borderTop:'1px dashed #ccc', margin:'8px 0' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:'1rem' }}>
                  <span>TOTAL</span>
                  <span>{formatRWF(receiptModal.total_amount)}</span>
                </div>
                <div style={{ textAlign:'center', marginTop:12, fontSize:'0.75rem', color:'var(--color-text-muted)' }}>
                  Payment: {receiptModal.payment_method === 'cash' ? '💵 Cash' : '📱 MoMo'}
                </div>
                <div style={{ textAlign:'center', marginTop:8, fontSize:'0.75rem', color:'var(--color-text-muted)' }}>
                  Thank you for your purchase!
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => window.print()}>
                <Printer size={14} /> Print
              </button>
              <button className="btn btn-green" onClick={() => setReceiptModal(null)}>
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

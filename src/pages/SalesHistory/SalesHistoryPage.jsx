import { useState, useEffect } from 'react'
import { X, Eye, History, RefreshCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatRWF, formatDate, formatTime, todayISO, startOfWeek, startOfMonth } from '../../lib/formatters'
import Header from '../../components/layout/Header'

const PERIODS = [
  { label:'Today',      value:'today'  },
  { label:'This Week',  value:'week'   },
  { label:'This Month', value:'month'  },
  { label:'All Time',   value:'all'    },
]

export default function SalesHistoryPage() {
  const { isAdmin, profile } = useAuth()
  const { addToast } = useToast()

  const [sales, setSales]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [period, setPeriod]       = useState('month')
  const [payFilter, setPayFilter] = useState('all')
  const [detail, setDetail]       = useState(null) // selected sale
  const [items, setItems]         = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => { fetchSales() }, [period, payFilter])

  const fetchSales = async () => {
    setLoading(true)
    let query = supabase.from('sales').select('*').eq('status','completed').order('created_at',{ascending:false})

    const todayStr = todayISO()
    const weekStr  = new Date(startOfWeek()).toISOString().slice(0,10)
    const monthStr = new Date(startOfMonth()).toISOString().slice(0,10)

    if (period === 'today') query = query.gte('created_at', `${todayStr}T00:00:00`).lte('created_at',`${todayStr}T23:59:59`)
    else if (period === 'week')  query = query.gte('created_at', `${weekStr}T00:00:00`)
    else if (period === 'month') query = query.gte('created_at', `${monthStr}T00:00:00`)

    if (payFilter !== 'all') query = query.eq('payment_method', payFilter)

    const { data } = await query
    setSales(data || [])
    setLoading(false)
  }

  const openDetail = async (sale) => {
    setDetail(sale)
    setLoadingDetail(true)
    const { data } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id)
    setItems(data || [])
    setLoadingDetail(false)
  }

  const markRefunded = async (saleId) => {
    await supabase.from('sales').update({ status:'refunded' }).eq('id', saleId)
    setSales(prev => prev.filter(s => s.id !== saleId))
    setDetail(null)
    addToast('Sale marked as refunded', 'warning')
  }

  const totalSales = sales.reduce((s, x) => s + Number(x.total_amount), 0)

  // Fetch cashier name from profile cache (simplified)
  const getCashierLabel = (sale) => sale.cashier_id ? `Cashier` : 'Unknown'

  return (
    <>
      <Header title="Sales History" />
      <div className="page-content">
        <div className="section-header">
          <div>
            <h2 className="page-title">Sales History</h2>
            <p className="page-sub">{sales.length} sales — {formatRWF(totalSales)} total</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:'var(--space-3)', marginBottom:'var(--space-5)', flexWrap:'wrap', alignItems:'center' }}>
          <div className="filter-tabs">
            {PERIODS.map(p => (
              <button key={p.value} className={`filter-tab${period===p.value?' active':''}`} onClick={() => setPeriod(p.value)}>{p.label}</button>
            ))}
          </div>
          <div className="filter-tabs">
            {[{label:'All Methods',value:'all'},{label:'💵 Cash',value:'cash'},{label:'📱 MoMo',value:'momo'}].map(p => (
              <button key={p.value} className={`filter-tab${payFilter===p.value?' active':''}`} onClick={() => setPayFilter(p.value)}>{p.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ borderTopColor:'var(--color-primary)', borderColor:'var(--color-border)', width:32, height:32, borderWidth:3 }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table table-click">
              <thead>
                <tr>
                  <th>Sale #</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign:'center', padding:'var(--space-10)', color:'var(--color-text-muted)' }}>
                      <History size={32} style={{ margin:'0 auto var(--space-3)', opacity:0.3 }} />
                      <div>No sales found for this period</div>
                    </td>
                  </tr>
                ) : sales.map(sale => (
                  <tr key={sale.id} onClick={() => openDetail(sale)}>
                    <td style={{ fontWeight:700, color:'var(--color-text)', fontFamily:'monospace' }}>{sale.sale_number}</td>
                    <td>{formatDate(sale.created_at)}</td>
                    <td style={{ color:'var(--color-text-muted)' }}>{formatTime(sale.created_at)}</td>
                    <td>
                      <span className={`badge ${sale.payment_method==='cash'?'badge-green':'badge-amber'}`}>
                        {sale.payment_method === 'cash' ? '💵 Cash' : '📱 MoMo'}
                      </span>
                    </td>
                    <td style={{ fontWeight:800, color:'var(--color-primary)', fontSize:'0.9375rem' }}>{formatRWF(sale.total_amount)}</td>
                    <td style={{ color:'var(--color-text-muted)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sale.notes || '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={e=>{ e.stopPropagation(); openDetail(sale) }}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Sale Detail Modal ── */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Sale #{detail.sale_number}</div>
                <div style={{ fontSize:'0.8125rem', color:'var(--color-text-muted)', marginTop:2 }}>
                  {formatDate(detail.created_at)} at {formatTime(detail.created_at)}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span className={`badge ${detail.payment_method==='cash'?'badge-green':'badge-amber'}`}>
                  {detail.payment_method === 'cash' ? '💵 Cash' : '📱 MoMo'}
                </span>
                <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body">
              {loadingDetail ? (
                <div style={{ textAlign:'center', padding:'var(--space-8)' }}>
                  <div className="spinner" style={{ borderTopColor:'var(--color-primary)', borderColor:'var(--color-border)', width:28, height:28, borderWidth:3, margin:'0 auto' }} />
                </div>
              ) : (
                <>
                  <div className="table-wrapper" style={{ marginBottom:'var(--space-4)' }}>
                    <table className="table">
                      <thead>
                        <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id}>
                            <td style={{ fontWeight:600 }}>{item.product_name_snapshot}</td>
                            <td>{item.quantity}</td>
                            <td>{formatRWF(item.unit_price)}</td>
                            <td style={{ fontWeight:700 }}>{formatRWF(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8, alignItems:'center', padding:'var(--space-2) 0' }}>
                    <span style={{ fontWeight:700, fontSize:'1rem' }}>TOTAL</span>
                    <span style={{ fontWeight:800, fontSize:'1.5rem', color:'var(--color-primary)' }}>{formatRWF(detail.total_amount)}</span>
                  </div>
                  {detail.notes && (
                    <div style={{ marginTop:'var(--space-3)', background:'var(--color-bg)', borderRadius:'var(--radius)', padding:'var(--space-3)', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
                      📝 Note: {detail.notes}
                    </div>
                  )}
                </>
              )}
            </div>
            {isAdmin && (
              <div className="modal-footer">
                <button className="btn btn-outline" style={{ color:'var(--color-red)', borderColor:'var(--color-red)' }} onClick={() => markRefunded(detail.id)}>
                  <RefreshCcw size={13} /> Mark as Refunded
                </button>
                <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

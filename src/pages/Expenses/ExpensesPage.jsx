import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Trash2, Filter, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatRWF, formatDate, todayISO, startOfDay, endOfDay, startOfWeek, startOfMonth } from '../../lib/formatters'
import Header from '../../components/layout/Header'

const EXP_CATEGORIES = [
  'Stock Purchase','Rent','Salaries','Utilities','Water','Electricity',
  'Transport','Packaging','Cleaning','Maintenance','Marketing','Other'
]

const PERIODS = [
  { label:'Today',      value:'today' },
  { label:'This Week',  value:'week'  },
  { label:'This Month', value:'month' },
  { label:'All Time',   value:'all'   },
]

const EMPTY_FORM = {
  expense_date: todayISO(), category: 'Stock Purchase', description: '',
  amount: '', payment_method: 'cash', vendor: '',
}

export default function ExpensesPage() {
  const { isAdmin, profile } = useAuth()
  const { addToast } = useToast()

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState('month')
  const [panel, setPanel]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchExpenses() }, [period])

  const fetchExpenses = async () => {
    setLoading(true)
    let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false })

    const now = new Date()
    if (period === 'today') { query = query.gte('expense_date', todayISO()).lte('expense_date', todayISO()) }
    else if (period === 'week') { query = query.gte('expense_date', new Date(startOfWeek()).toISOString().slice(0,10)) }
    else if (period === 'month') { query = query.gte('expense_date', new Date(startOfMonth()).toISOString().slice(0,10)) }

    const { data } = await query
    setExpenses(data || [])
    setLoading(false)
  }

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setPanel(true) }
  const openEdit = (e) => { setForm({ ...e }); setEditing(e.id); setPanel(true) }
  const closePanel = () => { setPanel(false); setEditing(null) }

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) { addToast('Description and amount are required', 'error'); return }
    setSaving(true)
    const payload = {
      expense_date: form.expense_date,
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      payment_method: form.payment_method,
      vendor: form.vendor || null,
      created_by: profile?.id,
    }
    let error
    if (editing) {
      ;({ error } = await supabase.from('expenses').update(payload).eq('id', editing))
    } else {
      ;({ error } = await supabase.from('expenses').insert(payload))
    }
    if (error) { addToast('Error: ' + error.message, 'error') }
    else { addToast(editing ? 'Expense updated!' : 'Expense added!', 'success'); closePanel(); fetchExpenses() }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    addToast('Expense deleted', 'info')
    setDeleting(null)
  }

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const field = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const catColors = {
    'Stock Purchase': 'badge-red', Rent: 'badge-amber', Salaries: 'badge-blue',
    Utilities: 'badge-grey', Water: 'badge-blue', Electricity: 'badge-amber',
    Transport: 'badge-grey', Packaging: 'badge-green', Cleaning: 'badge-grey',
    Maintenance: 'badge-amber', Marketing: 'badge-primary', Other: 'badge-grey',
  }

  return (
    <>
      <Header title="Expenses" />
      <div className="page-content">
        <div className="section-header">
          <div>
            <h2 className="page-title">Expenses</h2>
            <p className="page-sub">Track all business costs and purchases</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={15} /> Add Expense
            </button>
          )}
        </div>

        {/* Summary + Period filter */}
        <div style={{ display:'flex', gap:'var(--space-4)', marginBottom:'var(--space-5)', flexWrap:'wrap', alignItems:'flex-start' }}>
          <div className="stat-card" style={{ minWidth:220 }}>
            <div className="stat-card-icon stat-icon-red"><Receipt size={18} /></div>
            <div className="stat-card-label">Total Expenses</div>
            <div className="stat-card-value">{formatRWF(totalAmount)}</div>
            <div className="stat-card-sub">{expenses.length} entries — {PERIODS.find(p=>p.value===period)?.label}</div>
          </div>
          <div className="filter-tabs" style={{ alignSelf:'center' }}>
            {PERIODS.map(p => (
              <button key={p.value} className={`filter-tab${period===p.value?' active':''}`} onClick={() => setPeriod(p.value)}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ borderTopColor:'var(--color-primary)', borderColor:'var(--color-border)', width:32, height:32, borderWidth:3 }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} style={{ textAlign:'center', padding:'var(--space-10)', color:'var(--color-text-muted)' }}>
                      <Receipt size={32} style={{ margin:'0 auto var(--space-3)', opacity:0.3 }} />
                      <div>No expenses found for this period</div>
                    </td>
                  </tr>
                ) : expenses.map(e => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace:'nowrap' }}>{formatDate(e.expense_date)}</td>
                    <td><span className={`badge ${catColors[e.category] || 'badge-grey'}`}>{e.category}</span></td>
                    <td style={{ maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</td>
                    <td style={{ color:'var(--color-text-muted)' }}>{e.vendor || '—'}</td>
                    <td>
                      <span className={`badge ${e.payment_method === 'cash' ? 'badge-green' : 'badge-amber'}`}>
                        {e.payment_method === 'cash' ? '💵 Cash' : '📱 MoMo'}
                      </span>
                    </td>
                    <td style={{ fontWeight:700, color:'var(--color-red)', whiteSpace:'nowrap' }}>{formatRWF(e.amount)}</td>
                    {isAdmin && (
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(e)} title="Edit"><Edit2 size={13} /></button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color:'var(--color-red)' }}
                            onClick={() => handleDelete(e.id)}
                            disabled={deleting === e.id}
                            title="Delete"
                          >
                            {deleting === e.id ? <div className="spinner" style={{ width:12, height:12, borderWidth:2 }} /> : <Trash2 size={13} />}
                          </button>
                        </div>
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
              <span className="slide-panel-title">{editing ? 'Edit Expense' : 'Add Expense'}</span>
              <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={18} /></button>
            </div>
            <div className="slide-panel-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="form-control" type="date" value={form.expense_date} onChange={e=>field('expense_date',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-control" value={form.category} onChange={e=>field('category',e.target.value)}>
                    {EXP_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <input className="form-control" value={form.description} onChange={e=>field('description',e.target.value)} placeholder="e.g. Chicken stock from supplier" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (RWF) *</label>
                  <input className="form-control" type="number" value={form.amount} onChange={e=>field('amount',e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-control" value={form.payment_method} onChange={e=>field('payment_method',e.target.value)}>
                    <option value="cash">💵 Cash</option>
                    <option value="momo">📱 Mobile Money</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Supplier / Vendor</label>
                <input className="form-control" value={form.vendor} onChange={e=>field('vendor',e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="slide-panel-footer">
              <button className="btn btn-outline" style={{ flex:1 }} onClick={closePanel} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:2 }} onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" /> Saving…</> : editing ? 'Save Changes' : 'Add Expense'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

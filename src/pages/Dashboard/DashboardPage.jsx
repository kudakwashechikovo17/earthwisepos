import { useState, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, CreditCard } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatRWF, formatDate, todayISO, startOfWeek, startOfMonth } from '../../lib/formatters'
import Header from '../../components/layout/Header'
import { subDays, format, eachDayOfInterval, parseISO } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler)

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
  scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' }, ticks: { callback: v => `${(v/1000).toFixed(0)}k` } } }
}

export default function DashboardPage() {
  const [stats, setStats]         = useState({ todaySales:0, todayExp:0, weekSales:0, weekExp:0, monthSales:0, monthExp:0, todayCount:0, avgSale:0 })
  const [dailyData, setDailyData] = useState([])
  const [topProducts, setTop]     = useState([])
  const [payMethods, setPay]      = useState({ cash:0, momo:0 })
  const [recentSales, setRecent]  = useState([])
  const [loading, setLoading]     = useState(true)
  const [period, setPeriod]       = useState('month')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const now = new Date()
    const todayStr = todayISO()
    const weekStr  = new Date(startOfWeek()).toISOString().slice(0,10)
    const monthStr = new Date(startOfMonth()).toISOString().slice(0,10)

    // Sales aggregations
    const { data: allSales } = await supabase.from('sales').select('total_amount, payment_method, created_at').eq('status','completed')
    const { data: allExp }   = await supabase.from('expenses').select('amount, expense_date')

    const sumSales = (from) => (allSales||[]).filter(s => s.created_at?.slice(0,10) >= from).reduce((a,s)=>a+Number(s.total_amount),0)
    const sumExp   = (from) => (allExp||[]).filter(e => e.expense_date >= from).reduce((a,e)=>a+Number(e.amount),0)

    const todaySales = sumSales(todayStr)
    const todayExp   = sumExp(todayStr)
    const weekSales  = sumSales(weekStr)
    const weekExp    = sumExp(weekStr)
    const monthSales = sumSales(monthStr)
    const monthExp   = sumExp(monthStr)

    const todayTxns = (allSales||[]).filter(s => s.created_at?.slice(0,10) === todayStr)
    const todayCount = todayTxns.length
    const avgSale    = todayCount > 0 ? todaySales / todayCount : 0

    // Payment methods (all time)
    const cash = (allSales||[]).filter(s=>s.payment_method==='cash').reduce((a,s)=>a+Number(s.total_amount),0)
    const momo = (allSales||[]).filter(s=>s.payment_method==='momo').reduce((a,s)=>a+Number(s.total_amount),0)
    setPay({ cash, momo })

    // Daily trend (last 14 days)
    const days = eachDayOfInterval({ start: subDays(now,13), end: now })
    const daily = days.map(d => {
      const key = format(d, 'yyyy-MM-dd')
      const sales = (allSales||[]).filter(s=>s.created_at?.slice(0,10)===key).reduce((a,s)=>a+Number(s.total_amount),0)
      const exp   = (allExp||[]).filter(e=>e.expense_date===key).reduce((a,e)=>a+Number(e.amount),0)
      return { label: format(d,'dd MMM'), sales, exp }
    })
    setDailyData(daily)

    // Best selling products
    const { data: items } = await supabase.from('sale_items').select('product_name_snapshot, quantity, subtotal')
    const grouped = {}
    ;(items||[]).forEach(i => {
      if (!grouped[i.product_name_snapshot]) grouped[i.product_name_snapshot] = { qty:0, revenue:0 }
      grouped[i.product_name_snapshot].qty     += Number(i.quantity)
      grouped[i.product_name_snapshot].revenue += Number(i.subtotal)
    })
    const top = Object.entries(grouped).map(([name,d])=>({ name,...d })).sort((a,b)=>b.revenue-a.revenue).slice(0,6)
    setTop(top)

    // Recent sales
    const { data: recent } = await supabase.from('sales').select('*').eq('status','completed').order('created_at',{ascending:false}).limit(5)
    setRecent(recent||[])

    setStats({ todaySales, todayExp, weekSales, weekExp, monthSales, monthExp, todayCount, avgSale })
    setLoading(false)
  }

  const profit = (s,e) => s - e
  const profClass = (v) => v >= 0 ? 'var(--color-green)' : 'var(--color-red)'

  const StatCard = ({ label, value, sub, iconClass, icon: Icon }) => (
    <div className="stat-card">
      <div className={`stat-card-icon ${iconClass}`}><Icon size={18} /></div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )

  const barData = {
    labels: dailyData.map(d=>d.label),
    datasets: [
      { label:'Sales', data: dailyData.map(d=>d.sales), backgroundColor:'rgba(45,90,45,0.75)', borderRadius:4 },
      { label:'Expenses', data: dailyData.map(d=>d.exp), backgroundColor:'rgba(192,49,43,0.6)', borderRadius:4 },
    ]
  }

  const donutData = {
    labels: ['Cash','MoMo'],
    datasets: [{ data:[payMethods.cash, payMethods.momo], backgroundColor:['#16a34a','#f59e0b'], borderWidth:0, hoverOffset:4 }]
  }

  const topBarData = {
    labels: topProducts.map(p=>p.name.length>14?p.name.slice(0,14)+'…':p.name),
    datasets: [{ data: topProducts.map(p=>p.revenue), backgroundColor:'rgba(45,90,45,0.8)', borderRadius:6 }]
  }

  if (loading) return (
    <>
      <Header title="Dashboard" />
      <div className="page-content empty-state"><div className="spinner" style={{ borderTopColor:'var(--color-primary)', borderColor:'var(--color-border)', width:36, height:36, borderWidth:3 }} /></div>
    </>
  )

  return (
    <>
      <Header title="Dashboard" />
      <div className="page-content">
        <h2 className="page-title">Dashboard</h2>
        <p className="page-sub">Business overview and performance</p>

        {/* Today */}
        <div style={{ marginBottom:'var(--space-3)' }}>
          <div className="section-title" style={{ marginBottom:'var(--space-3)' }}>📅 Today</div>
          <div className="stats-grid-3">
            <StatCard label="Sales Today"    value={formatRWF(stats.todaySales)} sub={`${stats.todayCount} transactions`} iconClass="stat-icon-primary" icon={TrendingUp} />
            <StatCard label="Expenses Today" value={formatRWF(stats.todayExp)}   sub="Total outflow" iconClass="stat-icon-red" icon={TrendingDown} />
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background:'#f0fdf4', color: profClass(profit(stats.todaySales, stats.todayExp)) }}>
                <DollarSign size={18} />
              </div>
              <div className="stat-card-label">Net Profit Today</div>
              <div className="stat-card-value" style={{ color: profClass(profit(stats.todaySales, stats.todayExp)) }}>
                {formatRWF(profit(stats.todaySales, stats.todayExp))}
              </div>
              <div className="stat-card-sub">Avg sale: {formatRWF(stats.avgSale)}</div>
            </div>
          </div>
        </div>

        {/* Week */}
        <div style={{ marginBottom:'var(--space-3)' }}>
          <div className="section-title" style={{ marginBottom:'var(--space-3)' }}>📆 This Week</div>
          <div className="stats-grid-3">
            <StatCard label="Sales This Week"    value={formatRWF(stats.weekSales)} iconClass="stat-icon-primary" icon={TrendingUp} />
            <StatCard label="Expenses This Week" value={formatRWF(stats.weekExp)}   iconClass="stat-icon-red"     icon={TrendingDown} />
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background:'#f0fdf4', color: profClass(profit(stats.weekSales, stats.weekExp)) }}>
                <DollarSign size={18} />
              </div>
              <div className="stat-card-label">Net Profit This Week</div>
              <div className="stat-card-value" style={{ color: profClass(profit(stats.weekSales,stats.weekExp)) }}>
                {formatRWF(profit(stats.weekSales,stats.weekExp))}
              </div>
            </div>
          </div>
        </div>

        {/* Month */}
        <div style={{ marginBottom:'var(--space-6)' }}>
          <div className="section-title" style={{ marginBottom:'var(--space-3)' }}>🗓️ This Month</div>
          <div className="stats-grid-3">
            <StatCard label="Sales This Month"    value={formatRWF(stats.monthSales)} iconClass="stat-icon-primary" icon={TrendingUp} />
            <StatCard label="Expenses This Month" value={formatRWF(stats.monthExp)}   iconClass="stat-icon-red"     icon={TrendingDown} />
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background:'#f0fdf4', color: profClass(profit(stats.monthSales, stats.monthExp)) }}>
                <DollarSign size={18} />
              </div>
              <div className="stat-card-label">Net Profit This Month</div>
              <div className="stat-card-value" style={{ color: profClass(profit(stats.monthSales,stats.monthExp)) }}>
                {formatRWF(profit(stats.monthSales,stats.monthExp))}
              </div>
            </div>
          </div>
        </div>

        {/* Charts row 1 */}
        <div className="charts-grid" style={{ marginBottom:'var(--space-4)' }}>
          {/* Daily Trend */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Sales vs Expenses — Last 14 Days</span>
              <div style={{ display:'flex', gap:12, fontSize:'0.75rem' }}>
                <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'rgba(45,90,45,0.75)', marginRight:4 }} />Sales</span>
                <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'rgba(192,49,43,0.6)', marginRight:4 }} />Expenses</span>
              </div>
            </div>
            <div className="card-body" style={{ height:240 }}>
              <Bar data={barData} options={{ ...CHART_OPTS, plugins:{ ...CHART_OPTS.plugins, legend:{ display:false } } }} />
            </div>
          </div>

          {/* Donut */}
          <div className="card">
            <div className="card-header"><span className="card-title">Payment Methods</span></div>
            <div className="card-body" style={{ height:240, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:160, height:160 }}>
                <Doughnut data={donutData} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ usePointStyle:true, padding:16 } } }, cutout:'68%' }} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:12, width:'100%' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8125rem', padding:'4px 4px' }}>
                  <span>💵 Cash</span><strong>{formatRWF(payMethods.cash)}</strong>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8125rem', padding:'4px' }}>
                  <span>📱 MoMo</span><strong>{formatRWF(payMethods.momo)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="charts-grid-2" style={{ marginBottom:'var(--space-4)' }}>
          {/* Best selling */}
          <div className="card">
            <div className="card-header"><span className="card-title">Best Selling Products</span></div>
            <div className="card-body" style={{ height:220 }}>
              {topProducts.length === 0 ? (
                <div className="empty-state" style={{ padding:'var(--space-6)' }}>No sales data yet</div>
              ) : (
                <Bar data={topBarData} options={{ ...CHART_OPTS, indexAxis:'y', scales:{ x:{ grid:{ color:'#f3f4f6' }, ticks:{ callback: v=>`${(v/1000).toFixed(0)}k` } }, y:{ grid:{ display:false } } } }} />
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="card">
            <div className="card-header"><span className="card-title">Recent Sales</span></div>
            <div style={{ overflowX:'auto' }}>
              {recentSales.length === 0 ? (
                <div className="empty-state" style={{ padding:'var(--space-6)' }}>No sales yet</div>
              ) : (
                <table className="table">
                  <thead><tr><th>Sale #</th><th>Amount</th><th>Method</th></tr></thead>
                  <tbody>
                    {recentSales.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight:600 }}>{s.sale_number}</td>
                        <td style={{ fontWeight:700, color:'var(--color-primary)' }}>{formatRWF(s.total_amount)}</td>
                        <td><span className={`badge ${s.payment_method==='cash'?'badge-green':'badge-amber'}`}>{s.payment_method}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

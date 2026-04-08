/**
 * Format a number as RWF currency
 * e.g. 12500 → "12,500 RWF"
 */
export const formatRWF = (amount) => {
  if (amount === null || amount === undefined) return '0 RWF'
  return `${Number(amount).toLocaleString('en-US')} RWF`
}

/**
 * Format a date string for display
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Generate a sale number  e.g. EW-20260408-0001
 */
export const generateSaleNumber = () => {
  const now = new Date()
  const date = now.toISOString().slice(0,10).replace(/-/g,'')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `EW-${date}-${rand}`
}

/**
 * Today's date as YYYY-MM-DD
 */
export const todayISO = () => new Date().toISOString().slice(0,10)

/**
 * Get start of day ISO string
 */
export const startOfDay = (date = new Date()) => {
  const d = new Date(date)
  d.setHours(0,0,0,0)
  return d.toISOString()
}

export const endOfDay = (date = new Date()) => {
  const d = new Date(date)
  d.setHours(23,59,59,999)
  return d.toISOString()
}

export const startOfWeek = () => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1)
  d.setHours(0,0,0,0)
  return d.toISOString()
}

export const startOfMonth = () => {
  const d = new Date()
  d.setDate(1)
  d.setHours(0,0,0,0)
  return d.toISOString()
}

export const getCategoryColor = (category) => {
  const map = {
    Chicken: '#f59e0b',
    Beef:    '#dc2626',
    Goat:    '#7c3aed',
    Offal:   '#0891b2',
    Packaged:'#059669',
    Other:   '#6b7280',
  }
  return map[category] || '#6b7280'
}

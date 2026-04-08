import { supabase } from './supabase'

/* ============================================================
   SEED DATA — run once to populate Supabase tables
   Call seedAll() from browser console or a seed button
   ============================================================ */

export const SAMPLE_PRODUCTS = [
  { name: 'Whole Chicken',      category: 'Chicken', unit_type: 'kg',    selling_price: 4500, cost_price: 3200, is_active: true, is_quick_product: true  },
  { name: 'Chicken Breast',     category: 'Chicken', unit_type: 'kg',    selling_price: 6500, cost_price: 4800, is_active: true, is_quick_product: true  },
  { name: 'Chicken Drumsticks', category: 'Chicken', unit_type: 'kg',    selling_price: 6500, cost_price: 4500, is_active: true, is_quick_product: false },
  { name: 'Chicken Thighs',     category: 'Chicken', unit_type: 'kg',    selling_price: 6500, cost_price: 4500, is_active: true, is_quick_product: false },
  { name: 'Chicken Wings',      category: 'Chicken', unit_type: 'kg',    selling_price: 5500, cost_price: 3800, is_active: true, is_quick_product: true  },
  { name: 'Chicken Liver',      category: 'Offal',   unit_type: 'kg',    selling_price: 3000, cost_price: 1800, is_active: true, is_quick_product: false },
  { name: 'Chicken Gizzards',   category: 'Offal',   unit_type: 'kg',    selling_price: 4000, cost_price: 2500, is_active: true, is_quick_product: false },
  { name: 'Chicken Bones',      category: 'Chicken', unit_type: 'kg',    selling_price: 3000, cost_price: 1500, is_active: true, is_quick_product: false },
  { name: 'Beef',               category: 'Beef',    unit_type: 'kg',    selling_price: 6000, cost_price: 4200, is_active: true, is_quick_product: true  },
  { name: 'Minced Beef',        category: 'Beef',    unit_type: 'kg',    selling_price: 6500, cost_price: 4500, is_active: true, is_quick_product: true  },
  { name: 'Beef Bones',         category: 'Beef',    unit_type: 'kg',    selling_price: 3500, cost_price: 2000, is_active: true, is_quick_product: false },
  { name: 'Goat Meat',          category: 'Goat',    unit_type: 'kg',    selling_price: 7000, cost_price: 5000, is_active: true, is_quick_product: true  },
]

export const SAMPLE_EXPENSES = [
  { expense_date: new Date(Date.now() - 86400000*0).toISOString().slice(0,10), category: 'Stock Purchase', description: 'Chicken stock from supplier', amount: 150000, payment_method: 'cash',  vendor: 'Kigali Poultry' },
  { expense_date: new Date(Date.now() - 86400000*1).toISOString().slice(0,10), category: 'Transport',      description: 'Delivery pickup',          amount: 5000,   payment_method: 'cash',  vendor: '' },
  { expense_date: new Date(Date.now() - 86400000*3).toISOString().slice(0,10), category: 'Packaging',      description: 'Plastic bags and wraps',   amount: 8000,   payment_method: 'momo',  vendor: 'Shop Plus' },
  { expense_date: new Date(Date.now() - 86400000*5).toISOString().slice(0,10), category: 'Electricity',    description: 'Monthly electricity bill', amount: 25000,  payment_method: 'momo',  vendor: 'REG' },
  { expense_date: new Date(Date.now() - 86400000*7).toISOString().slice(0,10), category: 'Stock Purchase', description: 'Beef stock from farm',     amount: 200000, payment_method: 'cash',  vendor: 'Nyagatare Farm' },
  { expense_date: new Date(Date.now() - 86400000*10).toISOString().slice(0,10), category: 'Rent',          description: 'Monthly shop rent',        amount: 80000,  payment_method: 'momo',  vendor: 'Landlord' },
  { expense_date: new Date(Date.now() - 86400000*12).toISOString().slice(0,10), category: 'Cleaning',      description: 'Cleaning supplies',        amount: 4500,   payment_method: 'cash',  vendor: '' },
  { expense_date: new Date(Date.now() - 86400000*15).toISOString().slice(0,10), category: 'Salaries',      description: 'Staff wages',              amount: 60000,  payment_method: 'momo',  vendor: '' },
]

export async function seedAll() {
  console.log('🌱 Starting seed...')

  // Seed products
  const { error: pErr } = await supabase.from('products').insert(SAMPLE_PRODUCTS)
  if (pErr) console.error('Products seed error:', pErr)
  else console.log('✅ Products seeded')

  // Seed expenses
  const { error: eErr } = await supabase.from('expenses').insert(SAMPLE_EXPENSES)
  if (eErr) console.error('Expenses seed error:', eErr)
  else console.log('✅ Expenses seeded')

  console.log('🌱 Seed complete!')
}

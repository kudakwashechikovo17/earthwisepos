-- ============================================================
-- EARTHWISE BUTCHER POS — Safe Migration (drops old policies first)
-- ============================================================

-- Drop old policies if they exist
drop policy if exists "Users can read own profile"       on public.profiles;
drop policy if exists "Users can update own profile"     on public.profiles;
drop policy if exists "Allow profile insert on signup"   on public.profiles;
drop policy if exists "Authenticated users can read products"    on public.products;
drop policy if exists "Admins can manage products"               on public.products;
drop policy if exists "Authenticated users can read sales"       on public.sales;
drop policy if exists "Authenticated users can insert sales"     on public.sales;
drop policy if exists "Admins can update sales"                  on public.sales;
drop policy if exists "Authenticated users can read sale_items"  on public.sale_items;
drop policy if exists "Authenticated users can insert sale_items" on public.sale_items;
drop policy if exists "Authenticated users can read expenses"    on public.expenses;
drop policy if exists "Authenticated users can insert expenses"  on public.expenses;
drop policy if exists "Admins can update/delete expenses"        on public.expenses;
drop policy if exists "Authenticated users can read stock_entries"  on public.stock_entries;
drop policy if exists "Admins can manage stock_entries"             on public.stock_entries;
drop policy if exists "Authenticated users can read stock_movements"  on public.stock_movements;
drop policy if exists "Authenticated users can insert stock_movements" on public.stock_movements;
drop policy if exists "Users can manage own held_sales" on public.held_sales;

-- 1. Profiles
create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role      text not null default 'cashier' check (role in ('admin','cashier')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read own profile"     on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"   on public.profiles for update using (auth.uid() = id);
create policy "Allow profile insert on signup" on public.profiles for insert with check (auth.uid() = id);

-- 2. Products
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         text not null default 'Other',
  unit_type        text not null default 'kg' check (unit_type in ('kg','piece')),
  selling_price    numeric(12,2) not null default 0,
  cost_price       numeric(12,2),
  description      text,
  is_active        boolean not null default true,
  is_quick_product boolean not null default false,
  created_at       timestamptz default now()
);
alter table public.products enable row level security;
create policy "Authenticated users can read products" on public.products for select to authenticated using (true);
create policy "Admins can manage products" on public.products for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 3. Sales
create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  sale_number    text not null unique,
  cashier_id     uuid references public.profiles(id),
  payment_method text not null default 'cash' check (payment_method in ('cash','momo')),
  subtotal       numeric(12,2) not null default 0,
  total_amount   numeric(12,2) not null default 0,
  notes          text,
  status         text not null default 'completed' check (status in ('completed','refunded','cancelled')),
  created_at     timestamptz default now()
);
alter table public.sales enable row level security;
create policy "Authenticated users can read sales"   on public.sales for select to authenticated using (true);
create policy "Authenticated users can insert sales" on public.sales for insert to authenticated with check (true);
create policy "Admins can update sales" on public.sales for update to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 4. Sale Items
create table if not exists public.sale_items (
  id                    uuid primary key default gen_random_uuid(),
  sale_id               uuid not null references public.sales(id) on delete cascade,
  product_id            uuid references public.products(id),
  product_name_snapshot text not null,
  quantity              numeric(10,3) not null,
  unit_price            numeric(12,2) not null,
  subtotal              numeric(12,2) not null,
  created_at            timestamptz default now()
);
alter table public.sale_items enable row level security;
create policy "Authenticated users can read sale_items"  on public.sale_items for select to authenticated using (true);
create policy "Authenticated users can insert sale_items" on public.sale_items for insert to authenticated with check (true);

-- 5. Expenses
create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  expense_date   date not null default current_date,
  category       text not null default 'Other',
  description    text not null,
  amount         numeric(12,2) not null,
  payment_method text not null default 'cash' check (payment_method in ('cash','momo')),
  vendor         text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz default now()
);
alter table public.expenses enable row level security;
create policy "Authenticated users can read expenses"   on public.expenses for select to authenticated using (true);
create policy "Authenticated users can insert expenses" on public.expenses for insert to authenticated with check (true);
create policy "Admins can update/delete expenses" on public.expenses for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 6. Stock Entries
create table if not exists public.stock_entries (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references public.products(id),
  quantity_added  numeric(10,3) not null,
  cost_total      numeric(12,2),
  supplier        text,
  purchase_date   date not null default current_date,
  created_at      timestamptz default now()
);
alter table public.stock_entries enable row level security;
create policy "Authenticated users can read stock_entries" on public.stock_entries for select to authenticated using (true);
create policy "Admins can manage stock_entries" on public.stock_entries for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 7. Stock Movements
create table if not exists public.stock_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references public.products(id),
  movement_type  text not null check (movement_type in ('in','out')),
  quantity       numeric(10,3) not null,
  reference_type text,
  reference_id   uuid,
  created_at     timestamptz default now()
);
alter table public.stock_movements enable row level security;
create policy "Authenticated users can read stock_movements"  on public.stock_movements for select to authenticated using (true);
create policy "Authenticated users can insert stock_movements" on public.stock_movements for insert to authenticated with check (true);

-- 8. Held Sales
create table if not exists public.held_sales (
  id          uuid primary key default gen_random_uuid(),
  cashier_id  uuid references public.profiles(id),
  cart_data   jsonb not null default '[]',
  label       text,
  created_at  timestamptz default now()
);
alter table public.held_sales enable row level security;
create policy "Users can manage own held_sales" on public.held_sales for all to authenticated using (cashier_id = auth.uid());

-- Auto-create profile on signup trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'cashier'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

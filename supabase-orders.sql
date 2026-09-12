create table if not exists public.orders (
  id text primary key,
  created_at timestamptz not null default now(),
  customer_name text not null,
  phone text not null,
  address text,
  delivery boolean not null default false,
  notes text,
  payment_method text not null check (payment_method in ('cash', 'card')),
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'Received',
  items jsonb not null
);

create index if not exists orders_created_at_idx
on public.orders (created_at);

alter table public.orders enable row level security;

create policy "Anyone can read orders for this demo"
on public.orders for select
using (true);

create policy "Anyone can create orders for this demo"
on public.orders for insert
with check (true);

create policy "Anyone can update orders for this demo"
on public.orders for update
using (true)
with check (true);

create policy "Anyone can delete orders for this demo"
on public.orders for delete
using (true);

create or replace function public.delete_old_orders()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.orders
  where created_at < now() - interval '15 days';
$$;

-- Enable pg_cron under Database > Extensions before running this statement.
select cron.schedule(
  'delete-orders-after-15-days',
  '0 2 * * *',
  $$select public.delete_old_orders();$$
);

-- CIDEX account setup. Run once in Supabase SQL editor (after the profiles and subscribers setup).

-- 1. Home address on profile
alter table public.profiles add column if not exists address text;

-- 2. Orders (team enters and updates; customer reads own rows only)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  details text,
  status text not null default 'received'
    check (status in ('received','in_progress','review','completed','cancelled')),
  amount numeric(12,2),
  currency text not null default 'INR',
  deadline date,
  created_at timestamptz not null default now()
);

-- 3. Transactions and bills
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  kind text not null check (kind in ('invoice','payment','refund')),
  description text,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  status text not null default 'due' check (status in ('due','paid')),
  created_at timestamptz not null default now()
);

-- 4. Mails the customer sent to the team (replied = true once the team answers)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  body text not null,
  replied boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. AI conversations the customer sent to the team. Team-only: customers can write, never read.
create table if not exists public.ai_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assistant text not null check (assistant in ('clow','aetheria')),
  transcript jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.messages enable row level security;
alter table public.ai_history enable row level security;

create policy "own orders read" on public.orders for select using (auth.uid() = user_id);
create policy "own transactions read" on public.transactions for select using (auth.uid() = user_id);
create policy "own messages read" on public.messages for select using (auth.uid() = user_id);
create policy "own messages insert" on public.messages for insert with check (auth.uid() = user_id);
create policy "own ai history insert" on public.ai_history for insert with check (auth.uid() = user_id);
-- No select policy on ai_history: customers cannot read it back.

grant select on public.orders, public.transactions to authenticated;
grant select, insert on public.messages to authenticated;
grant insert on public.ai_history to authenticated;

-- 6. Delete my data: profile details, messages and AI history. Orders and invoices are kept (tax records).
create or replace function public.delete_my_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.profiles where id = auth.uid();
  delete from public.messages where user_id = auth.uid();
  delete from public.ai_history where user_id = auth.uid();
  delete from public.subscribers where user_id = auth.uid();
end; $$;

-- 7. Delete my account: the same as above plus the sign-in. Orders and invoices stay with user_id cleared.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform public.delete_my_data();
  delete from auth.users where id = auth.uid();
end; $$;

revoke all on function public.delete_my_data() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- Free website check: one row per check. Only the Worker (service key) and the team can read or write it.
create table if not exists public.audit_requests (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  host text not null,
  name text,
  email text not null,
  score integer not null check (score between 0 and 100),
  result jsonb not null,
  ip_hash text not null,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists audit_requests_ip_idx on public.audit_requests (ip_hash, created_at);
create index if not exists audit_requests_host_idx on public.audit_requests (host, created_at);
create index if not exists audit_requests_email_idx on public.audit_requests (email, created_at);

alter table public.audit_requests enable row level security;
-- No policies and no grants for customers. The service role needs explicit table privileges.
grant select, insert, update on public.audit_requests to service_role;

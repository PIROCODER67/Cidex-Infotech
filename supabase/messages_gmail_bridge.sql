-- Run once after account_setup.sql. Links customer messages to Gmail replies.

-- Short reference shown in the email subject, for example [CID-1a2b3c4d5e]
alter table public.messages add column if not exists ref text generated always as (left(id::text, 10)) stored;
create unique index if not exists messages_ref_key on public.messages (ref);

-- Whether the team has been emailed about this message yet
alter table public.messages add column if not exists notified boolean not null default false;

-- Messages that already exist were sent before the bridge: do not email the team about them again
update public.messages set notified = true where notified = false;

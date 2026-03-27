-- Phase 7: Notifications table
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications (user_id);
create index idx_notifications_unread on notifications (user_id, read) where read = false;

alter table notifications enable row level security;

create policy "Allow all authenticated access" on notifications
  for all to authenticated using (true) with check (true);
create policy "Allow anon access" on notifications
  for all to anon using (true) with check (true);

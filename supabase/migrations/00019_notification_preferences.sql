-- Phase 14: Notification preferences and email tracking

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade unique,
  on_task_assigned boolean not null default true,
  on_task_starting boolean not null default true,
  on_task_due boolean not null default true,
  on_comment_mention boolean not null default true,
  email_on_task_assigned boolean not null default true,
  email_on_task_starting boolean not null default true,
  email_on_task_due boolean not null default true,
  email_on_comment_mention boolean not null default true
);

alter table notification_preferences enable row level security;
create policy "Allow all authenticated access" on notification_preferences
  for all to authenticated using (true) with check (true);
create policy "Allow anon access" on notification_preferences
  for all to anon using (true) with check (true);

-- Track which date notifications have been sent per task
alter table tasks add column if not exists notifications_sent jsonb default '{}';

-- Slack webhook URL on users
alter table users add column if not exists slack_webhook_url text;

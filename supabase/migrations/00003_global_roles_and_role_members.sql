-- Phase 3: Make roles workspace-global (remove workflow_id), add role_members table

-- Drop the workflow FK and index from roles
alter table roles drop constraint if exists roles_workflow_id_fkey;
drop index if exists idx_roles_workflow;
alter table roles drop column if exists workflow_id;

-- Add created_at to roles
alter table roles add column if not exists created_at timestamptz not null default now();

-- ============================================================
-- role_members — pool of people qualified to fill each role
-- ============================================================
create table role_members (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  unique (role_id, user_id)
);

create index idx_role_members_role on role_members (role_id);
create index idx_role_members_user on role_members (user_id);

-- RLS
alter table role_members enable row level security;

create policy "Allow all authenticated access" on role_members
  for all to authenticated using (true) with check (true);
create policy "Allow anon access" on role_members
  for all to anon using (true) with check (true);

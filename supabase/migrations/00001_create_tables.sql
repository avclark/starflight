-- Phase 1: Foundation — All tables from the PRD data model
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- users
-- ============================================================
create table users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- shows
-- ============================================================
create table shows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_shows_status on shows (status);

-- ============================================================
-- show_setting_definitions
-- ============================================================
create table show_setting_definitions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  field_type text not null check (field_type in ('yes_no', 'text', 'textarea', 'checklist')),
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- show_setting_values
-- ============================================================
create table show_setting_values (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows (id) on delete cascade,
  setting_definition_id uuid not null references show_setting_definitions (id) on delete cascade,
  value_json jsonb,
  updated_at timestamptz not null default now(),
  unique (show_id, setting_definition_id)
);

create index idx_show_setting_values_show on show_setting_values (show_id);

-- ============================================================
-- processes (created before workflows because workflows FK → processes)
-- ============================================================
create table processes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- workflows
-- ============================================================
create table workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  item_label text not null default 'Episode',
  process_id uuid references processes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_workflows_process on workflows (process_id);

-- ============================================================
-- roles
-- ============================================================
create table roles (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows (id) on delete cascade,
  name text not null,
  display_order int not null default 0
);

create index idx_roles_workflow on roles (workflow_id);

-- ============================================================
-- show_role_assignments
-- ============================================================
create table show_role_assignments (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows (id) on delete cascade,
  role_id uuid not null references roles (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  unique (show_id, role_id)
);

create index idx_show_role_assignments_show on show_role_assignments (show_id);

-- ============================================================
-- task_templates
-- ============================================================
create table task_templates (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references processes (id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  assignment_mode text not null default 'none' check (assignment_mode in ('role', 'user', 'none')),
  assigned_role_id uuid references roles (id) on delete set null,
  assigned_user_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_task_templates_process on task_templates (process_id);
create index idx_task_templates_position on task_templates (process_id, position);

-- ============================================================
-- task_template_blocks
-- ============================================================
create table task_template_blocks (
  id uuid primary key default gen_random_uuid(),
  task_template_id uuid not null references task_templates (id) on delete cascade,
  block_type text not null check (block_type in (
    'description', 'text_input', 'rich_text', 'dropdown', 'radio',
    'checkbox', 'file_attachment', 'date_time', 'heading', 'todo_list'
  )),
  label text not null,
  required boolean not null default false,
  options_json jsonb,
  display_order int not null default 0
);

create index idx_task_template_blocks_template on task_template_blocks (task_template_id);

-- ============================================================
-- task_template_visibility_rules
-- ============================================================
create table task_template_visibility_rules (
  id uuid primary key default gen_random_uuid(),
  task_template_id uuid not null references task_templates (id) on delete cascade,
  name text not null,
  setting_definition_id uuid not null references show_setting_definitions (id) on delete cascade,
  operator text not null check (operator in ('must_contain', 'must_not_contain', 'must_not_be_empty', 'must_be_empty')),
  target_value text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_visibility_rules_template on task_template_visibility_rules (task_template_id);

-- ============================================================
-- task_template_dependencies
-- ============================================================
create table task_template_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_template_id uuid not null references task_templates (id) on delete cascade,
  depends_on_task_template_id uuid not null references task_templates (id) on delete cascade,
  condition_type text not null default 'completed' check (condition_type in ('completed'))
);

create index idx_dependencies_template on task_template_dependencies (task_template_id);
create index idx_dependencies_depends_on on task_template_dependencies (depends_on_task_template_id);

-- ============================================================
-- task_template_date_rules
-- ============================================================
create table task_template_date_rules (
  id uuid primary key default gen_random_uuid(),
  task_template_id uuid not null references task_templates (id) on delete cascade,
  date_field text not null check (date_field in ('start_date', 'due_date')),
  relative_to text not null check (relative_to in ('task_start', 'task_due', 'episode_start')),
  relative_task_template_id uuid references task_templates (id) on delete set null,
  offset_days int not null default 0,
  offset_hours int not null default 0
);

create index idx_date_rules_template on task_template_date_rules (task_template_id);

-- ============================================================
-- task_template_email_templates
-- ============================================================
create table task_template_email_templates (
  id uuid primary key default gen_random_uuid(),
  task_template_id uuid not null references task_templates (id) on delete cascade,
  from_name text not null,
  subject_template text not null,
  body_template text not null,
  auto_send_on_complete boolean not null default false
);

create index idx_email_templates_template on task_template_email_templates (task_template_id);

-- ============================================================
-- task_template_completion_actions
-- ============================================================
create table task_template_completion_actions (
  id uuid primary key default gen_random_uuid(),
  task_template_id uuid not null references task_templates (id) on delete cascade,
  action_type text not null check (action_type in (
    'send_notification', 'send_email', 'add_tag', 'remove_tag', 'send_webhook'
  )),
  config_json jsonb
);

create index idx_completion_actions_template on task_template_completion_actions (task_template_id);

-- ============================================================
-- episodes
-- ============================================================
create table episodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows (id) on delete cascade,
  process_id uuid not null references processes (id) on delete cascade,
  show_id uuid not null references shows (id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  progress_percent numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_episodes_workflow on episodes (workflow_id);
create index idx_episodes_show on episodes (show_id);
create index idx_episodes_status on episodes (status);

-- ============================================================
-- tasks
-- ============================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episodes (id) on delete cascade,
  task_template_id uuid not null references task_templates (id) on delete cascade,
  title text not null,
  position int not null default 0,
  status text not null default 'open' check (status in ('open', 'completed', 'blocked')),
  is_visible boolean not null default true,
  assigned_user_id uuid references users (id) on delete set null,
  start_date timestamptz,
  due_date timestamptz,
  completed_at timestamptz,
  completed_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_episode on tasks (episode_id);
create index idx_tasks_assigned on tasks (assigned_user_id);
create index idx_tasks_status on tasks (status);

-- ============================================================
-- task_block_responses
-- ============================================================
create table task_block_responses (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  task_template_block_id uuid not null references task_template_blocks (id) on delete cascade,
  value_json jsonb,
  updated_at timestamptz not null default now()
);

create index idx_block_responses_task on task_block_responses (task_id);

-- ============================================================
-- task_comments
-- ============================================================
create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index idx_task_comments_task on task_comments (task_id);

-- ============================================================
-- Row Level Security — permissive policies for all authenticated users
-- ============================================================
alter table users enable row level security;
alter table shows enable row level security;
alter table show_setting_definitions enable row level security;
alter table show_setting_values enable row level security;
alter table processes enable row level security;
alter table workflows enable row level security;
alter table roles enable row level security;
alter table show_role_assignments enable row level security;
alter table task_templates enable row level security;
alter table task_template_blocks enable row level security;
alter table task_template_visibility_rules enable row level security;
alter table task_template_dependencies enable row level security;
alter table task_template_date_rules enable row level security;
alter table task_template_email_templates enable row level security;
alter table task_template_completion_actions enable row level security;
alter table episodes enable row level security;
alter table tasks enable row level security;
alter table task_block_responses enable row level security;
alter table task_comments enable row level security;

-- Permissive policies: allow all authenticated users full access (will tighten later)
do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'users', 'shows', 'show_setting_definitions', 'show_setting_values',
      'processes', 'workflows', 'roles', 'show_role_assignments',
      'task_templates', 'task_template_blocks', 'task_template_visibility_rules',
      'task_template_dependencies', 'task_template_date_rules',
      'task_template_email_templates', 'task_template_completion_actions',
      'episodes', 'tasks', 'task_block_responses', 'task_comments'
    ])
  loop
    execute format(
      'create policy "Allow all authenticated access" on %I for all to authenticated using (true) with check (true)',
      tbl
    );
    -- Also allow anon access during development (no auth yet)
    execute format(
      'create policy "Allow anon access" on %I for all to anon using (true) with check (true)',
      tbl
    );
  end loop;
end
$$;

-- Phase 8: Task editing in episodes

-- Instance-level blocks added directly to a task in an episode
create table task_instance_blocks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  block_type text not null check (block_type in (
    'description', 'text_input', 'rich_text', 'dropdown', 'radio',
    'checkbox', 'file_attachment', 'date_time', 'heading', 'comments'
  )),
  label text not null,
  required boolean not null default false,
  options_json jsonb,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_task_instance_blocks_task on task_instance_blocks (task_id);

alter table task_instance_blocks enable row level security;
create policy "Allow all authenticated access" on task_instance_blocks
  for all to authenticated using (true) with check (true);
create policy "Allow anon access" on task_instance_blocks
  for all to anon using (true) with check (true);

-- Hidden template block IDs per task instance
alter table tasks add column if not exists hidden_template_block_ids jsonb default '[]';

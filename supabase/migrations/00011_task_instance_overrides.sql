-- Instance-level overrides for episode tasks
-- These store one-off changes that only affect this task in this episode

-- Instance-level completion actions (jsonb array of action objects)
alter table tasks add column if not exists instance_actions jsonb default '[]';

-- Instance-level email template override (jsonb object or null)
alter table tasks add column if not exists instance_email_template jsonb;

-- Instance-level dependencies (jsonb array of task IDs this task depends on)
alter table tasks add column if not exists instance_dependencies jsonb default '[]';

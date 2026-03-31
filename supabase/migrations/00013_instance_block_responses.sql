-- Allow task_block_responses to reference either template blocks OR instance blocks
-- Make the existing FK nullable
alter table task_block_responses
  alter column task_template_block_id drop not null;

-- Add instance block reference
alter table task_block_responses
  add column if not exists task_instance_block_id uuid references task_instance_blocks (id) on delete cascade;

-- Drop the old unique constraint and add a new one that covers both
alter table task_block_responses
  drop constraint if exists task_block_responses_task_block_unique;

-- A response is unique per task + block (template or instance)
create unique index if not exists task_block_responses_template_unique
  on task_block_responses (task_id, task_template_block_id)
  where task_template_block_id is not null;

create unique index if not exists task_block_responses_instance_unique
  on task_block_responses (task_id, task_instance_block_id)
  where task_instance_block_id is not null;

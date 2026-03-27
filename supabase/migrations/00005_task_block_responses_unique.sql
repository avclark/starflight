-- Add unique constraint for upsert on task_block_responses
alter table task_block_responses
  add constraint task_block_responses_task_block_unique
  unique (task_id, task_template_block_id);

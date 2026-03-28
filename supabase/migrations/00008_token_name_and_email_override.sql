-- Add token_name to task_template_blocks for custom token references
alter table task_template_blocks
  add column if not exists token_name text;

-- Add email_body_override to tasks for persisting edited email messages
alter table tasks
  add column if not exists email_body_override text;

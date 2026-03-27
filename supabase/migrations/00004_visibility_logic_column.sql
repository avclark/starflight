-- Phase 4: Add visibility_logic column to task_templates
alter table task_templates
  add column if not exists visibility_logic text not null default 'and'
  check (visibility_logic in ('and', 'or'));

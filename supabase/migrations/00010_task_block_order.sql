-- Store explicit block ordering per task instance
alter table tasks add column if not exists block_order jsonb;

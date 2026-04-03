-- Phase 15c: Trigram indexes for fast ILIKE search

create extension if not exists pg_trgm;

create index if not exists idx_episodes_title_trgm on episodes using gin (title gin_trgm_ops);
create index if not exists idx_shows_name_trgm on shows using gin (name gin_trgm_ops);
create index if not exists idx_tasks_title_trgm on tasks using gin (title gin_trgm_ops);
create index if not exists idx_users_fullname_trgm on users using gin (full_name gin_trgm_ops);
create index if not exists idx_workflows_name_trgm on workflows using gin (name gin_trgm_ops);
create index if not exists idx_processes_name_trgm on processes using gin (name gin_trgm_ops);

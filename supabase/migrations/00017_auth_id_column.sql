-- Phase 13: Auth - Add auth_id column to link Supabase Auth users to app users
alter table users add column if not exists auth_id uuid unique;
create index if not exists idx_users_auth_id on users (auth_id) where auth_id is not null;

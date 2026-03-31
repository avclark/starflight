-- Phase 10: People & Profiles
-- Add first_name, last_name, timezone to users

alter table users add column if not exists first_name text;
alter table users add column if not exists last_name text;
alter table users add column if not exists timezone text;

-- Migrate existing full_name data: split on first space
update users
set
  first_name = split_part(full_name, ' ', 1),
  last_name = case
    when position(' ' in full_name) > 0
    then substring(full_name from position(' ' in full_name) + 1)
    else ''
  end
where first_name is null;

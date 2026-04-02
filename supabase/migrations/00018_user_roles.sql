-- Add role column to users table
alter table users add column if not exists role text not null default 'user'
  check (role in ('admin', 'user'));

-- Set the initial admin
update users set role = 'admin' where email = 'adam@podcastroyale.net';

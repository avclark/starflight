-- Phase 12: Storage buckets for file uploads
-- Note: Bucket creation is typically done via Supabase dashboard or CLI.
-- This migration documents the required buckets and policies.
-- Run these in the Supabase SQL editor if buckets don't exist:

-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('show-artwork', 'show-artwork', true);
-- insert into storage.buckets (id, name, public) values ('task-attachments', 'task-attachments', true);

-- Storage policies for authenticated users
-- create policy "Allow authenticated uploads" on storage.objects for insert to authenticated with check (true);
-- create policy "Allow authenticated reads" on storage.objects for select to authenticated using (true);
-- create policy "Allow public reads" on storage.objects for select to anon using (true);
-- create policy "Allow authenticated updates" on storage.objects for update to authenticated using (true);
-- create policy "Allow authenticated deletes" on storage.objects for delete to authenticated using (true);

-- For development with anon access:
-- create policy "Allow anon uploads" on storage.objects for insert to anon with check (true);
-- create policy "Allow anon updates" on storage.objects for update to anon using (true);
-- create policy "Allow anon deletes" on storage.objects for delete to anon using (true);

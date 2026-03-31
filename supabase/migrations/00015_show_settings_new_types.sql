-- Phase 11: Additional show setting field types and options support

-- Add options_json column for select_dropdown and radio_options
alter table show_setting_definitions
  add column if not exists options_json jsonb;

-- Update field_type check constraint to allow new types
alter table show_setting_definitions
  drop constraint if exists show_setting_definitions_field_type_check;

-- Drop any auto-generated constraint
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attnum = any(con.conkey)
      and att.attrelid = con.conrelid
    where con.conrelid = 'show_setting_definitions'::regclass
      and att.attname = 'field_type'
      and con.contype = 'c'
  loop
    execute format('alter table show_setting_definitions drop constraint %I', r.conname);
  end loop;
end
$$;

alter table show_setting_definitions add constraint show_setting_definitions_field_type_check
  check (field_type in (
    'yes_no', 'text', 'textarea', 'checklist',
    'rich_text', 'select_dropdown', 'radio_options',
    'website_url', 'email_address', 'file_upload'
  ));

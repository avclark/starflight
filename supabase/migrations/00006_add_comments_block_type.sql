-- Add 'comments' to the allowed block_type values
-- Drop ALL check constraints on the block_type column (name may vary)
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attnum = any(con.conkey)
      and att.attrelid = con.conrelid
    where con.conrelid = 'task_template_blocks'::regclass
      and att.attname = 'block_type'
      and con.contype = 'c'
  loop
    execute format('alter table task_template_blocks drop constraint %I', r.conname);
  end loop;
end
$$;

alter table task_template_blocks add constraint task_template_blocks_block_type_check
  check (block_type in (
    'description', 'text_input', 'rich_text', 'dropdown', 'radio',
    'checkbox', 'file_attachment', 'date_time', 'heading', 'comments'
  ));

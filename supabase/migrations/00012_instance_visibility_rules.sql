-- Instance-level visibility rules stored as jsonb on tasks
-- Format: { logic: "and"|"or", rules: [{ name, setting_definition_id, operator, target_value, is_active }] }
alter table tasks add column if not exists instance_visibility_rules jsonb;

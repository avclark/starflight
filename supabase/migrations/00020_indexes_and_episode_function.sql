-- Phase 15c: Database indexes and episode creation optimization

-- ============================================================
-- Additional indexes for common query patterns
-- ============================================================

-- tasks(task_template_id) — episode detail block lookups
create index if not exists idx_tasks_template on tasks (task_template_id);

-- task_block_responses(task_instance_block_id) — instance block response queries
create index if not exists idx_block_responses_instance_block
  on task_block_responses (task_instance_block_id)
  where task_instance_block_id is not null;

-- notifications(user_id, read) — full composite for bell count query
-- (idx_notifications_unread is partial where read=false; this covers both)
create index if not exists idx_notifications_user_read on notifications (user_id, read);

-- ============================================================
-- Postgres function: create_episode_with_tasks
-- Creates an episode and all its tasks in a single transaction.
-- Handles: visibility rules, role-based assignment, dependencies,
-- date rule calculation, and returns the episode + task IDs.
-- ============================================================

create or replace function create_episode_with_tasks(
  p_workflow_id uuid,
  p_process_id uuid,
  p_show_id uuid,
  p_title text,
  p_created_by_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_episode_id uuid;
  v_result jsonb;
  v_task_ids uuid[];
begin
  -- 1. Create the episode
  insert into episodes (workflow_id, process_id, show_id, title, status, progress_percent)
  values (p_workflow_id, p_process_id, p_show_id, p_title, 'active', 0)
  returning id into v_episode_id;

  -- 2. Build tasks from templates with visibility, assignment, dependencies, and dates
  with
  -- Fetch all templates for this process
  templates as (
    select id, title, position, assignment_mode, assigned_role_id, assigned_user_id,
           coalesce(visibility_logic, 'and') as visibility_logic
    from task_templates
    where process_id = p_process_id
    order by position
  ),

  -- Fetch show setting values for visibility evaluation
  setting_vals as (
    select setting_definition_id, value_json
    from show_setting_values
    where show_id = p_show_id
  ),

  -- Fetch visibility rules for templates in this process
  vis_rules as (
    select vr.task_template_id, vr.setting_definition_id, vr.operator, vr.target_value
    from task_template_visibility_rules vr
    join templates t on t.id = vr.task_template_id
    where vr.is_active = true
  ),

  -- Evaluate each rule: does it pass?
  rule_results as (
    select
      vr.task_template_id,
      case
        when vr.operator = 'must_be_empty' then
          (sv.value_json is null or sv.value_json::text = '' or sv.value_json::text = 'null' or sv.value_json::text = 'false')
        when vr.operator = 'must_not_be_empty' then
          (sv.value_json is not null and sv.value_json::text != '' and sv.value_json::text != 'null' and sv.value_json::text != 'false')
        when vr.operator = 'must_contain' then
          lower(
            case
              when sv.value_json::text = 'true' then 'yes'
              when sv.value_json::text = 'false' then 'no'
              else coalesce(sv.value_json #>> '{}', '')
            end
          ) like '%' || lower(
            case
              when vr.target_value = 'true' then 'yes'
              when vr.target_value = 'false' then 'no'
              else coalesce(vr.target_value, '')
            end
          ) || '%'
        when vr.operator = 'must_not_contain' then
          lower(
            case
              when sv.value_json::text = 'true' then 'yes'
              when sv.value_json::text = 'false' then 'no'
              else coalesce(sv.value_json #>> '{}', '')
            end
          ) not like '%' || lower(
            case
              when vr.target_value = 'true' then 'yes'
              when vr.target_value = 'false' then 'no'
              else coalesce(vr.target_value, '')
            end
          ) || '%'
        else true
      end as passes
    from vis_rules vr
    left join setting_vals sv on sv.setting_definition_id = vr.setting_definition_id
  ),

  -- Aggregate rule results per template using AND/OR logic
  visibility as (
    select
      t.id as task_template_id,
      case
        when not exists (select 1 from rule_results rr where rr.task_template_id = t.id) then true
        when t.visibility_logic = 'or' then
          exists (select 1 from rule_results rr where rr.task_template_id = t.id and rr.passes = true)
        else
          not exists (select 1 from rule_results rr where rr.task_template_id = t.id and rr.passes = false)
      end as is_visible
    from templates t
  ),

  -- Resolve role-based assignments
  role_assignments as (
    select role_id, user_id
    from show_role_assignments
    where show_id = p_show_id
  ),

  -- Fetch dependencies
  deps as (
    select task_template_id, depends_on_task_template_id
    from task_template_dependencies
    where task_template_id in (select id from templates)
  ),

  -- Determine blocked status: blocked if any visible prerequisite exists
  -- (at creation time, no tasks are completed, so any visible dep = blocked)
  blocked_status as (
    select
      t.id as task_template_id,
      case
        when exists (
          select 1 from deps d
          join visibility v2 on v2.task_template_id = d.depends_on_task_template_id
          where d.task_template_id = t.id and v2.is_visible = true
        ) then 'blocked'
        else 'open'
      end as status
    from templates t
  ),

  -- Insert tasks
  inserted_tasks as (
    insert into tasks (episode_id, task_template_id, title, position, status, is_visible, assigned_user_id)
    select
      v_episode_id,
      t.id,
      t.title,
      t.position,
      bs.status,
      v.is_visible,
      case
        when t.assignment_mode = 'user' then t.assigned_user_id
        when t.assignment_mode = 'role' then (select ra.user_id from role_assignments ra where ra.role_id = t.assigned_role_id limit 1)
        else null
      end
    from templates t
    join visibility v on v.task_template_id = t.id
    join blocked_status bs on bs.task_template_id = t.id
    returning id, task_template_id, title, position, assigned_user_id, is_visible, start_date, due_date
  ),

  -- Fetch date rules
  date_rules as (
    select *
    from task_template_date_rules
    where task_template_id in (select id from templates)
  ),

  -- Calculate dates from rules
  -- Phase 1: episode_start-relative rules (these don't depend on other tasks)
  episode_dates as (
    select
      it.id as task_id,
      dr.date_field,
      (now() + make_interval(days => dr.offset_days, hours => dr.offset_hours)) as calculated_date
    from date_rules dr
    join inserted_tasks it on it.task_template_id = dr.task_template_id
    where dr.relative_to = 'episode_start'
  ),

  -- Apply episode-relative dates
  date_updates as (
    update tasks t
    set
      start_date = coalesce(
        (select ed.calculated_date from episode_dates ed where ed.task_id = t.id and ed.date_field = 'start_date'),
        t.start_date
      ),
      due_date = coalesce(
        (select ed.calculated_date from episode_dates ed where ed.task_id = t.id and ed.date_field = 'due_date'),
        t.due_date
      )
    where t.id in (select id from inserted_tasks)
    and exists (select 1 from episode_dates ed where ed.task_id = t.id)
    returning t.id, t.task_template_id, t.start_date, t.due_date
  ),

  -- Phase 2: task-relative rules (depend on dates set in phase 1)
  task_relative_dates as (
    select
      it.id as task_id,
      dr.date_field,
      (
        case
          when dr.relative_to = 'task_start' then
            coalesce(
              (select du.start_date from date_updates du where du.task_template_id = dr.relative_task_template_id),
              (select it2.start_date from inserted_tasks it2 where it2.task_template_id = dr.relative_task_template_id)
            )
          when dr.relative_to = 'task_due' then
            coalesce(
              (select du.due_date from date_updates du where du.task_template_id = dr.relative_task_template_id),
              (select it2.due_date from inserted_tasks it2 where it2.task_template_id = dr.relative_task_template_id)
            )
          else null
        end
        + make_interval(days => dr.offset_days, hours => dr.offset_hours)
      ) as calculated_date
    from date_rules dr
    join inserted_tasks it on it.task_template_id = dr.task_template_id
    where dr.relative_to in ('task_start', 'task_due')
    and dr.relative_task_template_id is not null
  ),

  -- Apply task-relative dates
  task_date_updates as (
    update tasks t
    set
      start_date = coalesce(
        (select trd.calculated_date from task_relative_dates trd where trd.task_id = t.id and trd.date_field = 'start_date'),
        t.start_date
      ),
      due_date = coalesce(
        (select trd.calculated_date from task_relative_dates trd where trd.task_id = t.id and trd.date_field = 'due_date'),
        t.due_date
      )
    where t.id in (select id from inserted_tasks)
    and exists (select 1 from task_relative_dates trd where trd.task_id = t.id)
    returning t.id
  )

  -- Collect all inserted task IDs
  select array_agg(id) into v_task_ids from inserted_tasks;

  -- 3. Build the result
  select jsonb_build_object(
    'episode_id', v_episode_id,
    'task_ids', coalesce(to_jsonb(v_task_ids), '[]'::jsonb),
    'tasks', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'position', t.position,
        'assigned_user_id', t.assigned_user_id,
        'is_visible', t.is_visible,
        'status', t.status
      ) order by t.position)
      from tasks t where t.episode_id = v_episode_id),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

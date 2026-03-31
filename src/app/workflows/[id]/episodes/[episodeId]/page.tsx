import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EpisodeDetail } from "./episode-detail";

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>;
}) {
  const { id: workflowId, episodeId } = await params;
  const supabase = await createClient();

  const { data: episode } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", episodeId)
    .single();

  if (!episode) notFound();

  const { data: show } = await supabase
    .from("shows")
    .select("name, avatar_url")
    .eq("id", episode.show_id)
    .single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("episode_id", episodeId)
    .eq("is_visible", true)
    .order("position");

  // Fetch assigned user names
  const assignedUserIds = [
    ...new Set(
      (tasks ?? [])
        .map((t) => t.assigned_user_id)
        .filter(Boolean) as string[]
    ),
  ];
  const { data: assignedUsers } = assignedUserIds.length
    ? await supabase
        .from("users")
        .select("id, full_name")
        .in("id", assignedUserIds)
    : { data: [] };
  const userMap = Object.fromEntries(
    (assignedUsers ?? []).map((u) => [u.id, u.full_name])
  );

  // Fetch template blocks for all task templates referenced by these tasks
  const templateIds = [
    ...new Set((tasks ?? []).map((t) => t.task_template_id)),
  ];
  const { data: templateBlocks } = templateIds.length
    ? await supabase
        .from("task_template_blocks")
        .select("*")
        .in("task_template_id", templateIds)
        .order("display_order")
    : { data: [] };

  // Fetch date rules for task templates
  const { data: dateRules } = templateIds.length
    ? await supabase
        .from("task_template_date_rules")
        .select("*")
        .in("task_template_id", templateIds)
    : { data: [] };

  // Fetch task templates for date rule display (need titles)
  const { data: taskTemplatesForRules } = templateIds.length
    ? await supabase
        .from("task_templates")
        .select("id, title")
        .in("id", templateIds)
    : { data: [] };

  // Fetch instance blocks (episode-level blocks added to tasks)
  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: instanceBlocks } = taskIds.length
    ? await supabase
        .from("task_instance_blocks")
        .select("*")
        .in("task_id", taskIds)
        .order("display_order")
    : { data: [] };

  // Fetch existing block responses for all tasks
  const { data: blockResponses } = taskIds.length
    ? await supabase
        .from("task_block_responses")
        .select("*")
        .in("task_id", taskIds)
    : { data: [] };

  // Fetch comments for all tasks
  const { data: comments } = taskIds.length
    ? await supabase
        .from("task_comments")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at")
    : { data: [] };

  // Fetch all comment author names + all people for @mentions
  const commentUserIds = [
    ...new Set((comments ?? []).map((c) => c.user_id)),
  ];
  const allUserIds = [
    ...new Set([...assignedUserIds, ...commentUserIds]),
  ];
  const { data: allUsers } = allUserIds.length
    ? await supabase
        .from("users")
        .select("id, full_name")
        .in("id", allUserIds)
    : { data: [] };
  const fullUserMap = Object.fromEntries(
    (allUsers ?? []).map((u) => [u.id, u.full_name])
  );

  // People for @mention dropdown
  const { data: allPeople } = await supabase
    .from("users")
    .select("id, full_name")
    .order("full_name");

  // Fetch roles for assignment tab
  const { data: roles } = await supabase
    .from("roles")
    .select("id, name")
    .order("display_order");

  // Fetch show role assignments for role resolution
  const { data: showRoleAssignments } = await supabase
    .from("show_role_assignments")
    .select("role_id, user_id")
    .eq("show_id", episode.show_id);

  // Fetch show setting definitions for visibility rules
  const { data: allSettingDefs } = await supabase
    .from("show_setting_definitions")
    .select("id, label")
    .order("display_order");

  // Email templates for tasks with send_email actions
  const { data: emailTemplates } = templateIds.length
    ? await supabase
        .from("task_template_email_templates")
        .select("*")
        .in("task_template_id", templateIds)
    : { data: [] };

  // Show settings for token resolution
  const { data: showSettings } = await supabase
    .from("show_setting_values")
    .select("setting_definition_id, value_json")
    .eq("show_id", episode.show_id);

  const { data: settingDefs } = await supabase
    .from("show_setting_definitions")
    .select("id, label");

  // Build show settings map: label → value
  const settingDefMap = new Map((settingDefs ?? []).map((d) => [d.id, d.label]));
  const showSettingsMap: Record<string, string> = {};
  for (const sv of showSettings ?? []) {
    const label = settingDefMap.get(sv.setting_definition_id);
    if (label) {
      const val = sv.value_json;
      showSettingsMap[label] =
        val === true ? "Yes" : val === false ? "No" : String(val ?? "");
    }
  }

  return (
    <EpisodeDetail
      workflowId={workflowId}
      episode={{
        id: episode.id,
        title: episode.title,
        status: episode.status,
        progress_percent: episode.progress_percent,
        show_name: show?.name ?? null,
        show_avatar_url: show?.avatar_url ?? null,
      }}
      tasks={tasks ?? []}
      userMap={fullUserMap}
      templateBlocks={templateBlocks ?? []}
      blockResponses={blockResponses ?? []}
      comments={comments ?? []}
      people={allPeople ?? []}
      emailTemplates={emailTemplates ?? []}
      showSettingsMap={showSettingsMap}
      instanceBlocks={instanceBlocks ?? []}
      roles={roles ?? []}
      settingDefinitions={allSettingDefs ?? []}
      showRoleAssignments={showRoleAssignments ?? []}
      dateRules={dateRules ?? []}
      taskTemplatesForRules={taskTemplatesForRules ?? []}
    />
  );
}

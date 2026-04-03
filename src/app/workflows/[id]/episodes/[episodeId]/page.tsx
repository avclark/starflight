import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { EpisodeDetail } from "./episode-detail";

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>;
}) {
  const { id: workflowId, episodeId } = await params;
  const supabase = await createClient();

  // Parallel batch 1: episode, tasks, current user, all people, roles, setting defs
  const [
    { data: episode },
    { data: tasks },
    currentUser,
    { data: allPeople },
    { data: roles },
    { data: allSettingDefs },
  ] = await Promise.all([
    supabase.from("episodes").select("*").eq("id", episodeId).single(),
    supabase.from("tasks").select("*").eq("episode_id", episodeId).eq("is_visible", true).order("position"),
    getCurrentUser(),
    supabase.from("users").select("id, full_name").order("full_name"),
    supabase.from("roles").select("id, name").order("display_order"),
    supabase.from("show_setting_definitions").select("id, label").order("display_order"),
  ]);

  if (!episode) notFound();

  // Collect IDs for dependent queries
  const assignedUserIds = [...new Set((tasks ?? []).map((t) => t.assigned_user_id).filter(Boolean) as string[])];
  const templateIds = [...new Set((tasks ?? []).map((t) => t.task_template_id))];
  const taskIds = (tasks ?? []).map((t) => t.id);

  // Parallel batch 2: everything that depends on episode/tasks
  const [
    { data: show },
    { data: assignedUsers },
    { data: templateBlocks },
    { data: dateRules },
    { data: taskTemplatesForRules },
    { data: instanceBlocks },
    { data: blockResponses },
    { data: comments },
    { data: showRoleAssignments },
    { data: emailTemplates },
    { data: showSettings },
    { data: settingDefs },
  ] = await Promise.all([
    supabase.from("shows").select("name, avatar_url").eq("id", episode.show_id).single(),
    assignedUserIds.length
      ? supabase.from("users").select("id, full_name, avatar_url").in("id", assignedUserIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; avatar_url: string | null }[] }),
    templateIds.length
      ? supabase.from("task_template_blocks").select("*").in("task_template_id", templateIds).order("display_order")
      : Promise.resolve({ data: [] }),
    templateIds.length
      ? supabase.from("task_template_date_rules").select("*").in("task_template_id", templateIds)
      : Promise.resolve({ data: [] }),
    templateIds.length
      ? supabase.from("task_templates").select("id, title").in("id", templateIds)
      : Promise.resolve({ data: [] }),
    taskIds.length
      ? supabase.from("task_instance_blocks").select("*").in("task_id", taskIds).order("display_order")
      : Promise.resolve({ data: [] }),
    taskIds.length
      ? supabase.from("task_block_responses").select("*").in("task_id", taskIds)
      : Promise.resolve({ data: [] }),
    taskIds.length
      ? supabase.from("task_comments").select("*").in("task_id", taskIds).order("created_at")
      : Promise.resolve({ data: [] }),
    supabase.from("show_role_assignments").select("role_id, user_id").eq("show_id", episode.show_id),
    templateIds.length
      ? supabase.from("task_template_email_templates").select("*").in("task_template_id", templateIds)
      : Promise.resolve({ data: [] }),
    supabase.from("show_setting_values").select("setting_definition_id, value_json").eq("show_id", episode.show_id),
    supabase.from("show_setting_definitions").select("id, label"),
  ]);

  // Build user maps (merge assigned users with comment authors)
  const commentUserIds = [...new Set((comments ?? []).map((c) => c.user_id))];
  const missingUserIds = commentUserIds.filter((id) => !assignedUserIds.includes(id));
  const { data: extraUsers } = missingUserIds.length
    ? await supabase.from("users").select("id, full_name, avatar_url").in("id", missingUserIds)
    : { data: [] };

  const allUsers = [...(assignedUsers ?? []), ...(extraUsers ?? [])];
  const fullUserMap = Object.fromEntries(allUsers.map((u) => [u.id, u.full_name]));
  const fullUserAvatarMap = Object.fromEntries(allUsers.map((u) => [u.id, u.avatar_url ?? null]));

  // Build show settings map: label -> value
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
      userAvatarMap={fullUserAvatarMap}
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
      isAdminUser={isAdmin(currentUser)}
    />
  );
}

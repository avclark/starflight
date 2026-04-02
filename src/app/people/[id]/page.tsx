import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { PersonPageTabs } from "./person-page-tabs";

export default async function PersonProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const currentUser = await getCurrentUser();

  if (currentUser && !isAdmin(currentUser) && currentUser.id !== id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: person } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!person) notFound();

  // Episodes where this person has assigned tasks
  const { data: userTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_user_id", id)
    .eq("is_visible", true);

  const episodeIds = [...new Set((userTasks ?? []).map((t) => t.episode_id))];
  const { data: episodes } = episodeIds.length
    ? await supabase
        .from("episodes")
        .select("*")
        .in("id", episodeIds)
        .order("updated_at", { ascending: false })
    : { data: [] };

  // Show/workflow info for episodes
  const showIds = [...new Set((episodes ?? []).map((e) => e.show_id))];
  const workflowIds = [...new Set((episodes ?? []).map((e) => e.workflow_id))];
  const { data: shows } = showIds.length
    ? await supabase.from("shows").select("id, name, avatar_url").in("id", showIds)
    : { data: [] };
  const { data: workflows } = workflowIds.length
    ? await supabase.from("workflows").select("id, name").in("id", workflowIds)
    : { data: [] };

  // Open tasks
  const openTasks = (userTasks ?? []).filter((t) => t.status === "open");
  const taskEpisodeIds = [...new Set(openTasks.map((t) => t.episode_id))];
  const { data: taskEpisodes } = taskEpisodeIds.length
    ? await supabase.from("episodes").select("id, title, workflow_id").in("id", taskEpisodeIds)
    : { data: [] };

  // Shows with role assignments
  const { data: roleAssignments } = await supabase
    .from("show_role_assignments")
    .select("show_id, role_id")
    .eq("user_id", id);

  const roleShowIds = [...new Set((roleAssignments ?? []).map((a) => a.show_id))];
  const roleIds = [...new Set((roleAssignments ?? []).map((a) => a.role_id))];
  const { data: roleShows } = roleShowIds.length
    ? await supabase.from("shows").select("id, name, avatar_url").in("id", roleShowIds)
    : { data: [] };
  const { data: roles } = roleIds.length
    ? await supabase.from("roles").select("id, name").in("id", roleIds)
    : { data: [] };

  // Notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <PersonPageTabs
      person={person}
      defaultTab={tab ?? "episodes"}
      canEditRole={isAdmin(currentUser)}
      episodes={episodes ?? []}
      shows={shows ?? []}
      workflows={workflows ?? []}
      openTasks={openTasks.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })}
      taskEpisodes={taskEpisodes ?? []}
      roleAssignments={roleAssignments ?? []}
      roleShows={roleShows ?? []}
      roles={roles ?? []}
      notifications={notifications ?? []}
    />
  );
}

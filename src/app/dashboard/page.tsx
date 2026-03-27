import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardTasks } from "./dashboard-tasks";
import Link from "next/link";
import { ClientDate } from "@/components/client-date";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: episodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(10);

  // Fetch related shows and workflows for display
  const showIds = [...new Set((episodes ?? []).map((e) => e.show_id))];
  const workflowIds = [...new Set((episodes ?? []).map((e) => e.workflow_id))];

  const { data: shows } = showIds.length
    ? await supabase.from("shows").select("id, name").in("id", showIds)
    : { data: [] };
  const { data: workflows } = workflowIds.length
    ? await supabase.from("workflows").select("id, name").in("id", workflowIds)
    : { data: [] };

  const showMap = new Map((shows ?? []).map((s) => [s.id, s.name]));
  const workflowMap = new Map((workflows ?? []).map((w) => [w.id, w.name]));

  // TODO: When auth is added, filter by current user's ID:
  // .eq("assigned_user_id", currentUserId)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "open")
    .eq("is_visible", true)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(20);

  // Fetch episode info for tasks
  const taskEpisodeIds = [...new Set((tasks ?? []).map((t) => t.episode_id))];
  const { data: taskEpisodes } = taskEpisodeIds.length
    ? await supabase
        .from("episodes")
        .select("id, title, workflow_id")
        .in("id", taskEpisodeIds)
    : { data: [] };
  const episodeMap = new Map(
    (taskEpisodes ?? []).map((e) => [e.id, e])
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Episodes</CardTitle>
          </CardHeader>
          <CardContent>
            {!episodes || episodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active episodes.
              </p>
            ) : (
              <div className="space-y-3">
                {episodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/workflows/${ep.workflow_id}/episodes/${ep.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {ep.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {showMap.get(ep.show_id) ?? "Unknown show"}
                        {workflowMap.has(ep.workflow_id)
                          ? ` · ${workflowMap.get(ep.workflow_id)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${ep.progress_percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                        {ep.progress_percent}%
                      </span>
                    </div>
                    <ClientDate
                      date={ep.updated_at}
                      fmt="MMM d"
                      className="text-xs text-muted-foreground shrink-0"
                    />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardTasks
              tasks={(tasks ?? []).map((t) => ({
                ...t,
                episode: episodeMap.get(t.episode_id) ?? null,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

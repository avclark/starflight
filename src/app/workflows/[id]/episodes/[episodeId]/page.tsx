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
    .select("name")
    .eq("id", episode.show_id)
    .single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("episode_id", episodeId)
    .eq("is_visible", true)
    .order("position");

  return (
    <EpisodeDetail
      workflowId={workflowId}
      episode={{
        id: episode.id,
        title: episode.title,
        status: episode.status,
        progress_percent: episode.progress_percent,
        show_name: show?.name ?? null,
      }}
      tasks={tasks ?? []}
    />
  );
}

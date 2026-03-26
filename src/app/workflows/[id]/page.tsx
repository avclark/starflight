import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EpisodesTab } from "./episodes-tab";
import { WorkflowHeader } from "./workflow-header";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (!workflow) notFound();

  const { data: episodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("workflow_id", id)
    .order("updated_at", { ascending: false });

  // Fetch show names for episodes
  const showIds = [...new Set((episodes ?? []).map((e) => e.show_id))];
  const { data: episodeShows } = showIds.length
    ? await supabase.from("shows").select("id, name").in("id", showIds)
    : { data: [] };
  const showNameMap = new Map((episodeShows ?? []).map((s) => [s.id, s.name]));

  const { data: shows } = await supabase
    .from("shows")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  const { data: processes } = await supabase
    .from("processes")
    .select("id, name")
    .order("name");

  // Resolve current process name
  const currentProcessName =
    processes?.find((p) => p.id === workflow.process_id)?.name ?? null;

  const episodesWithShows = (episodes ?? []).map((ep) => ({
    ...ep,
    show_name: showNameMap.get(ep.show_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <WorkflowHeader
        workflowId={id}
        workflowName={workflow.name}
        currentProcessId={workflow.process_id}
        currentProcessName={currentProcessName}
        processes={processes ?? []}
      />

      <EpisodesTab
        workflowId={id}
        processId={workflow.process_id}
        itemLabel={workflow.item_label}
        episodes={episodesWithShows}
        shows={shows ?? []}
      />
    </div>
  );
}

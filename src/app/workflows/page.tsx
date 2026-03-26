import { createClient } from "@/lib/supabase/server";
import { WorkflowsGrid } from "./workflows-grid";

export default async function WorkflowsPage() {
  const supabase = await createClient();
  const { data: workflows } = await supabase
    .from("workflows")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: processes } = await supabase
    .from("processes")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
      </div>
      <WorkflowsGrid
        workflows={workflows ?? []}
        processes={processes ?? []}
      />
    </div>
  );
}

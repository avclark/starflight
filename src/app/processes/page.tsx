import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { ProcessesTable } from "./processes-table";

export default async function ProcessesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: processes } = await supabase
    .from("processes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Processes</h1>
      </div>
      <ProcessesTable processes={processes ?? []} />
    </div>
  );
}

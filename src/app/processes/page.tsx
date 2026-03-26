import { createClient } from "@/lib/supabase/server";
import { ProcessesTable } from "./processes-table";

export default async function ProcessesPage() {
  const supabase = await createClient();
  const { data: processes } = await supabase
    .from("processes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Processes</h1>
      </div>
      <ProcessesTable processes={processes ?? []} />
    </div>
  );
}

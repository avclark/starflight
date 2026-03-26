import { createClient } from "@/lib/supabase/server";
import { ShowsTable } from "./shows-table";

export default async function ShowsPage() {
  const supabase = await createClient();
  const { data: shows } = await supabase
    .from("shows")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Shows</h1>
      </div>
      <ShowsTable shows={shows ?? []} />
    </div>
  );
}

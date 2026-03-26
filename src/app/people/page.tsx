import { createClient } from "@/lib/supabase/server";
import { PeopleTable } from "./people-table";

export default async function PeoplePage() {
  const supabase = await createClient();
  const { data: people } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      </div>
      <PeopleTable people={people ?? []} />
    </div>
  );
}

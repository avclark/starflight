import { createClient } from "@/lib/supabase/server";
import { SettingDefinitionsList } from "./setting-definitions-list";

export default async function ShowSettingsPage() {
  const supabase = await createClient();

  const { data: definitions } = await supabase
    .from("show_setting_definitions")
    .select("*")
    .order("display_order");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Show Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define the questions and fields that each show answers. These drive
          conditional logic in processes.
        </p>
      </div>
      <SettingDefinitionsList definitions={definitions ?? []} />
    </div>
  );
}

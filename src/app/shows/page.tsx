import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShowsTable } from "./shows-table";
import { SettingDefinitionsList } from "./setting-definitions-list";

export default async function ShowsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: shows } = await supabase
    .from("shows")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: definitions } = await supabase
    .from("show_setting_definitions")
    .select("*")
    .order("display_order");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Shows</h1>
      <Tabs defaultValue="shows">
        <TabsList>
          <TabsTrigger value="shows">Shows</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="shows">
          <ShowsTable shows={shows ?? []} />
        </TabsContent>
        <TabsContent value="settings">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Define the questions and fields that each show answers. These drive
              conditional logic in processes.
            </p>
            <SettingDefinitionsList definitions={definitions ?? []} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

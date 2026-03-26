import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeopleTable } from "./people-table";
import { RolesTab } from "./roles-tab";

export default async function PeoplePage() {
  const supabase = await createClient();

  const { data: people } = await supabase
    .from("users")
    .select("*")
    .order("full_name");

  const { data: roles } = await supabase
    .from("roles")
    .select("*")
    .order("display_order");

  const { data: roleMembers } = await supabase
    .from("role_members")
    .select("*");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="people">
          <PeopleTable people={people ?? []} />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab
            roles={roles ?? []}
            roleMembers={roleMembers ?? []}
            people={people ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

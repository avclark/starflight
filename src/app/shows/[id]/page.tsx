import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: show } = await supabase
    .from("shows")
    .select("*")
    .eq("id", id)
    .single();

  if (!show) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{show.name}</h1>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Show Settings</TabsTrigger>
          <TabsTrigger value="roles">Role Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Show Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Show settings and conditional logic configuration will appear
                here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Role Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Role assignments for this show will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

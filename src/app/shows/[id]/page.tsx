import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShowHeader } from "./show-header";
import { RoleAssignmentsTab } from "./role-assignments-tab";

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

  const { data: episodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("show_id", id)
    .order("updated_at", { ascending: false });

  const workflowIds = [
    ...new Set((episodes ?? []).map((e) => e.workflow_id)),
  ];
  const { data: workflows } = workflowIds.length
    ? await supabase.from("workflows").select("id, name").in("id", workflowIds)
    : { data: [] };
  const workflowMap = new Map(
    (workflows ?? []).map((w) => [w.id, w.name])
  );

  // Roles data for assignments tab
  const { data: roles } = await supabase
    .from("roles")
    .select("id, name")
    .order("display_order");

  const { data: roleMembers } = await supabase
    .from("role_members")
    .select("role_id, user_id");

  const memberUserIds = [
    ...new Set((roleMembers ?? []).map((rm) => rm.user_id)),
  ];
  const { data: people } = memberUserIds.length
    ? await supabase
        .from("users")
        .select("id, full_name")
        .in("id", memberUserIds)
    : { data: [] };

  const { data: currentAssignments } = await supabase
    .from("show_role_assignments")
    .select("role_id, user_id")
    .eq("show_id", id);

  return (
    <div className="space-y-6">
      <ShowHeader showId={id} name={show.name} />

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Show Settings</TabsTrigger>
          <TabsTrigger value="roles">Role Assignments</TabsTrigger>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
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
          <RoleAssignmentsTab
            showId={id}
            roles={roles ?? []}
            roleMembers={roleMembers ?? []}
            people={people ?? []}
            currentAssignments={currentAssignments ?? []}
          />
        </TabsContent>
        <TabsContent value="episodes">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!episodes || episodes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-8"
                    >
                      No episodes for this show yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  episodes.map((ep) => (
                    <TableRow key={ep.id}>
                      <TableCell>
                        <Link
                          href={`/workflows/${ep.workflow_id}/episodes/${ep.id}`}
                          className="font-medium hover:underline"
                        >
                          {ep.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {workflowMap.get(ep.workflow_id) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${ep.progress_percent}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {ep.progress_percent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ep.updated_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

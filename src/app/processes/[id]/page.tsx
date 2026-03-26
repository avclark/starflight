import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProcessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: processData } = await supabase
    .from("processes")
    .select("*")
    .eq("id", id)
    .single();

  if (!processData) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {processData.name}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Process Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Process builder coming in Phase 5.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

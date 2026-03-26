import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProcessHeader } from "./process-header";
import { TaskTemplateList } from "./task-template-list";

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

  const { data: templates } = await supabase
    .from("task_templates")
    .select("*")
    .eq("process_id", id)
    .order("position");

  const { data: roles } = await supabase
    .from("roles")
    .select("id, name")
    .order("display_order");

  const { data: people } = await supabase
    .from("users")
    .select("id, full_name")
    .order("full_name");

  return (
    <div className="space-y-6">
      <ProcessHeader processId={id} name={processData.name} />
      <TaskTemplateList
        processId={id}
        templates={templates ?? []}
        roles={roles ?? []}
        people={people ?? []}
      />
    </div>
  );
}

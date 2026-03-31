import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PersonProfile } from "./person-profile";

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: person } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!person) notFound();

  return <PersonProfile person={person} />;
}

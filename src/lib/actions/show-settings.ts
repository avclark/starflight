"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveShowSettings(
  showId: string,
  values: { setting_definition_id: string; value_json: unknown }[]
) {
  const supabase = await createClient();

  for (const v of values) {
    const { error } = await supabase
      .from("show_setting_values")
      .upsert(
        {
          show_id: showId,
          setting_definition_id: v.setting_definition_id,
          value_json: v.value_json as import("@/lib/types/database").Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "show_id,setting_definition_id" }
      );

    if (error) return { error: error.message };
  }

  revalidatePath(`/shows/${showId}`);
  return { success: true };
}

// Show Setting Definitions management
export async function createSettingDefinition(
  label: string,
  fieldType: "yes_no" | "text" | "textarea" | "checklist"
) {
  if (!label) return { error: "Label is required" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("show_setting_definitions")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder =
    existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

  const { error } = await supabase.from("show_setting_definitions").insert({
    label,
    field_type: fieldType,
    display_order: nextOrder,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/show-settings");
  return { success: true };
}

export async function updateSettingDefinition(
  id: string,
  label: string
) {
  if (!label) return { error: "Label is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("show_setting_definitions")
    .update({ label })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings/show-settings");
  return { success: true };
}

export async function deleteSettingDefinition(id: string) {
  const supabase = await createClient();

  // Check for visibility rules referencing this definition
  const { count: ruleCount } = await supabase
    .from("task_template_visibility_rules")
    .select("id", { count: "exact", head: true })
    .eq("setting_definition_id", id);

  // Count show values that will be removed
  const { count: valueCount } = await supabase
    .from("show_setting_values")
    .select("id", { count: "exact", head: true })
    .eq("setting_definition_id", id);

  const warnings: string[] = [];
  if (valueCount && valueCount > 0) {
    warnings.push(`${valueCount} show value${valueCount > 1 ? "s" : ""}`);
  }
  if (ruleCount && ruleCount > 0) {
    warnings.push(
      `${ruleCount} visibility rule${ruleCount > 1 ? "s" : ""}`
    );
  }

  if (warnings.length > 0) {
    // Delete anyway but warn — the FK cascades handle it
  }

  const { error } = await supabase
    .from("show_setting_definitions")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings/show-settings");
  return { success: true, warnings };
}

export async function reorderSettingDefinitions(
  orderedIds: string[]
) {
  const supabase = await createClient();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("show_setting_definitions")
      .update({ display_order: i })
      .eq("id", orderedIds[i]);
  }

  revalidatePath("/settings/show-settings");
  return { success: true };
}

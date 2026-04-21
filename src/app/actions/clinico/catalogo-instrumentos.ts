"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/patients";
import type { InstrumentoSchema } from "@/types/instrumento";

export async function getInstrumentoById(
  id: string,
): Promise<ActionResult<InstrumentoSchema>> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase
    .from("instrumentos_valoracion")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return { success: false, error: "Instrumento no encontrado" };
  return { success: true, data: data as InstrumentoSchema };
}

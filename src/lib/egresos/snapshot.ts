import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfesionalPerfil } from "@/lib/fce/profesional";
import type { SnapshotEquipoTratante } from "@/types/egreso";

export async function calcularSnapshotEquipoTratante(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string,
  profesionalFirmante: ProfesionalPerfil,
): Promise<SnapshotEquipoTratante> {
  // 1. Fetch all finalized encuentros for this patient+clinic
  const { data: encuentros } = await supabase
    .from("fce_encuentros")
    .select("id, id_profesional, created_at, especialidad")
    .eq("id_paciente", idPaciente)
    .eq("id_clinica", idClinica)
    .eq("status", "finalizado")
    .order("created_at", { ascending: true });

  const rows = encuentros ?? [];

  // 2. Collect unique profesional IDs
  const profIds = [...new Set(rows.map((r) => r.id_profesional).filter(Boolean) as string[])];

  // 3. Batch-fetch profesional names (no N+1)
  const profMap = new Map<string, { nombre: string; especialidad: string }>();
  if (profIds.length > 0) {
    const { data: profs } = await supabase
      .from("profesionales")
      .select("id, nombre, especialidad")
      .in("id", profIds);
    for (const p of profs ?? []) {
      profMap.set(p.id, { nombre: p.nombre ?? "Profesional", especialidad: p.especialidad ?? "" });
    }
  }

  // 4. Count encuentros per profesional
  const countMap = new Map<string, number>();
  for (const enc of rows) {
    if (!enc.id_profesional) continue;
    countMap.set(enc.id_profesional, (countMap.get(enc.id_profesional) ?? 0) + 1);
  }

  // 5. Build profesionales array sorted by most encounters
  const profesionales = Array.from(countMap.entries())
    .map(([id, count]) => {
      const prof = profMap.get(id);
      return {
        nombre: prof?.nombre ?? "Profesional",
        especialidad: prof?.especialidad ?? "",
        encuentros: count,
      };
    })
    .sort((a, b) => b.encuentros - a.encuentros);

  // 6. Date range
  const primer_encuentro = rows[0]?.created_at
    ? rows[0].created_at.slice(0, 10)
    : null;
  const ultimo_encuentro = rows[rows.length - 1]?.created_at
    ? rows[rows.length - 1].created_at.slice(0, 10)
    : null;

  return {
    profesionales,
    primer_encuentro,
    ultimo_encuentro,
    total_encuentros: rows.length,
    firmado_por: {
      nombre: profesionalFirmante.nombre,
      especialidad: profesionalFirmante.especialidad,
      numero_registro: profesionalFirmante.numero_registro ?? null,
      tipo_registro: profesionalFirmante.tipo_registro ?? null,
    },
  };
}

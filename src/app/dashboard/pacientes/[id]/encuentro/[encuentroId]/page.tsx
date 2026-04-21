import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getModeloDeEspecialidad, getRutaEncuentro } from "@/lib/modules/modelos";

function EncuentroNoClinico({ especialidad }: { especialidad: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <p className="text-ink-2">
        El encuentro de <strong>{especialidad}</strong> no tiene espacio clínico asociado.
      </p>
    </div>
  );
}

export default async function EncuentroRouter({
  params,
}: {
  params: Promise<{ id: string; encuentroId: string }>;
}) {
  const { id, encuentroId } = await params;
  const supabase = await createClient();

  const { data: encuentro, error } = await supabase
    .from("fce_encuentros")
    .select("id, especialidad, status")
    .eq("id", encuentroId)
    .eq("id_paciente", id)
    .single();

  if (error || !encuentro) notFound();

  const modelo = getModeloDeEspecialidad(encuentro.especialidad);

  if (modelo === "ninguno") {
    return <EncuentroNoClinico especialidad={encuentro.especialidad} />;
  }

  redirect(getRutaEncuentro(modelo, id, encuentroId));
}

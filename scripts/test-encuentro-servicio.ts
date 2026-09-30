/**
 * test-encuentro-servicio.ts
 *
 * Cubre el fix de getEncuentroContext: citas.id_profesional_servicio es FK a
 * profesional_servicios.id, no a servicios.id. Sin DB (cliente fake).
 *
 * USO: npm run test:encuentro-servicio
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extraerNombreServicio,
  getNombreServicioDeProfesionalServicio,
} from "../src/lib/servicios/nombre-servicio";

let fallos = 0;
function check(nombre: string, ok: boolean) {
  console.log(`${ok ? "✅" : "❌"} ${nombre}`);
  if (!ok) fallos++;
}

const ID_PS = "ps-1";

type Llamada = { tabla: string; select: string; col: string; val: string };

function fakeClient(filas: Record<string, unknown>, llamadas: Llamada[]): SupabaseClient {
  return {
    from(tabla: string) {
      return {
        select(select: string) {
          return {
            eq(col: string, val: string) {
              llamadas.push({ tabla, select, col, val });
              const fila = tabla === "profesional_servicios" && col === "id" ? filas[val] ?? null : null;
              return { maybeSingle: async () => ({ data: fila, error: null }) };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

async function main() {
  // extraerNombreServicio
  check("embed objeto", extraerNombreServicio({ nombre: "Kinesiterapia" }) === "Kinesiterapia");
  check("embed array", extraerNombreServicio([{ nombre: "Kinesiterapia" }]) === "Kinesiterapia");
  check("embed null", extraerNombreServicio(null) === null);
  check("embed array vacío", extraerNombreServicio([]) === null);
  check("nombre null", extraerNombreServicio({ nombre: null }) === null);

  // Cita con id_profesional_servicio: consulta profesional_servicios (no servicios)
  const llamadas: Llamada[] = [];
  const client = fakeClient({ [ID_PS]: { servicios: { nombre: "Masaje descontracturante" } } }, llamadas);
  const nombre = await getNombreServicioDeProfesionalServicio(client, ID_PS);
  check("resuelve nombre vía profesional_servicios", nombre === "Masaje descontracturante");
  check(
    "consulta profesional_servicios con join servicios(nombre)",
    llamadas.length === 1 &&
      llamadas[0].tabla === "profesional_servicios" &&
      llamadas[0].select === "servicios(nombre)" &&
      llamadas[0].val === ID_PS,
  );
  check("no consulta servicios directo con el id de profesional_servicios", !llamadas.some((l) => l.tabla === "servicios"));

  // id inexistente
  const sinFila = await getNombreServicioDeProfesionalServicio(fakeClient({}, []), "no-existe");
  check("id inexistente → null", sinFila === null);

  console.log(fallos === 0 ? "\n✅ encuentro-servicio: todos los casos pasan." : `\n❌ ${fallos} fallos.`);
  process.exit(fallos === 0 ? 0 : 1);
}

main();

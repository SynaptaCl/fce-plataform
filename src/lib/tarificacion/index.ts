export * from "./tipos";
export * from "./resolver";
export * from "./calcular";
// contexto.ts es server-side (usa SupabaseClient): export manual para no
// arrastrarlo a bundles de cliente que importan el barrel.
export {
  cargarContextoTarificacion,
  construirLineas,
  filaItemDesdeLinea,
} from "./contexto";
export type { ContextoTarificacion, ResultadoContexto, ResultadoLineas } from "./contexto";

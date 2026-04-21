// Re-exporta los tipos desde el server action para que componentes
// puedan importar sin depender de @/app/actions/timeline directamente.
export type { TimelineEntryType, TimelineEntry, PatientSummary } from "@/app/actions/timeline";

import { ESTADO_CONFIG } from "./OdontogramaPieza";
import type { EstadoPieza } from "@/types";

const ESTADOS_COMUNES: EstadoPieza[] = [
  "sano", "caries", "obturado", "corona", "ausente",
  "endodoncia", "implante", "protesis_fija", "extraccion_indicada",
  "sellante", "fracturado", "en_erupcion",
];

export function OdontogramaLeyenda() {
  return (
    <div className="mt-3 px-1">
      <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-2">Leyenda</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {ESTADOS_COMUNES.map((estado) => {
          const cfg = ESTADO_CONFIG[estado];
          return (
            <div key={estado} className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 h-4 rounded-sm border"
                style={{ background: cfg.fill, borderColor: cfg.stroke }}
              />
              <span className="text-xs text-ink-2">{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

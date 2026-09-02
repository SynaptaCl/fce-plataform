// src/lib/ia/copiloto-nota/types.ts

export interface EstructurarNotaInput {
  idEncuentro: string
  idClinica: string
  bullets: string
  seccion?: 'S' | 'O' | 'P'
}

export interface BorradorNota {
  contenido: string
  especialidad: string
  /** 'ambient' cambia el disclaimer del panel (AMB-1 §8) — default 'copiloto' si se omite. */
  origen?: 'copiloto' | 'ambient'
}

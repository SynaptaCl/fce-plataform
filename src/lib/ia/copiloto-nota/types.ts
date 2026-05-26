// src/lib/ia/copiloto-nota/types.ts

export interface EstructurarNotaInput {
  idEncuentro: string
  idClinica: string
  bullets: string
}

export interface BorradorNota {
  contenido: string
  especialidad: string
}

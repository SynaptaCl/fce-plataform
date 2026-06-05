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
}

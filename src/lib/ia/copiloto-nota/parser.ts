// src/lib/ia/copiloto-nota/parser.ts

/**
 * Parsea la respuesta JSON de Claude. Solo extrae `contenido`; `especialidad` la aporta la server action desde fce_encuentros.
 */
export function parseBorradorNota(rawText: string): { contenido: string } {
  let raw = rawText.trim()
  // Limpiar posibles bloques de código que el modelo añada a pesar de las instrucciones
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '').trim()
  }
  const parsed = JSON.parse(raw) as { contenido?: unknown }
  if (typeof parsed.contenido !== 'string') {
    throw new Error(`parseBorradorNota: campo "contenido" ausente o no es string`)
  }
  return { contenido: parsed.contenido }
}

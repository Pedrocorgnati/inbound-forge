/**
 * TASK-11 ST002 (CL-TA-041, CL-CS-034): helper para busca textual reutilizavel
 * (Lead, ContentPiece e entidades futuras de TASK-22).
 */

const MIN_LENGTH = 2
const MAX_LENGTH = 100

/**
 * Normaliza, trunca e escapa wildcards (`%`, `_`).
 * Retorna null se a string nao atende criterios (< MIN_LENGTH).
 */
export function sanitizeSearchTerm(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.length < MIN_LENGTH) return null
  const truncated = trimmed.slice(0, MAX_LENGTH)
  return truncated.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export type SearchWhere<Field extends string> = {
  OR: Array<Partial<Record<Field, { contains: string; mode: 'insensitive' }>>>
}

/**
 * Monta `OR` de ILIKEs (`contains` insensitive) para os campos fornecidos.
 * Retorna `undefined` quando o termo nao e utilizavel.
 */
export function buildSearchWhere<Field extends string>(
  search: string | null | undefined,
  fields: readonly Field[],
): SearchWhere<Field> | undefined {
  const term = sanitizeSearchTerm(search)
  if (!term || fields.length === 0) return undefined
  return {
    OR: fields.map(
      (f) =>
        ({ [f]: { contains: term, mode: 'insensitive' as const } }) as Partial<
          Record<Field, { contains: string; mode: 'insensitive' }>
        >,
    ),
  }
}

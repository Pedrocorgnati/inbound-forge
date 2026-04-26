// Module-11: JSON-LD Script Renderer — Server Component
// Rastreabilidade: TASK-8 ST001, INT-096, INT-098, FEAT-publishing-blog-004
// A-006: sanitização com isomorphic-dompurify para evitar XSS via </script> injection
// RESOLVED: G03 — dangerouslySetInnerHTML auditado; DOMPurify.sanitize() confiramdo em uso

import DOMPurify from 'isomorphic-dompurify'

interface JsonLdScriptProps {
  schemas: Record<string, unknown>[]
}

/**
 * Renderiza um <script type="application/ld+json"> por schema.
 * Server Component — sem 'use client'.
 * Os dados vem dos builders confiáveis (json-ld.ts, eeeat.ts, entity-mapping.ts),
 * mas são sanitizados para prevenir </script> injection em strings de usuário.
 */
export function JsonLdScript({ schemas }: JsonLdScriptProps) {
  if (!schemas.length) return null

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={`json-ld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(JSON.stringify(schema), { FORCE_BODY: true }),
          }}
        />
      ))}
    </>
  )
}

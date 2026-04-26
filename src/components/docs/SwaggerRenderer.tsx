'use client'

// TASK-21 ST002 (CL-230l): Swagger UI via CDN bundle — evita adicionar
// dependencia npm pesada para uma tela interna. Carrega swagger-ui-dist em
// <script>/<link> e inicializa em um div local.

import { useEffect, useRef, useState } from 'react'

const SWAGGER_VERSION = '5.17.14'
const CSS_HREF = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`
const JS_SRC = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`

interface Props {
  specUrl: string
}

declare global {
  interface Window {
    SwaggerUIBundle?: (options: Record<string, unknown>) => unknown
  }
}

export function SwaggerRenderer({ specUrl }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!document.querySelector(`link[data-swagger-css="${SWAGGER_VERSION}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = CSS_HREF
      link.dataset.swaggerCss = SWAGGER_VERSION
      document.head.appendChild(link)
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-swagger-js="${SWAGGER_VERSION}"]`,
    )
    if (existing) {
      setReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = JS_SRC
    script.async = true
    script.dataset.swaggerJs = SWAGGER_VERSION
    script.onload = () => setReady(true)
    script.onerror = () => setError('Falha ao carregar Swagger UI bundle')
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!ready || !ref.current || typeof window.SwaggerUIBundle !== 'function') return
    try {
      window.SwaggerUIBundle({
        url: specUrl,
        domNode: ref.current,
        deepLinking: true,
        persistAuthorization: true,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao inicializar UI')
    }
  }, [ready, specUrl])

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div
      className="swagger-ui-container bg-white"
      data-testid="swagger-ui-root"
      ref={ref}
    >
      {!ready && <p className="p-4 text-sm text-muted-foreground">Carregando API docs...</p>}
    </div>
  )
}

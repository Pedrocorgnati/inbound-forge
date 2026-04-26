'use client'

// global-error.tsx captura falhas no root layout (providers, middleware, DB init).
// Deve ser autônomo: sem imports de /components — usa apenas HTML básico.

import { useEffect } from 'react'
import { captureException } from '@/lib/sentry'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    captureException(error, { digest: error.digest, boundary: 'global-error' })
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#f1f5f9' }}>
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '5rem', fontWeight: 700, color: 'rgba(239,68,68,0.2)', margin: 0 }}>500</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>Erro crítico na aplicação</h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            Ocorreu um erro inesperado. Nosso time foi notificado.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              Código: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Tentar novamente
            </button>
            <a
              href="/"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Voltar ao início
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}

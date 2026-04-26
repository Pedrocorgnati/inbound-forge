/**
 * Next.js Instrumentation API — executa uma vez no startup do servidor.
 * Valida variáveis de ambiente + inicializa Sentry (RESOLVED: G005).
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/utils/env')
    validateEnv()
  }

  // Sentry server init — migrado de sentry.server.config.ts
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }

}

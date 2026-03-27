// module-9: Image Worker — Environment Validation (fail-fast)
// Rastreabilidade: TASK-0 ST004/ST005, SEC-001, QUAL-002

import { z } from 'zod'

const WorkerEnvSchema = z.object({
  DATABASE_URL:               z.string().min(1),
  UPSTASH_REDIS_REST_URL:     z.string().url(),
  UPSTASH_REDIS_REST_TOKEN:   z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL:   z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY:  z.string().min(1),
  SUPABASE_STORAGE_BUCKET:    z.string().default('inbound-forge-assets'),
  IDEOGRAM_API_KEY:           z.string().min(1),
  FAL_API_KEY:                z.string().min(1),
  IMAGE_WORKER_TIMEOUT_MS:    z.coerce.number().int().positive().default(60_000),
})

export type WorkerEnv = z.infer<typeof WorkerEnvSchema>

/**
 * Valida e retorna as variáveis de ambiente do worker.
 * Chama process.exit(1) com mensagem descritiva se inválidas.
 * DEVE ser o primeiro import no entry point do worker (antes de Redis, Prisma, etc.)
 */
export function loadWorkerEnv(): WorkerEnv {
  const result = WorkerEnvSchema.safeParse(process.env)

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')

    process.stderr.write(
      `[FATAL] Variáveis de ambiente inválidas:\n${issues}\n` +
      `Processo encerrado. Verifique o arquivo .env.example para referência.\n`
    )
    process.exit(1)
  }

  return result.data
}

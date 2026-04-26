// Video Worker — Environment Validation (fail-fast)
// Integração: Short Video Maker MCP

import { z } from 'zod'

const WorkerEnvSchema = z.object({
  DATABASE_URL:               z.string().min(1),
  UPSTASH_REDIS_REST_URL:     z.string().url(),
  UPSTASH_REDIS_REST_TOKEN:   z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL:   z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY:  z.string().min(1),
  SUPABASE_STORAGE_BUCKET:    z.string().default('inbound-forge-assets'),
  SHORT_VIDEO_MAKER_URL:      z.string().url().default('http://localhost:3123'),
  VIDEO_WORKER_TIMEOUT_MS:    z.coerce.number().int().positive().default(300_000),
})

export type VideoWorkerEnv = z.infer<typeof WorkerEnvSchema>

export function loadWorkerEnv(): VideoWorkerEnv {
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

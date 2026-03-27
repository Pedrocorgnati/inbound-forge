import { z } from 'zod'

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default('inbound-forge-assets'),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  WORKER_AUTH_TOKEN: z.string().min(32),
  PII_ENCRYPTION_KEY: z.string().min(1),
  // module-11: Blog SEO/GEO
  // Nota: NEXT_PUBLIC_BASE_URL serve como NEXT_PUBLIC_SITE_URL para canonical/hreflang
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default('Inbound Forge'),
  // NEXT_PUBLIC_GA4_MEASUREMENT_ID validado opcionalmente (ausente em dev)
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().optional(),
  // module-9: Image Worker
  IDEOGRAM_API_KEY: z.string().min(1),
  FAL_API_KEY: z.string().min(1),
  IMAGE_WORKER_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  // module-12: Instagram Graph API (INT-021, INT-118)
  // Opcionais em dev — app inicializa normalmente sem elas (publishing fica desabilitado)
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_USER_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),
})

export function validateEnv(): z.infer<typeof EnvSchema> {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Variáveis de ambiente inválidas:', result.error.flatten())
    throw new Error('Configuração de ambiente inválida. Verifique .env.example')
  }
  return result.data
}

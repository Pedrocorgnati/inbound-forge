import { z } from 'zod'

const EnvSchema = z.object({
  // ─── Supabase ──────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default('inbound-forge-assets'),

  // ─── Redis (Upstash) ───────────────────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // ─── Database ─────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1),

  // ─── App URLs ─────────────────────────────────────────────────────────────
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  // NEXT_PUBLIC_APP_URL é usado em callback-validation.ts e alert-email.ts
  NEXT_PUBLIC_APP_URL: z.string().url(),
  // NEXT_PUBLIC_BLOG_BASE_URL usado em utm-builder.ts (tem default no código, mas validamos)
  NEXT_PUBLIC_BLOG_BASE_URL: z.string().url().optional(),

  // ─── Segurança ────────────────────────────────────────────────────────────
  WORKER_AUTH_TOKEN: z.string().min(32),
  PII_ENCRYPTION_KEY: z.string().min(1),
  // INTERNAL_HEALTH_SECRET protege /api/v1/health/internal
  INTERNAL_HEALTH_SECRET: z.string().min(1),

  // ─── Anthropic (Claude AI) ────────────────────────────────────────────────
  // Usado diretamente em angle-generation.service.ts e channel-adaptation.service.ts
  ANTHROPIC_API_KEY: z.string().min(1),

  // ─── Analytics & Feature Flags (PostHog) ──────────────────────────────────
  // Opcionais — feature-flags.ts degrada graciosamente quando ausentes
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default('https://app.posthog.com'),

  // ─── Email (Resend) ───────────────────────────────────────────────────────
  // Opcionais — alert-email.ts degrada graciosamente quando ausentes
  RESEND_API_KEY: z.string().optional(),
  ALERT_EMAIL_TO: z.string().email().optional(),
  ALERT_EMAIL_FROM: z.string().email().optional(),

  // ─── Site ─────────────────────────────────────────────────────────────────
  // module-11: Blog SEO/GEO — NEXT_PUBLIC_BASE_URL serve como canonical/hreflang
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default('Inbound Forge'),
  // NEXT_PUBLIC_GA4_MEASUREMENT_ID — ausente em dev é esperado
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().optional(),

  // ─── Workers ──────────────────────────────────────────────────────────────
  // WORKER_BASE_URL: URL do image worker — default localhost:3001 em dev
  WORKER_BASE_URL: z.string().url().default('http://localhost:3001'),

  // ─── Image Worker (module-9) ───────────────────────────────────────────────
  IDEOGRAM_API_KEY: z.string().optional(),
  FAL_API_KEY: z.string().optional(),
  IMAGE_WORKER_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),

  // ─── Instagram Graph API (module-12 / INT-021, INT-118) ───────────────────
  // Opcionais em dev — publishing fica desabilitado sem elas
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_USER_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),

  // ─── Google Analytics 4 — Data API ────────────────────────────────────────
  // Opcionais — analytics server-side fica desabilitado sem elas (CL-067)
  GOOGLE_ANALYTICS_PROPERTY_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
})

export function validateEnv(): z.infer<typeof EnvSchema> & { hasGA4Config: boolean } {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Variáveis de ambiente inválidas:', result.error.flatten())
    throw new Error('Configuração de ambiente inválida. Verifique .env.example')
  }
  const hasGA4Config = !!(result.data.GOOGLE_ANALYTICS_PROPERTY_ID && result.data.GOOGLE_SERVICE_ACCOUNT_KEY)
  return { ...result.data, hasGA4Config }
}

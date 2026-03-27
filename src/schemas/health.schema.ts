import { z } from 'zod'

export const HeartbeatSchema = z.object({
  type: z.enum(['SCRAPING', 'IMAGE', 'PUBLISHING']),
  status: z.enum(['ACTIVE', 'IDLE', 'ERROR']),
  errorMessage: z.string().nullable().optional(),
})

export type HeartbeatInput = z.infer<typeof HeartbeatSchema>

// --- M15 Route Validation Schemas ---

export const CredentialTestBodySchema = z.object({
  service: z.enum(['anthropic', 'ideogram', 'instagram', 'supabase_url', 'supabase_anon']),
  key: z.string().min(1),
})

export const OnboardingProgressPatchSchema = z.object({
  completed: z.literal(true),
})

export const ApiUsageLogBodySchema = z.object({
  service: z.enum(['anthropic', 'ideogram', 'flux', 'browserless', 'instagram']),
  tokens: z.number().optional(),
  costUSD: z.number().nonnegative(),
  operationId: z.string().optional(),
})

export const AlertResolvePatchSchema = z.object({
  resolved: z.literal(true),
  resolvedNote: z.string().optional(),
})

export type CredentialTestBody = z.infer<typeof CredentialTestBodySchema>
export type OnboardingProgressPatch = z.infer<typeof OnboardingProgressPatchSchema>
export type ApiUsageLogBody = z.infer<typeof ApiUsageLogBodySchema>
export type AlertResolvePatch = z.infer<typeof AlertResolvePatchSchema>

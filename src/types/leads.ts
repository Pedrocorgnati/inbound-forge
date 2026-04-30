/**
 * Tipos do módulo de Leads e Conversões
 * Rastreabilidade: INT-024, INT-025, INT-029
 */
import type { Channel, FunnelStage, ConversionType, AttributionType, LeadStatus } from '@/types/enums'

// ─── Lead ─────────────────────────────────────────────────────────────────────

/** Lead com contactInfo mascarado (não descriptografado) */
export interface Lead {
  id: string
  name: string | null
  company: string | null
  /** Masked by default. Populated only when ?includeContact=true */
  contactInfo: string | null
  firstTouchPostId: string
  firstTouchThemeId: string
  channel: Channel | null
  funnelStage: FunnelStage | null
  status: LeadStatus
  lgpdConsent: boolean
  lgpdConsentAt: Date | null
  firstTouchAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/** Payload para criação de lead (contactInfo em plaintext — criptografado na API) */
export interface LeadCreate {
  firstTouchPostId: string
  firstTouchThemeId: string
  company?: string
  contactInfo?: string  // plaintext no input — encryptPII() antes de persistir
  channel?: Channel
  funnelStage?: FunnelStage
  lgpdConsent: boolean  // OBRIGATÓRIO true — COMP-003
  lgpdConsentAt?: Date
  firstTouchAt?: Date
  notes?: string
}

/** Payload para atualização parcial */
export type LeadUpdate = Partial<Omit<LeadCreate, 'firstTouchPostId' | 'firstTouchThemeId'>>

/** Lead com relações expandidas */
export interface LeadWithRelations extends Lead {
  conversions?: ConversionEvent[]
  reconciliations?: ReconciliationItem[]
}

// ─── ConversionEvent ──────────────────────────────────────────────────────────

export interface ConversionEvent {
  id: string
  leadId: string
  type: ConversionType
  attribution: AttributionType
  occurredAt: Date
  notes: string | null
  createdAt: Date
}

export interface ConversionEventCreate {
  leadId: string
  type: ConversionType
  attribution?: AttributionType
  occurredAt: Date
  notes?: string
}

// ─── UTMLink ─────────────────────────────────────────────────────────────────

export interface UTMLink {
  id: string
  postId: string
  source: string
  medium: string
  campaign: string
  content: string
  fullUrl: string
  clicks: number
  createdAt: Date
}

// ─── ReconciliationItem ────────────────────────────────────────────────────────

export interface ReconciliationItem {
  id: string
  type: string
  postId: string | null
  leadId: string | null
  weekOf: Date
  resolved: boolean
  resolution: string | null
  createdAt: Date
}

// ─── Attribution ──────────────────────────────────────────────────────────────

export interface AttributionResult {
  type: AttributionType | 'INFERRED'
  postId?: string
  source?: string
  campaign?: string
  medium?: string
  confidence: number  // 0.0 - 1.0
  inferred: boolean
}

export interface AttributionDetail {
  firstTouch: AttributionResult | null
  assisted: AttributionResult[]
  fogApplied: boolean
}

/**
 * Publishing types — module-12-calendar-publishing
 * PostStatus e QueueStatus são union types (não duplicam enums Prisma).
 * Channel e ContentStatus são importados de @prisma/client via @/types/enums.
 */
import type { Channel } from '@/types/enums'

export type PostStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'FAILED'

export type QueueStatus = 'PENDING' | 'PROCESSING' | 'PAUSED' | 'DONE' | 'FAILED' | 'CANCELLED'

export interface PublishingPost {
  id: string
  contentPieceId: string | null
  channel: Channel
  caption: string
  hashtags: string[]
  cta: string
  ctaText: string | null
  ctaUrl: string | null
  imageUrl: string | null
  scheduledAt: Date | null
  publishedAt: Date | null
  status: PostStatus
  approvedAt: Date | null
  platform: string | null // 'instagram_graph_api' | 'linkedin_assisted'
  platformPostId: string | null
  errorMessage: string | null
  trackingUrl: string | null
  createdAt: Date
  updatedAt: Date
  /** Intake Review TASK-4 ST005 — id do PublishingQueue associado (para acoes do kebab). */
  queueId?: string | null
  /** Status do item na fila. Usado pelo kebab para expor "Pausar"/"Retomar". */
  queueStatus?: QueueStatus | null
}

export interface PublishingQueueItem {
  id: string
  postId: string
  channel: Channel | null
  scheduledAt: Date | null
  priority: number
  attempts: number
  maxAttempts: number
  lastError: string | null
  status: QueueStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * UTMLink — interface de parâmetros UTM para posts.
 * CX-04: trackingUrl é preenchido pelo module-13.
 * Reutiliza UTMParams de @/types/utm.ts e adiciona buildUTMUrl.
 */
export interface PostUTMLink {
  source: string
  medium: string
  campaign: string
  content?: string
  term?: string
}

export function buildUTMUrl(baseUrl: string, utm: PostUTMLink): string {
  const url = new URL(baseUrl)
  url.searchParams.set('utm_source', utm.source)
  url.searchParams.set('utm_medium', utm.medium)
  url.searchParams.set('utm_campaign', utm.campaign)
  if (utm.content) url.searchParams.set('utm_content', utm.content)
  if (utm.term) url.searchParams.set('utm_term', utm.term)
  return url.toString()
}

// DTOs para criação e atualização
export interface CreatePostDto {
  channel: Channel
  caption: string
  hashtags?: string[]
  ctaText?: string
  ctaUrl?: string
  imageUrl?: string
  scheduledAt?: string
  contentPieceId?: string
}

export interface UpdatePostDto {
  caption?: string
  hashtags?: string[]
  ctaText?: string
  ctaUrl?: string
  imageUrl?: string
  scheduledAt?: string
}

import { ContentStatus } from '@/types/enums'

// Transições válidas para o ContentStatus real do Prisma
// ContentStatus: DRAFT → REVIEW → APPROVED → PUBLISHED
//                              ↓
//                           PENDING_ART → APPROVED
//                DRAFT ← REVIEW (rejeição volta ao draft)
//                FAILED (estado de erro — permite nova tentativa via DRAFT)

const CONTENT_STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  [ContentStatus.DRAFT]: [ContentStatus.REVIEW, ContentStatus.FAILED, ContentStatus.CANCELLED],
  [ContentStatus.REVIEW]: [ContentStatus.APPROVED, ContentStatus.DRAFT, ContentStatus.FAILED, ContentStatus.CANCELLED],
  [ContentStatus.APPROVED]: [ContentStatus.PENDING_ART, ContentStatus.SCHEDULED, ContentStatus.PUBLISHED, ContentStatus.DRAFT, ContentStatus.CANCELLED],
  [ContentStatus.PENDING_ART]: [ContentStatus.APPROVED, ContentStatus.FAILED, ContentStatus.CANCELLED],
  [ContentStatus.SCHEDULED]: [ContentStatus.APPROVED, ContentStatus.PUBLISHED, ContentStatus.FAILED, ContentStatus.CANCELLED],
  [ContentStatus.PUBLISHED]: [ContentStatus.ROLLED_BACK],
  [ContentStatus.FAILED]: [ContentStatus.DRAFT],
  [ContentStatus.ROLLED_BACK]: [],
  [ContentStatus.CANCELLED]: [],
}

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return CONTENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function getAvailableTransitions(from: ContentStatus): ContentStatus[] {
  return CONTENT_STATUS_TRANSITIONS[from] ?? []
}

export function assertValidTransition(from: ContentStatus, to: ContentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `ERR-022: Transição inválida de ContentStatus.${from} para ContentStatus.${to}`
    )
  }
}

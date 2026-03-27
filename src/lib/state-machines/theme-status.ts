import { ThemeStatus } from '@/types/enums'

// Transições válidas para ThemeStatus real do Prisma
// ThemeStatus: ACTIVE, DEPRIORITIZED, REJECTED

const THEME_STATUS_TRANSITIONS: Record<ThemeStatus, ThemeStatus[]> = {
  [ThemeStatus.ACTIVE]: [ThemeStatus.DEPRIORITIZED, ThemeStatus.REJECTED],
  [ThemeStatus.DEPRIORITIZED]: [ThemeStatus.ACTIVE, ThemeStatus.REJECTED],
  [ThemeStatus.REJECTED]: [ThemeStatus.ACTIVE], // pode ser reativado
}

export function canTransition(from: ThemeStatus, to: ThemeStatus): boolean {
  return THEME_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function getAvailableTransitions(from: ThemeStatus): ThemeStatus[] {
  return THEME_STATUS_TRANSITIONS[from] ?? []
}

export function assertValidTransition(from: ThemeStatus, to: ThemeStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `ERR-022: Transição inválida de ThemeStatus.${from} para ThemeStatus.${to}`
    )
  }
}

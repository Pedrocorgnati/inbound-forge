/**
 * Constants de Atribuição — INT-073, INT-074, INT-075
 */

export const ATTRIBUTION_WINDOW_DAYS = 7

export const LEARN_TO_RANK_THRESHOLD = {
  posts: 50,
  conversions: 10,
} as const

export const ATTRIBUTION_CONFIDENCE = {
  WITH_UTM: 1.0,
  CHANNEL_ONLY: 0.6,
  ASSISTED: 0.7,
  FOG_INFERRED: 0.4,
  NO_DATA: 0.0,
} as const

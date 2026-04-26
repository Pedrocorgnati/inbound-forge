// Video Worker Constants — local copy for worker isolation
// Canonical source: src/lib/constants/video-worker.ts

export const VIDEO_WORKER_CONFIG = {
  maxRetries:          3,
  timeoutMs:           300_000,
  deadLetterAfter:     3,
  pollingIntervalMs:   5_000,
  statusCheckMs:       3_000,
  heartbeatIntervalMs: 30_000,
  blpopTimeoutSec:     5,
  costLogMaxEntries:   100,
} as const

export const REDIS_VIDEO_QUEUE_KEY = 'worker:video:queue' as const
export const REDIS_VIDEO_DEAD_LETTER_KEY = 'worker:video:dead-letter' as const

export const VIDEO_RETRY_BACKOFF_MS: readonly number[] = [10_000, 30_000, 60_000] as const

export const VIDEO_DEFAULT_CONFIG = {
  paddingBack: 1500,
  music: true,
  captionPosition: 'bottom' as const,
  captionBackgroundColor: '#000000CC',
  voice: 'af_heart',
  orientation: 'portrait' as const,
  musicVolume: 0.15,
} as const

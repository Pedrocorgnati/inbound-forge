// Video Worker Constants — Short Video Maker MCP Integration
// Rastreabilidade: integração short-video-maker, canais TIKTOK/YOUTUBE_SHORTS/INSTAGRAM
// Zero magic numbers — sempre importar estas constantes

import { REDIS_KEYS } from '@/constants/redis-keys'

// ─── Dimensões por Orientação ────────────────────────────────────────────────

export const VIDEO_DIMENSIONS = {
  PORTRAIT:  { width: 1080, height: 1920 },  // Reels, TikTok, Shorts
  LANDSCAPE: { width: 1920, height: 1080 },  // YouTube, LinkedIn
} as const

// ─── Worker Config ────────────────────────────────────────────────────────────

export const VIDEO_WORKER_CONFIG = {
  maxRetries:          3,
  timeoutMs:           300_000,  // 5 min — vídeos demoram mais que imagens
  deadLetterAfter:     3,
  pollingIntervalMs:   5_000,    // 5s — vídeos são mais lentos, polling menos agressivo
  statusCheckMs:       3_000,    // intervalo de poll do status no Short Video Maker
  heartbeatIntervalMs: 30_000,
  blpopTimeoutSec:     5,
  costLogMaxEntries:   100,
} as const

// Limite diário de gerações de vídeo
export const VIDEO_DAILY_LIMIT = 20

// ─── Provider ─────────────────────────────────────────────────────────────────

export const VIDEO_PROVIDER = {
  shortVideoMaker: {
    costUsd:  0.00,  // self-hosted, custo é infra (Pexels API grátis, Kokoro TTS local)
    label:    'Short Video Maker',
    useCase:  'Vídeos curtos com TTS, legendas automáticas e B-roll (Reels, TikTok, Shorts)',
  },
} as const

// ─── Configuração Padrão de Vídeo ────────────────────────────────────────────

export const VIDEO_DEFAULT_CONFIG = {
  paddingBack: 1500,
  music: true,
  captionPosition: 'bottom' as const,
  captionBackgroundColor: '#000000CC',
  voice: 'af_heart',            // Kokoro default voice (English)
  orientation: 'portrait' as const,
  musicVolume: 0.15,
} as const

// ─── Vozes Disponíveis (Kokoro TTS — English only) ──────────────────────────

export const KOKORO_VOICES = [
  'af_heart',     // American Female — default
  'af_bella',     // American Female
  'af_nicole',    // American Female
  'af_sarah',     // American Female
  'am_adam',      // American Male
  'am_michael',   // American Male
  'bf_emma',      // British Female
  'bm_george',    // British Male
] as const

export type KokoroVoice = typeof KOKORO_VOICES[number]

// ─── Redis Keys ───────────────────────────────────────────────────────────────

export const REDIS_VIDEO_QUEUE_KEY = REDIS_KEYS.VIDEO_QUEUE
export const REDIS_VIDEO_DEAD_LETTER_KEY = 'worker:video:dead-letter' as const
export const REDIS_VIDEO_JOB_KEY_TPL = 'video:{uuid}' as const

// ─── Backoff Exponencial ──────────────────────────────────────────────────────

export const VIDEO_RETRY_BACKOFF_MS: readonly number[] = [10_000, 30_000, 60_000] as const

// ─── Limitação de Idioma ──────────────────────────────────────────────────────
// Short Video Maker usa Kokoro TTS que suporta apenas inglês.
// Para conteúdo em português, os vídeos devem usar:
// 1. Legendas em português (texto sobreposto)
// 2. Narração em inglês com legendas PT-BR
// 3. Apenas B-roll + música + legendas (sem TTS)
export const VIDEO_TTS_LANGUAGE = 'en' as const

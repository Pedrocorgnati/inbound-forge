// Inbound Forge — Short Video Maker REST API Client
// Integração com gyoridavid/short-video-maker (Docker, porta 3123)
// TTS: Kokoro (English only) | B-roll: Pexels | Render: Remotion
// Rastreabilidade: integração video-worker, canais TIKTOK/YOUTUBE_SHORTS/INSTAGRAM

const DEFAULT_BASE_URL = 'http://localhost:3123'
const REQUEST_TIMEOUT_MS = 30_000
const STATUS_POLL_TIMEOUT_MS = 300_000 // 5 min max para vídeo ficar pronto

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoScene {
  text: string
  searchTerms: string[]
}

export interface VideoConfig {
  paddingBack?: number
  music?: boolean
  captionPosition?: 'top' | 'bottom'
  captionBackgroundColor?: string
  voice?: string
  orientation?: 'portrait' | 'landscape'
  musicVolume?: number
}

export interface CreateVideoRequest {
  scenes: VideoScene[]
  config?: VideoConfig
}

export interface CreateVideoResponse {
  videoId: string
}

export type VideoStatus = 'processing' | 'ready' | 'failed'

export interface VideoStatusResponse {
  status: VideoStatus
  url?: string           // URL do MP4 quando ready
  error?: string         // mensagem quando failed
  progress?: number      // 0-100
}

export interface VoiceInfo {
  id: string
  name: string
  language: string
}

export interface MusicTag {
  tag: string
  count: number
}

// ─── Client ───────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  return process.env.SHORT_VIDEO_MAKER_URL ?? DEFAULT_BASE_URL
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Short Video Maker API error ${response.status}: ${text}`)
  }

  return response.json() as Promise<T>
}

/**
 * Cria um vídeo curto com cenas, TTS e B-roll.
 * Retorna videoId para polling de status.
 */
export async function createShortVideo(
  payload: CreateVideoRequest
): Promise<CreateVideoResponse> {
  return request<CreateVideoResponse>('/api/short-video', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Consulta status de um vídeo em processamento.
 */
export async function getVideoStatus(
  videoId: string
): Promise<VideoStatusResponse> {
  return request<VideoStatusResponse>(`/api/short-video/${videoId}/status`)
}

/**
 * Baixa o MP4 finalizado como ArrayBuffer.
 */
export async function downloadVideo(
  videoId: string,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const url = `${getBaseUrl()}/api/short-video/${videoId}`
  const response = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(STATUS_POLL_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Short Video Maker download error ${response.status}`)
  }

  return response.arrayBuffer()
}

/**
 * Lista vozes disponíveis no Kokoro TTS.
 */
export async function listVoices(): Promise<VoiceInfo[]> {
  return request<VoiceInfo[]>('/api/voices')
}

/**
 * Lista tags de música disponíveis.
 */
export async function listMusicTags(): Promise<MusicTag[]> {
  return request<MusicTag[]>('/api/music-tags')
}

/**
 * Poll de status até ready/failed ou timeout.
 * Retorna a resposta final com URL do vídeo.
 */
export async function waitForVideo(
  videoId: string,
  pollIntervalMs = 3_000,
  timeoutMs = STATUS_POLL_TIMEOUT_MS
): Promise<VideoStatusResponse> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const status = await getVideoStatus(videoId)

    if (status.status === 'ready' || status.status === 'failed') {
      return status
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`Video ${videoId} timeout após ${timeoutMs}ms`)
}

/**
 * Testa conectividade com o Short Video Maker.
 */
export async function testVideoMakerConnection(): Promise<boolean> {
  try {
    await request<VoiceInfo[]>('/api/voices')
    return true
  } catch {
    return false
  }
}

/**
 * YouTube Shorts Publishing — Stub para integração pós-MVP
 * Rastreabilidade: CL-065, TASK-8 ST002
 *
 * @remarks
 * **Status:** POST-MVP — não implementado no MVP atual.
 *
 * **API necessária:** YouTube Data API v3
 * - Endpoint base: https://www.googleapis.com/youtube/v3/
 * - Upload endpoint: https://www.googleapis.com/upload/youtube/v3/videos
 * - Autenticação: OAuth 2.0 (Authorization Code Flow)
 * - Scopes: https://www.googleapis.com/auth/youtube.upload
 *
 * **Requisitos de vídeo (YouTube Shorts):**
 * - Duração: máximo 60 segundos
 * - Proporção: 9:16 vertical (obrigatório para ser classificado como Short)
 * - Resolução mínima: 1080x1920px recomendado
 * - Formatos: MP4, MOV, AVI, WMV, FLV, WebM
 * - Tamanho máximo: 256GB ou 12 horas
 *
 * **Fluxo de publicação:**
 * 1. POST /upload/youtube/v3/videos?uploadType=resumable — inicia upload resumível
 * 2. PUT {upload_uri} — envia chunks do vídeo
 * 3. Videos.update — define metadados (título, descrição, tags, category)
 * 4. Videos.list — verifica status de processamento
 *
 * **Limitações de rate:**
 * - Quota: 10.000 unidades/dia (upload = 1600 unidades)
 * - ~6 uploads/dia com quota padrão
 * - Possível solicitar aumento de quota via Google Cloud Console
 *
 * @see https://developers.google.com/youtube/v3/guides/uploading_a_video
 * @see https://developers.google.com/youtube/v3/docs/videos/insert
 */

import { NotImplementedError } from './tiktok.service'

export interface YouTubeShortMetadata {
  /** Título do Short (máx 100 caracteres) */
  title: string
  /** Descrição (máx 5000 caracteres) */
  description: string
  /** Tags para descoberta (máx 500 caracteres total) */
  tags?: string[]
  /** ID da categoria do YouTube (22 = People & Blogs, 28 = Science & Technology) */
  categoryId?: string
  /** Privacidade: public | private | unlisted */
  privacyStatus?: 'public' | 'private' | 'unlisted'
  /** Miniatura personalizada (URL pública ou path local) */
  thumbnailSource?: string
  /** Marcar como "Made for Kids" (COPPA) */
  madeForKids?: boolean
}

export interface YouTubeUploadResult {
  videoId: string
  /** URI para continuar o upload resumível */
  uploadUri: string
}

export interface YouTubePublishResult {
  videoId: string
  /** URL pública do Short */
  url: string
  /** Status de processamento: uploaded | processing | failed | processed */
  processingStatus: 'uploaded' | 'processing' | 'failed' | 'processed'
}

export interface YouTubeService {
  /**
   * Inicia o upload resumível de um Short.
   * @throws NotImplementedError — implementação pós-MVP
   */
  uploadShort(videoSource: string, metadata: YouTubeShortMetadata): Promise<YouTubeUploadResult>

  /**
   * Atualiza metadados de um vídeo já publicado.
   * @throws NotImplementedError — implementação pós-MVP
   */
  setMetadata(videoId: string, metadata: Partial<YouTubeShortMetadata>): Promise<void>

  /**
   * Publica o Short (torna público) e retorna URL final.
   * @throws NotImplementedError — implementação pós-MVP
   */
  publishShort(videoId: string): Promise<YouTubePublishResult>
}

export class YouTubeServiceImpl implements YouTubeService {
  constructor(
    private readonly accessToken: string // OAuth 2.0 access token do usuário
  ) {}

  async uploadShort(
    _videoSource: string,
    _metadata: YouTubeShortMetadata
  ): Promise<YouTubeUploadResult> {
    throw new NotImplementedError('YouTube Shorts is post-MVP')
  }

  async setMetadata(
    _videoId: string,
    _metadata: Partial<YouTubeShortMetadata>
  ): Promise<void> {
    throw new NotImplementedError('YouTube Shorts is post-MVP')
  }

  async publishShort(_videoId: string): Promise<YouTubePublishResult> {
    throw new NotImplementedError('YouTube Shorts is post-MVP')
  }
}

export function createYouTubeService(accessToken: string): YouTubeService {
  return new YouTubeServiceImpl(accessToken)
}

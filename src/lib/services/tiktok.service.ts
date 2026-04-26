/**
 * TikTok Content Posting — Stub para integração pós-MVP
 * Rastreabilidade: CL-064, TASK-8 ST001
 *
 * @remarks
 * **Status:** POST-MVP — não implementado no MVP atual.
 *
 * **API necessária:** TikTok Content Posting API v2
 * - Endpoint base: https://open.tiktokapis.com/v2/post/publish/
 * - Autenticação: OAuth 2.0 (Authorization Code Flow)
 * - Scopes: video.publish, video.upload
 *
 * **Requisitos de vídeo:**
 * - Duração: 3s – 60s (Shorts) ou até 10min (Long-form)
 * - Formatos: MP4, WebM, MOV
 * - Resolução mínima: 540x960px (9:16 vertical)
 * - Tamanho máximo: 4GB
 *
 * **Fluxo de publicação:**
 * 1. POST /v2/post/publish/video/init — inicializa upload, recebe upload_url + publish_id
 * 2. PUT {upload_url} — envia o arquivo de vídeo em chunks
 * 3. GET /v2/post/publish/status/fetch — verifica status (PROCESSING_UPLOAD → PUBLISH_COMPLETE)
 *
 * **Limitações de rate:**
 * - 30 requests/min por token de usuário
 * - 100 publicações/dia por conta
 *
 * @see https://developers.tiktok.com/doc/content-posting-api-get-started
 */

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotImplementedError'
  }
}

export interface TikTokVideoUploadRequest {
  /** Path local ou URL pública do arquivo de vídeo */
  videoSource: string
  /** Legenda do vídeo (máx 2200 caracteres) */
  caption: string
  /** Hashtags a incluir na legenda */
  hashtags?: string[]
  /** Privacidade: PUBLIC_TO_EVERYONE | MUTUAL_FOLLOW_FRIENDS | FOLLOWER_OF_CREATOR | SELF_ONLY */
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY'
  /** Desabilitar comentários */
  disableComment?: boolean
  /** Desabilitar dueto */
  disableDuet?: boolean
  /** Desabilitar stitch */
  disableStitch?: boolean
}

export interface TikTokUploadResult {
  publishId: string
  uploadUrl: string
}

export interface TikTokStatusResult {
  publishId: string
  /** PROCESSING_UPLOAD | SEND_TO_USER_INBOX | FAILED | PUBLISH_COMPLETE */
  status: 'PROCESSING_UPLOAD' | 'SEND_TO_USER_INBOX' | 'FAILED' | 'PUBLISH_COMPLETE'
  failReason?: string
}

export interface TikTokService {
  /**
   * Inicializa upload de vídeo no TikTok.
   * @throws NotImplementedError — implementação pós-MVP
   */
  uploadVideo(request: TikTokVideoUploadRequest): Promise<TikTokUploadResult>

  /**
   * Publica o vídeo após upload completo.
   * @throws NotImplementedError — implementação pós-MVP
   */
  publishShort(publishId: string): Promise<void>

  /**
   * Verifica status de publicação.
   * @throws NotImplementedError — implementação pós-MVP
   */
  checkStatus(publishId: string): Promise<TikTokStatusResult>
}

export class TikTokServiceImpl implements TikTokService {
  constructor(
    private readonly accessToken: string // OAuth 2.0 access token do usuário
  ) {}

  async uploadVideo(_request: TikTokVideoUploadRequest): Promise<TikTokUploadResult> {
    throw new NotImplementedError('TikTok integration is post-MVP')
  }

  async publishShort(_publishId: string): Promise<void> {
    throw new NotImplementedError('TikTok integration is post-MVP')
  }

  async checkStatus(_publishId: string): Promise<TikTokStatusResult> {
    throw new NotImplementedError('TikTok integration is post-MVP')
  }
}

export function createTikTokService(accessToken: string): TikTokService {
  return new TikTokServiceImpl(accessToken)
}

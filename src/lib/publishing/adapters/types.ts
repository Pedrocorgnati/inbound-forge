/**
 * ChannelAdapter — TASK-12 ST001 (CL-193)
 *
 * Contrato canonico de adaptadores de publishing. Cada canal (blog, linkedin,
 * instagram, tiktok, youtube) implementa esta interface. O publishing-worker
 * e routes HTTP falam APENAS com esta interface via factory `getAdapter`.
 *
 * Motivacao: INTAKE riscos §"mudancas de politica de plataformas revogam acesso
 * a APIs sem aviso" → camada de abstracao entre servicos de publicacao e APIs.
 */

export type PublishChannel = 'BLOG' | 'INSTAGRAM' | 'LINKEDIN' | 'TIKTOK' | 'YOUTUBE' | 'WHATSAPP'

export interface PublishPayload {
  postId: string
  channel: PublishChannel
  caption: string
  hashtags?: string[]
  ctaText?: string | null
  ctaUrl?: string | null
  mediaUrl?: string | null
  locale: string
  meta?: Record<string, unknown>
}

export interface PublishResult {
  ok: boolean
  /** Id remoto no canal, se aplicavel. */
  remoteId?: string
  /** Sinal para o worker: assisted = modo manual, auto = publicacao automatica. */
  mode: 'auto' | 'assisted'
  /** Mensagem humana opcional para logs e UI. */
  message?: string
  /** Erro tecnico quando ok=false. */
  error?: string
}

export interface ChannelAdapter {
  /** Canal canonico que este adapter serve. */
  readonly channel: PublishChannel
  /** Executa a publicacao. Throws em caso de erro irrecuperavel. */
  publish(payload: PublishPayload): Promise<PublishResult>
  /** Valida payload antes da publicacao (locale, tamanho, hashtags...). Throws em caso invalido. */
  validate(payload: PublishPayload): void
  /** Adapta payload para o formato do canal (trunca, reordena). */
  format(payload: PublishPayload): PublishPayload
}

export type ChannelAdapterFactory = () => ChannelAdapter

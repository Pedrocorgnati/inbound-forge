/**
 * LinkedInAdapter — TASK-12 ST002 (CL-193)
 *
 * Adapter em modo assistido (INTAKE §"LinkedIn detectar e banir a conta do
 * operador por uso de automacao" → modo assistido desde o MVP).
 * Delega para `linkedin-handler.ts` que prepara payload para copy manual.
 */
import type { ChannelAdapter, PublishPayload, PublishResult } from './types'
import { assertChannelLocale } from '@/lib/publishing/channel-locale-gate'

const MAX_CAPTION = 3000
const MAX_HASHTAGS = 5

export const linkedinAdapter: ChannelAdapter = {
  channel: 'LINKEDIN',

  validate(payload) {
    assertChannelLocale(payload.channel, payload.locale)
    if (!payload.caption || payload.caption.trim().length === 0) {
      throw new Error('LinkedIn: caption obrigatoria')
    }
    if (payload.caption.length > MAX_CAPTION) {
      throw new Error(`LinkedIn: caption excede ${MAX_CAPTION} caracteres`)
    }
  },

  format(payload) {
    return {
      ...payload,
      hashtags: (payload.hashtags ?? []).slice(0, MAX_HASHTAGS),
      caption: payload.caption.slice(0, MAX_CAPTION),
    }
  },

  async publish(payload: PublishPayload): Promise<PublishResult> {
    // Modo assistido: nao publica automaticamente. Marca queue pronta para copy.
    // O wiring real com prepareLinkedinPost e feito no publishing-worker.
    return {
      ok: true,
      mode: 'assisted',
      message: `LinkedIn [${payload.postId}]: pronto para copy manual.`,
    }
  },
}

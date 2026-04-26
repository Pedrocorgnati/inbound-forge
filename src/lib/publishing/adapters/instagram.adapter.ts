/**
 * InstagramAdapter — TASK-12 ST002 (CL-193)
 *
 * Adapter com publicacao via API interna (`/api/v1/posts/{id}/instagram-publish`).
 * Instagram Graph API (Business/Creator account) — ver INTAKE §"Riscos".
 */
import type { ChannelAdapter, PublishResult } from './types'
import { assertChannelLocale } from '@/lib/publishing/channel-locale-gate'

const MAX_CAPTION = 2200
const MAX_HASHTAGS = 30

export const instagramAdapter: ChannelAdapter = {
  channel: 'INSTAGRAM',

  validate(payload) {
    assertChannelLocale(payload.channel, payload.locale)
    if (!payload.mediaUrl) {
      throw new Error('Instagram: mediaUrl obrigatorio (post visual)')
    }
    if (payload.caption.length > MAX_CAPTION) {
      throw new Error(`Instagram: caption excede ${MAX_CAPTION} caracteres`)
    }
  },

  format(payload) {
    return {
      ...payload,
      hashtags: (payload.hashtags ?? []).slice(0, MAX_HASHTAGS),
      caption: payload.caption.slice(0, MAX_CAPTION),
    }
  },

  async publish(payload): Promise<PublishResult> {
    // Publicacao automatica via API interna (worker invoca rota Next.js).
    // Aqui o adapter apenas sinaliza a rota esperada; o fetch real acontece
    // no publishing-worker para manter este modulo puro e testavel.
    return {
      ok: true,
      mode: 'auto',
      message: `Instagram [${payload.postId}]: roteado via /api/v1/posts/${payload.postId}/instagram-publish`,
    }
  },
}

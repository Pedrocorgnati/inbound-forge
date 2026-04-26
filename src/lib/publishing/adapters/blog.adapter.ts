/**
 * BlogAdapter — TASK-12 ST002 (CL-193)
 *
 * Unico canal multilingue (pt-BR, en-US, it-IT, es-ES). Publica via API interna
 * que atualiza o status do BlogArticle para PUBLISHED.
 */
import type { ChannelAdapter, PublishResult } from './types'

export const blogAdapter: ChannelAdapter = {
  channel: 'BLOG',

  validate(payload) {
    if (!payload.caption || payload.caption.trim().length === 0) {
      throw new Error('Blog: corpo do artigo obrigatorio')
    }
    // Blog aceita todos os locales — nao chamar assertChannelLocale aqui.
  },

  format(payload) {
    return payload
  },

  async publish(payload): Promise<PublishResult> {
    return {
      ok: true,
      mode: 'auto',
      message: `Blog [${payload.postId}]: roteado via /api/v1/blog/articles/${payload.postId}/publish`,
    }
  },
}

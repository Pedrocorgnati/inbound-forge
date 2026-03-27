/**
 * Instagram Client — Abstraction Layer (INT-119)
 * Isola a implementação da Graph API do resto do sistema.
 * Permite swap entre GraphApiInstagramClient e MockInstagramClient via injeção.
 * module-12-calendar-publishing | INT-021 | INT-119
 */
import { getInstagramConfig } from '@/lib/instagram-client'
import { PUBLISHING_QUEUE } from '@/lib/constants/publishing'

export interface InstagramPublishResult {
  platformPostId: string
  publishedAt: Date
}

export interface AccountStatus {
  accountOk: boolean
  followersCount: number
  username: string
}

export interface TokenRefreshResult {
  newToken: string
  expiresAt: Date
}

export interface InstagramClientInterface {
  publishPost(imageUrl: string, caption: string): Promise<InstagramPublishResult>
  getAccountStatus(): Promise<AccountStatus>
  refreshToken(): Promise<TokenRefreshResult>
}

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0'

export class GraphApiInstagramClient implements InstagramClientInterface {
  private token: string
  private businessAccountId: string

  constructor(token: string, businessAccountId: string) {
    this.token = token
    this.businessAccountId = businessAccountId
  }

  /**
   * Publica post no Instagram via Graph API (3 etapas):
   * 1. Criar container de mídia
   * 2. Polling até status FINISHED
   * 3. Publicar container
   */
  async publishPost(imageUrl: string, caption: string): Promise<InstagramPublishResult> {
    // Etapa 1: Criar container de mídia
    const mediaRes = await fetch(
      `${GRAPH_API_BASE}/${this.businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: this.token,
        }),
      }
    )

    if (!mediaRes.ok) {
      const err = await mediaRes.json().catch(() => ({}))
      const errorCode = (err as { error?: { code?: number } })?.error?.code
      if (errorCode === 100) {
        throw Object.assign(new Error('Conta pessoal não suporta publicação via API. Use uma conta Business.'), { code: 'SYS_004' })
      }
      throw new Error(`Falha ao criar container de mídia: ${JSON.stringify(err)}`)
    }

    const { id: containerId } = (await mediaRes.json()) as { id: string }

    // Etapa 2: Polling até FINISHED (máx 30s, a cada 3s)
    const maxAttempts = Math.ceil(
      PUBLISHING_QUEUE.pollingMaxSeconds / PUBLISHING_QUEUE.pollingIntervalSeconds
    )
    let finished = false

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, PUBLISHING_QUEUE.pollingIntervalSeconds * 1000))

      const statusRes = await fetch(
        `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${this.token}`
      )
      const { status_code } = (await statusRes.json()) as { status_code: string }

      if (status_code === 'FINISHED') {
        finished = true
        break
      }
    }

    if (!finished) {
      throw new Error('Timeout aguardando processamento do container de mídia')
    }

    // Etapa 3: Publicar container
    const publishRes = await fetch(
      `${GRAPH_API_BASE}/${this.businessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: this.token,
        }),
      }
    )

    if (!publishRes.ok) {
      throw new Error('Falha ao publicar container de mídia')
    }

    const { id: platformPostId } = (await publishRes.json()) as { id: string }
    return { platformPostId, publishedAt: new Date() }
  }

  async getAccountStatus(): Promise<AccountStatus> {
    const res = await fetch(
      `${GRAPH_API_BASE}/me?fields=id,username,account_type,followers_count&access_token=${this.token}`
    )
    const data = (await res.json()) as { username?: string; followers_count?: number; account_type?: string }

    return {
      accountOk: data.account_type === 'BUSINESS' || data.account_type === 'CREATOR',
      followersCount: data.followers_count ?? 0,
      username: data.username ?? '',
    }
  }

  async refreshToken(): Promise<TokenRefreshResult> {
    const config = getInstagramConfig()
    if (!config) throw new Error('Instagram não configurado')

    const res = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.appId}&client_secret=${config.appSecret}&fb_exchange_token=${this.token}`
    )
    const data = (await res.json()) as { access_token?: string; expires_in?: number }

    if (!data.access_token) throw new Error('Falha ao renovar token Instagram')

    const expiresAt = new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000)
    return { newToken: data.access_token, expiresAt }
  }
}

/**
 * Mock para testes — nenhuma requisição real à Graph API.
 */
export class MockInstagramClient implements InstagramClientInterface {
  async publishPost(_imageUrl: string, _caption: string): Promise<InstagramPublishResult> {
    return {
      platformPostId: `mock_${Date.now()}`,
      publishedAt: new Date(),
    }
  }

  async getAccountStatus(): Promise<AccountStatus> {
    return { accountOk: true, followersCount: 1000, username: 'mock_account' }
  }

  async refreshToken(): Promise<TokenRefreshResult> {
    return {
      newToken: 'mock_token_refreshed',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }
  }
}

/**
 * Factory — retorna cliente real ou mock conforme configuração.
 * Injeção de dependência via token e businessAccountId.
 */
export function createInstagramClient(
  token: string,
  businessAccountId: string,
  mock = false
): InstagramClientInterface {
  if (mock) return new MockInstagramClient()
  return new GraphApiInstagramClient(token, businessAccountId)
}

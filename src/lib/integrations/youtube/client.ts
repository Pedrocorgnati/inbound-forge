/**
 * YouTube Data API v3 — cliente
 * TASK-7 ST002 / CL-073 (pos-MVP)
 *
 * OAuth scopes: youtube.upload, youtube.readonly
 * Upload resumable chunked: /upload/youtube/v3/videos
 */
const _YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3'
const AUTH_URL = 'https://oauth2.googleapis.com/token'

export interface YouTubeTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface VideoUploadOptions {
  title: string
  description: string
  tags: string[]
  videoFilePath: string
  accessToken: string
}

export class YouTubeClient {
  private readonly clientId: string
  private readonly clientSecret: string

  constructor() {
    const id = process.env.YOUTUBE_CLIENT_ID
    const secret = process.env.YOUTUBE_CLIENT_SECRET
    if (!id || !secret) throw new Error('YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET obrigatorios')
    this.clientId = id
    this.clientSecret = secret
  }

  buildAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<YouTubeTokens> {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!res.ok) throw new Error(`YouTube token exchange falhou: ${res.status}`)
    const data = await res.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  }

  /** Inicia upload resumavel. Retorna URL de upload. */
  async initiateResumableUpload(options: VideoUploadOptions): Promise<string> {
    const res = await fetch(
      `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify({
          snippet: {
            title: options.title,
            description: options.description,
            tags: options.tags,
            categoryId: '22',
          },
          status: { privacyStatus: 'private' },
        }),
      }
    )
    if (!res.ok) throw new Error(`YouTube upload initiation falhou: ${res.status}`)
    const uploadUrl = res.headers.get('location')
    if (!uploadUrl) throw new Error('Upload URL ausente na resposta do YouTube')
    return uploadUrl
  }

  async getQuotaUsage(): Promise<number> {
    // Estimativa local: cada upload = 1600 unidades; limite diario = 10000
    // TODO: integrar com Google Cloud Quota API para valor real
    return 0
  }
}

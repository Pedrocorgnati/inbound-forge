/**
 * TikTok Content Posting API — cliente HTTP
 * TASK-6 ST001 / CL-072 (pos-MVP)
 *
 * Base URL: https://open.tiktokapis.com/v2
 * Rate-limit: 6 req/min por conta (enforced no channel adapter).
 */
import type {
  TikTokTokens,
  TikTokUserInfo,
  TikTokVideoUploadPayload,
  TikTokUploadResult,
  TikTokStatusResult,
} from './types'

const BASE_URL = 'https://open.tiktokapis.com/v2'
const AUTH_URL = 'https://open.tiktokapis.com/v2/oauth/token/'

export class TikTokClient {
  private readonly clientKey: string
  private readonly clientSecret: string

  constructor() {
    const key = process.env.TIKTOK_CLIENT_KEY
    const secret = process.env.TIKTOK_CLIENT_SECRET
    if (!key || !secret) {
      throw new Error('TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET obrigatorios')
    }
    this.clientKey = key
    this.clientSecret = secret
  }

  buildAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: 'user.info.basic,video.upload',
      redirect_uri: redirectUri,
      state,
    })
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TikTokTokens> {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })
    if (!res.ok) throw new Error(`TikTok token exchange falhou: ${res.status}`)
    const data = await res.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      openId: data.open_id,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  }

  async refreshToken(refreshToken: string): Promise<TikTokTokens> {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) throw new Error(`TikTok token refresh falhou: ${res.status}`)
    const data = await res.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      openId: data.open_id,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  }

  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    const res = await fetch(`${BASE_URL}/user/info/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`TikTok getUserInfo falhou: ${res.status}`)
    const data = await res.json()
    return data.data.user
  }

  async uploadVideo(accessToken: string, payload: TikTokVideoUploadPayload): Promise<TikTokUploadResult> {
    const res = await fetch(`${BASE_URL}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: payload.title,
          privacy_level: payload.privacyLevel,
          disable_duet: payload.disableDuet ?? false,
          disable_comment: payload.disableComment ?? false,
          disable_stitch: payload.disableStitch ?? false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: payload.videoUrl,
        },
      }),
    })
    if (!res.ok) throw new Error(`TikTok upload init falhou: ${res.status}`)
    const data = await res.json()
    return { publishId: data.data.publish_id }
  }

  async queryStatus(accessToken: string, publishId: string): Promise<TikTokStatusResult> {
    const res = await fetch(`${BASE_URL}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publish_id: publishId }),
    })
    if (!res.ok) throw new Error(`TikTok queryStatus falhou: ${res.status}`)
    const data = await res.json()
    return {
      status: data.data.status,
      failReason: data.data.fail_reason,
    }
  }
}


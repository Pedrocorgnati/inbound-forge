/**
 * TikTok Content Posting API — tipos
 * TASK-6 ST001 / CL-072 (pos-MVP)
 */

export interface TikTokTokens {
  accessToken: string
  refreshToken: string
  openId: string
  expiresAt: number
}

export interface TikTokUserInfo {
  openId: string
  unionId: string
  displayName: string
  avatarUrl: string
}

export type TikTokPrivacyLevel = 'PUBLIC_TO_EVERYONE' | 'SELF_ONLY' | 'MUTUAL_FOLLOW_FRIENDS'

export interface TikTokVideoUploadPayload {
  title: string
  privacyLevel: TikTokPrivacyLevel
  disableDuet?: boolean
  disableComment?: boolean
  disableStitch?: boolean
  videoUrl: string
}

export interface TikTokUploadResult {
  publishId: string
}

export type TikTokPublishStatus = 'PROCESSING_UPLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED'

export interface TikTokStatusResult {
  status: TikTokPublishStatus
  failReason?: string
}

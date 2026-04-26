/**
 * Publishing Adapters — Factory — TASK-12 ST002 (CL-193)
 *
 * Ponto unico de resolucao de adapters por canal. O publishing-worker
 * e handlers HTTP chamam SEMPRE via `getAdapter(channel)` — nunca importam
 * adapters diretos.
 */
import type { ChannelAdapter, PublishChannel } from './types'
import { blogAdapter } from './blog.adapter'
import { instagramAdapter } from './instagram.adapter'
import { linkedinAdapter } from './linkedin.adapter'

const REGISTRY: Partial<Record<PublishChannel, ChannelAdapter>> = {
  BLOG: blogAdapter,
  INSTAGRAM: instagramAdapter,
  LINKEDIN: linkedinAdapter,
  // TIKTOK / YOUTUBE: pos-MVP — ver TASK-REFORGE-P3-TIKTOK-YOUTUBE (POST-MVP-ROADMAP).
  // WHATSAPP: pos-MVP.
}

export class UnknownChannelError extends Error {
  constructor(public readonly channel: string) {
    super(`Canal de publishing desconhecido ou nao suportado no MVP: ${channel}`)
    this.name = 'UnknownChannelError'
  }
}

export function getAdapter(channel: string): ChannelAdapter {
  const normalized = channel.toUpperCase() as PublishChannel
  const adapter = REGISTRY[normalized]
  if (!adapter) throw new UnknownChannelError(channel)
  return adapter
}

export function hasAdapter(channel: string): boolean {
  return REGISTRY[channel.toUpperCase() as PublishChannel] !== undefined
}

export function listSupportedChannels(): PublishChannel[] {
  return Object.keys(REGISTRY) as PublishChannel[]
}

export type { ChannelAdapter, PublishChannel, PublishPayload, PublishResult } from './types'

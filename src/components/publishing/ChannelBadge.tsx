'use client'

import { cn } from '@/lib/utils'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

interface ChannelBadgeProps {
  channel: string
  className?: string
}

const CHANNEL_STYLES: Record<string, string> = {
  INSTAGRAM: 'bg-[#E1306C] text-white',
  LINKEDIN: 'bg-[#0A66C2] text-white',
}

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  const upperChannel = channel.toUpperCase()
  const config = PUBLISHING_CHANNELS[upperChannel as keyof typeof PUBLISHING_CHANNELS]
  const label = config?.label ?? channel
  const colorClasses = CHANNEL_STYLES[upperChannel] ?? 'bg-gray-500 text-white'

  return (
    <span
      role="status"
      aria-label={`Canal: ${label}`}
      className={cn(
        'text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1',
        colorClasses,
        className,
      )}
    >
      {label}
    </span>
  )
}

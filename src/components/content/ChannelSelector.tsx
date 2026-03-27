'use client'

import type { Channel } from '@prisma/client'
import { Select } from '@/components/ui/select'

const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'BLOG', label: 'Blog' },
]

interface ChannelSelectorProps {
  value: Channel
  onChange: (channel: Channel) => void
  disabled?: boolean
  className?: string
}

export function ChannelSelector({ value, onChange, disabled, className }: ChannelSelectorProps) {
  return (
    <Select
      options={CHANNEL_OPTIONS}
      value={value}
      onChange={(e) => onChange(e.target.value as Channel)}
      disabled={disabled}
      aria-label="Selecionar canal de publicação"
      className={className}
      data-testid="channel-selector"
    />
  )
}

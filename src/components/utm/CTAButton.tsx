'use client'

import { Calendar, ExternalLink, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CTAButtonProps {
  variant: 'whatsapp' | 'blog' | 'calendar'
  url: string
  label?: string
  className?: string
}

const VARIANT_CONFIG = {
  whatsapp: {
    icon: MessageCircle,
    defaultLabel: 'Abrir no WhatsApp',
    className: 'bg-[#25D366] text-white hover:bg-[#1DA851] focus-visible:ring-[#25D366]',
    ariaPrefix: 'Abrir conversa no WhatsApp',
  },
  blog: {
    icon: ExternalLink,
    defaultLabel: 'Ver no Blog',
    className: 'bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-ring',
    ariaPrefix: 'Abrir link no blog',
  },
  calendar: {
    icon: Calendar,
    defaultLabel: 'Agendar reunião',
    className: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary',
    ariaPrefix: 'Abrir agenda Cal.com',
  },
} as const

export function CTAButton({ variant, url, label, className }: CTAButtonProps) {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon
  const displayLabel = label ?? config.defaultLabel

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ? `${config.ariaPrefix}: ${label}` : config.ariaPrefix}
      data-testid={`cta-button-${variant}`}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
        'min-h-[44px] min-w-[44px] px-4 py-2',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        config.className,
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {displayLabel}
    </a>
  )
}

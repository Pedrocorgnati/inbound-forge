'use client'

// NudgeTooltip — Tooltip contextual que explica o beneficio de cada acao do onboarding
// Rastreabilidade: CL-008, TASK-1 ST003

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Info, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NudgeTooltipProps {
  message: string
  position?: 'top' | 'right' | 'bottom' | 'left'
  icon?: 'info' | 'lightbulb'
  className?: string
}

export function NudgeTooltip({
  message,
  position = 'top',
  icon = 'lightbulb',
  className,
}: NudgeTooltipProps) {
  const Icon = icon === 'lightbulb' ? Lightbulb : Info

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={`Dica: ${message}`}
            className={cn(
              'inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground',
              'transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              className
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={position}
            sideOffset={6}
            className={cn(
              'z-50 max-w-xs rounded-lg px-3 py-2 text-xs leading-relaxed',
              'bg-foreground text-background shadow-md',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=left]:slide-in-from-right-2',
              'data-[side=right]:slide-in-from-left-2',
              'data-[side=top]:slide-in-from-bottom-2'
            )}
          >
            {message}
            <TooltipPrimitive.Arrow className="fill-foreground" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

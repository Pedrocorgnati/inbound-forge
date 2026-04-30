'use client'

// TASK-20 ST001 (CL-042): tooltip rico para ilustrar preenchimento de campos.
// Wrapper minimo ao redor de Radix Tooltip.

import * as Tooltip from '@radix-ui/react-tooltip'
import { HelpCircle } from 'lucide-react'

interface Props {
  exampleText: string
  title?: string
  screenshotUrl?: string
}

export function ExampleTooltip({ exampleText, title, screenshotUrl }: Props) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label="Ver exemplo"
            className="ml-1 inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
            data-testid="example-tooltip-trigger"
          >
            <HelpCircle className="h-4 w-4" aria-hidden />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-xs rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md"
          >
            {title && <p className="mb-1 text-sm font-medium">{title}</p>}
            <p className="whitespace-pre-line leading-relaxed">{exampleText}</p>
            {screenshotUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={screenshotUrl}
                alt={title ?? 'Exemplo'}
                className="mt-2 rounded border border-border"
                loading="lazy"
              />
            )}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

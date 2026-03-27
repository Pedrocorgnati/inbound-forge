'use client'

import * as React from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export interface CopyButtonProps {
  textToCopy: string
  size?: 'sm' | 'md'
  className?: string
}

export function CopyButton({ textToCopy, size = 'md', className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback silencioso — clipboard API pode nao estar disponivel
    }
  }

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'sm' : 'icon'}
      onClick={handleCopy}
      className={cn(copied && 'text-success', className)}
      aria-label={copied ? 'Copiado' : 'Copiar'}
    >
      {copied ? (
        <Check className={iconSize} />
      ) : (
        <Copy className={iconSize} />
      )}
    </Button>
  )
}

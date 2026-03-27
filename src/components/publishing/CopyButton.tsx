'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type CopyState = 'idle' | 'copying' | 'copied' | 'error'

interface CopyButtonProps {
  text: string
  label?: string
  className?: string
}

const STATE_CONFIG: Record<CopyState, { ariaLabel: string }> = {
  idle: { ariaLabel: 'Copiar texto' },
  copying: { ariaLabel: 'Copiando texto' },
  copied: { ariaLabel: 'Texto copiado' },
  error: { ariaLabel: 'Erro ao copiar texto' },
}

export function CopyButton({ text, label = 'Copiar texto', className }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle')

  const handleCopy = useCallback(async () => {
    if (state === 'copying') return

    setState('copying')

    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }, [text, state])

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={handleCopy}
        disabled={state === 'copying'}
        aria-label={STATE_CONFIG[state].ariaLabel}
        className={cn(
          'min-h-11 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
          'border border-gray-300 bg-white text-gray-700',
          'hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
          state === 'copied' && 'border-green-300 text-green-700 bg-green-50',
          state === 'error' && 'border-red-300 text-red-700 bg-red-50',
          className,
        )}
      >
        {state === 'idle' && (
          <>
            <Copy className="h-4 w-4" />
            <span>{label}</span>
          </>
        )}
        {state === 'copying' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Copiando...</span>
          </>
        )}
        {state === 'copied' && (
          <>
            <Check className="h-4 w-4" />
            <span>Copiado!</span>
          </>
        )}
        {state === 'error' && (
          <>
            <AlertCircle className="h-4 w-4" />
            <span>Erro ao copiar</span>
          </>
        )}
      </button>

      {state === 'error' && (
        <textarea
          readOnly
          value={text}
          rows={3}
          className="w-full rounded-md border border-red-200 bg-red-50 p-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
          aria-label="Texto para copiar manualmente"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
    </div>
  )
}

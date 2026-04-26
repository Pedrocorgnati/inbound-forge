'use client'

/**
 * CopyToClipboardButton — copia texto do angulo/post com feedback toast.
 * Intake Review TASK-4 ST004 (CL-081).
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy } from 'lucide-react'

interface Props {
  text: string
  label?: string
  className?: string
  'aria-label'?: string
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fallback below
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'absolute'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export function CopyToClipboardButton({ text, label = 'Copiar', className = '', ...rest }: Props) {
  const [copied, setCopied] = useState(false)

  async function handle() {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      toast.success('Copiado')
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('Falha ao copiar')
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={`inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50 ${className}`}
      aria-label={rest['aria-label'] ?? label}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      <span>{copied ? 'Copiado' : label}</span>
    </button>
  )
}

export default CopyToClipboardButton

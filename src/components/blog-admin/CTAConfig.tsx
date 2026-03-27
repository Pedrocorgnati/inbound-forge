'use client'

import * as React from 'react'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface CTAConfigProps {
  ctaType: string
  ctaUrl: string
  ctaLabel: string
  onCtaTypeChange: (value: string) => void
  onCtaUrlChange: (value: string) => void
  onCtaLabelChange: (value: string) => void
  errors?: {
    ctaType?: string
    ctaUrl?: string
    ctaLabel?: string
  }
}

const CTA_OPTIONS = [
  { value: '', label: 'Nenhum CTA' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'BLOG', label: 'Link para Blog' },
  { value: 'CONTACT_FORM', label: 'Formulario de Contato' },
]

export function CTAConfig({
  ctaType,
  ctaUrl,
  ctaLabel,
  onCtaTypeChange,
  onCtaUrlChange,
  onCtaLabelChange,
  errors,
}: CTAConfigProps) {
  return (
    <fieldset className="space-y-3 rounded-md border border-border p-4">
      <legend className="px-2 text-sm font-medium text-foreground">Call to Action (CTA)</legend>

      <Select
        label="Tipo de CTA"
        options={CTA_OPTIONS}
        value={ctaType}
        onChange={(e) => onCtaTypeChange(e.target.value)}
        error={errors?.ctaType}
      />

      {ctaType && (
        <>
          <Input
            label="URL do CTA"
            value={ctaUrl}
            onChange={(e) => onCtaUrlChange(e.target.value)}
            placeholder={ctaType === 'WHATSAPP' ? 'https://wa.me/5511999999999' : 'https://...'}
            error={errors?.ctaUrl}
          />
          <Input
            label="Texto do botao CTA"
            value={ctaLabel}
            onChange={(e) => onCtaLabelChange(e.target.value)}
            placeholder="Fale conosco"
            error={errors?.ctaLabel}
          />
        </>
      )}
    </fieldset>
  )
}

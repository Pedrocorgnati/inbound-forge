'use client'

import type { CTADestination } from '@prisma/client'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'

const CTA_OPTIONS: { value: string; label: string }[] = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'BLOG', label: 'Blog' },
  { value: 'CONTACT_FORM', label: 'Formulário de Contato' },
]

interface CTAConfiguratorProps {
  value: CTADestination
  customText: string
  onChange: (dest: CTADestination) => void
  onCustomTextChange: (text: string) => void
  disabled?: boolean
  className?: string
}

export function CTAConfigurator({
  value,
  customText,
  onChange,
  onCustomTextChange,
  disabled,
  className,
}: CTAConfiguratorProps) {
  return (
    <fieldset className={className} data-testid="cta-configurator">
      <legend className="text-sm font-medium text-foreground mb-3">
        Destino do CTA
      </legend>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as CTADestination)}
        disabled={disabled}
      >
        {CTA_OPTIONS.map((opt) => (
          <RadioGroupItem
            key={opt.value}
            value={opt.value}
            label={opt.label}
            data-testid={`cta-option-${opt.value}`}
          />
        ))}
      </RadioGroup>

      <div className="mt-3">
        <Input
          value={customText}
          onChange={(e) => onCustomTextChange(e.target.value)}
          placeholder="Texto personalizado do CTA (opcional)"
          maxLength={150}
          disabled={disabled}
          aria-label="Texto personalizado do CTA"
          data-testid="cta-custom-text"
        />
        <span className="text-xs text-muted-foreground mt-1 block">
          {customText.length} / 150 caracteres
        </span>
      </div>
    </fieldset>
  )
}

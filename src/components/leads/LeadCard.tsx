'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useFormatters } from '@/lib/i18n/formatters'
import type { Lead } from '@/types/leads'

interface LeadCardProps {
  lead: Lead
  /** Preferir `editHref` para navegação — suporta prefetch e Ctrl+Click. */
  editHref?: string
  onEdit?: () => void
  onDelete?: () => void
}

const CHANNEL_MAP: Record<string, { label: string; variant: 'blog' | 'linkedin' | 'instagram' }> = {
  BLOG: { label: 'Blog', variant: 'blog' },
  LINKEDIN: { label: 'LinkedIn', variant: 'linkedin' },
  INSTAGRAM: { label: 'Instagram', variant: 'instagram' },
}

const FUNNEL_MAP: Record<string, { label: string; variant: 'info' | 'warning' | 'success' }> = {
  AWARENESS: { label: 'Descoberta', variant: 'info' },
  CONSIDERATION: { label: 'Consideração', variant: 'warning' },
  DECISION: { label: 'Decisão', variant: 'success' },
}

export function LeadCard({ lead, editHref, onEdit, onDelete }: LeadCardProps) {
  const t = useTranslations()
  const fmt = useFormatters()
  const [contactVisible, setContactVisible] = useState(false)
  const [contactValue, setContactValue] = useState<string | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)

  const channelInfo = lead.channel ? CHANNEL_MAP[lead.channel] : null
  const funnelInfo = lead.funnelStage ? FUNNEL_MAP[lead.funnelStage] : null

  async function handleReveal() {
    if (contactVisible) {
      setContactVisible(false)
      setContactValue(null)
      return
    }

    setIsRevealing(true)
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}?includeContact=true`)
      if (!res.ok) throw new Error('Falha ao revelar contato')

      const data = await res.json()
      const decrypted = data.data?.contactInfo ?? data.contactInfo
      setContactValue(decrypted)
      setContactVisible(true)
    } catch {
      toast.error(t('leads.revealError'))
    } finally {
      setIsRevealing(false)
    }
  }

  return (
    <Card variant="elevated" data-testid={`lead-card-${lead.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">
            {lead.company ?? t('leads.noCompany')}
          </CardTitle>
          {channelInfo && (
            <Badge variant={channelInfo.variant}>{channelInfo.label}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Contact info - masked */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('leads.contact')}:</span>
            <span className="text-sm text-foreground font-mono" data-testid={`lead-contact-${lead.id}`}>
              {contactVisible && contactValue ? contactValue : '●●●●●●'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReveal}
              isLoading={isRevealing}
              className="h-7 px-2 text-xs"
              data-testid={`lead-reveal-${lead.id}`}
            >
              {contactVisible ? (
                <>
                  <EyeOff className="h-3 w-3" aria-hidden />
                  {t('leads.hide')}
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" aria-hidden />
                  {t('leads.reveal')}
                </>
              )}
            </Button>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {funnelInfo && (
              <Badge variant={funnelInfo.variant}>{funnelInfo.label}</Badge>
            )}
            <span>{fmt.date(lead.firstTouchAt)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        {editHref && (
          <Button asChild variant="outline" size="sm" data-testid={`lead-edit-${lead.id}`}>
            <Link href={editHref}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {t('common.edit')}
            </Link>
          </Button>
        )}
        {!editHref && onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            data-testid={`lead-edit-${lead.id}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {t('common.edit')}
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-danger hover:text-danger hover:bg-danger/10"
            data-testid={`lead-delete-${lead.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {t('common.delete')}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

'use client'

// ExportCSVButton — botão de exportação de analytics para CSV
// INT-109 | COMP-003: sem PII

import React, { memo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { AnalyticsPeriod } from '@/types/analytics'
import { trackEvent } from '@/lib/ga4'
import { GA4_EVENTS } from '@/constants/ga4-events'

interface ExportCSVButtonProps {
  period: AnalyticsPeriod
  variant?: 'default' | 'outline' | 'ghost'
}

function ExportCSVButtonComponent({ period, variant = 'outline' }: ExportCSVButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    if (isExporting) return
    setIsExporting(true)
    toast.info('Exportando...')

    try {
      const res = await fetch(`/api/v1/analytics/export?period=${period}`)
      if (!res.ok) {
        throw new Error('Erro ao gerar export')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().split('T')[0]
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-export-${date}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('CSV salvo')
      trackEvent({ name: GA4_EVENTS.ANALYTICS_EXPORTED, params: { period } })
    } catch {
      toast.error('Erro ao exportar CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant={variant}
      size="sm"
      disabled={isExporting}
      onClick={handleExport}
      aria-label="Exportar analytics para CSV"
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? 'Exportando...' : 'Exportar CSV'}
    </Button>
  )
}

export const ExportCSVButton = memo(ExportCSVButtonComponent)

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useCookieConsent } from './CookieConsentProvider'
import { ROUTES } from '@/constants/routes'

function ConsentSwitch({
  label,
  checked,
  onChange,
  id,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  id: string
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </label>
  )
}

export function CookieConsentBanner() {
  const { showBanner, acceptAll, declineAll, saveCustom } = useCookieConsent()
  const [showSettings, setShowSettings] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const [marketingEnabled, setMarketingEnabled] = useState(false)

  if (!showBanner) return null

  return (
    <div
      role="dialog"
      aria-label="Preferências de cookies"
      data-testid="cookie-consent-banner"
      className={cn(
        'fixed bottom-0 inset-x-0 z-50 bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-border',
        'pb-[env(safe-area-inset-bottom)]',
        'transition-[transform,opacity] duration-300 ease-out',
        'translate-y-0 opacity-100'
      )}
    >
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-5">
        {/* Texto principal */}
        <div className="flex items-start gap-3 mb-4">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Utilizamos cookies para melhorar sua experiência, analisar o tráfego do site e
            personalizar conteúdo. Ao clicar em &quot;Aceitar todos&quot;, você concorda com o uso
            de cookies conforme nossa{' '}
            <Link
              href={ROUTES.PRIVACY}
              className="text-primary underline underline-offset-2 hover:text-primary-hover transition-colors"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </div>

        {/* Painel de configurações */}
        {showSettings && (
          <div className="mb-4 space-y-2" data-testid="cookie-settings-panel">
            <div className="rounded-lg border border-border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Cookies funcionais</span>
                <span className="text-xs text-muted-foreground">Sempre ativo</span>
              </div>
            </div>
            <ConsentSwitch
              id="consent-analytics"
              label="Cookies de analytics"
              checked={analyticsEnabled}
              onChange={setAnalyticsEnabled}
            />
            <ConsentSwitch
              id="consent-marketing"
              label="Cookies de marketing"
              checked={marketingEnabled}
              onChange={setMarketingEnabled}
            />
            <Button
              variant="default"
              size="md"
              className="w-full mt-2"
              onClick={() => saveCustom(analyticsEnabled, marketingEnabled)}
              data-testid="cookie-save-preferences"
            >
              Salvar preferências
            </Button>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <Button
            variant="ghost"
            size="md"
            className="w-full sm:w-auto min-h-[44px]"
            onClick={() => setShowSettings((prev) => !prev)}
            data-testid="cookie-configure"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Configurar
          </Button>
          <Button
            variant="outline"
            size="md"
            className="w-full sm:w-auto min-h-[44px]"
            onClick={declineAll}
            data-testid="cookie-decline"
          >
            Recusar
          </Button>
          <Button
            variant="default"
            size="md"
            className="w-full sm:w-auto min-h-[44px]"
            onClick={acceptAll}
            data-testid="cookie-accept-all"
          >
            Aceitar todos
          </Button>
        </div>
      </div>
    </div>
  )
}

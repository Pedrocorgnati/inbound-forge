'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { CredentialTestCard } from '@/components/onboarding/CredentialTestCard'
import type { OnboardingState, CredentialTestResult } from '@/types/onboarding'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const CREDENTIALS = [
  { service: 'anthropic', serviceKey: 'anthropic', label: 'Anthropic API Key', required: true },
  { service: 'ideogram', serviceKey: 'ideogram', label: 'Ideogram API Key', required: false },
  { service: 'instagram', serviceKey: 'instagram', label: 'Instagram Access Token', required: false },
  { service: 'supabase-url', serviceKey: 'supabase_url', label: 'Supabase URL', required: true },
  { service: 'supabase-anon', serviceKey: 'supabase_anon', label: 'Supabase Anon Key', required: false },
] as const

interface CredentialsStepProps {
  state: OnboardingState
  setState: Dispatch<SetStateAction<OnboardingState>>
  onComplete: () => void
  onBack: () => void
}

export function CredentialsStep({ state, setState, onComplete, onBack }: CredentialsStepProps) {
  function handleResult(serviceKey: string, success: boolean) {
    setState((prev) => {
      const existing = prev.credentialResults.filter((r) => r.service !== serviceKey)
      const result: CredentialTestResult = {
        service: serviceKey,
        success,
        latencyMs: 0,
      }
      return { ...prev, credentialResults: [...existing, result] }
    })
  }

  const testedOk = (key: string) =>
    state.credentialResults.some((r) => r.service === key && r.success)

  const canAdvance = testedOk('anthropic') && testedOk('supabase_url')

  return (
    <div data-testid="credentials-step" className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure as credenciais de API necessarias. Pelo menos a <strong>Anthropic API Key</strong> e
        a <strong>Supabase URL</strong> sao obrigatorias para prosseguir.
      </p>

      <div className="space-y-4">
        {CREDENTIALS.map((cred) => (
          <CredentialTestCard
            key={cred.service}
            service={cred.service}
            serviceKey={cred.serviceKey}
            label={cred.label}
            onResult={(success) => handleResult(cred.serviceKey, success)}
          />
        ))}
      </div>

      {!canAdvance && (
        <p className="text-xs text-muted-foreground text-center">
          Teste pelo menos Anthropic API Key e Supabase URL para continuar.
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Button
          data-testid="credentials-back-btn"
          variant="ghost"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button
          data-testid="credentials-next-btn"
          onClick={onComplete}
          disabled={!canAdvance}
        >
          Proximo
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

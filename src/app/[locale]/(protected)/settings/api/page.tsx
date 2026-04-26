import { getTranslations } from 'next-intl/server'
import { ApiKeyForm } from '@/components/settings/ApiKeyForm'
// TASK-19 (CL-290): dialog de rotacao de API key.
import { ApiKeyRotateDialog } from '@/components/settings/ApiKeyRotateDialog'
import { TokenExpirationBanner } from '@/components/settings/TokenExpirationBanner'
import { CREDENTIAL_PROVIDERS } from '@/constants/settings'

export const dynamic = 'force-dynamic'

interface ProviderStatus {
  key: string
  label: string
  envVar: string
  configured: boolean
  masked: string | null
}

async function fetchStatus(): Promise<ProviderStatus[]> {
  return CREDENTIAL_PROVIDERS.map((p) => {
    const raw = process.env[p.envVar] ?? ''
    const configured = raw.length > 0
    return {
      key: p.key,
      label: p.label,
      envVar: p.envVar,
      configured,
      masked: configured ? maskKey(raw) : null,
    }
  })
}

function maskKey(v: string): string {
  if (v.length <= 8) return '••••'
  return `${v.slice(0, 4)}••••${v.slice(-4)}`
}

export default async function SettingsApiPage() {
  const t = await getTranslations('settings.api')
  const statuses = await fetchStatus()

  return (
    <section className="space-y-6">
      <TokenExpirationBanner />
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {statuses.map((s) => (
          <div key={s.key} className="space-y-2">
            <ApiKeyForm
              provider={s.key as never}
              label={s.label}
              envVar={s.envVar}
              masked={s.masked}
              configured={s.configured}
            />
            {['openai', 'ideogram', 'flux', 'browserless', 'anthropic'].includes(s.key) && (
              <ApiKeyRotateDialog
                provider={s.key as 'openai' | 'ideogram' | 'flux' | 'browserless' | 'anthropic'}
                label={s.label}
              >
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  data-testid={`rotate-${s.key}`}
                >
                  Rotacionar chave
                </button>
              </ApiKeyRotateDialog>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

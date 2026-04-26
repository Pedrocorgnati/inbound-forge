'use client'

/**
 * Intake-Review TASK-8 (CL-309): hook que traduz respostas de erro HTTP
 * em toasts amigaveis. Reconhece o shape padronizado de
 * `ExternalServiceError` (HTTP 503 com code=EXTERNAL_SERVICE_DOWN) e
 * gera mensagem i18n "{Servico} indisponivel — tente novamente em {X}s".
 */
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface ExternalDownBody {
  code: 'EXTERNAL_SERVICE_DOWN'
  service: string
  retryAfter: number
  message?: string
}

function isExternalDownBody(body: unknown): body is ExternalDownBody {
  return (
    !!body &&
    typeof body === 'object' &&
    (body as ExternalDownBody).code === 'EXTERNAL_SERVICE_DOWN' &&
    typeof (body as ExternalDownBody).service === 'string' &&
    typeof (body as ExternalDownBody).retryAfter === 'number'
  )
}

export function useApiError() {
  const t = useTranslations('errors')

  return useCallback(
    async (response: Response): Promise<void> => {
      let body: unknown = null
      try {
        body = await response.clone().json()
      } catch {
        body = null
      }

      if (response.status === 503 && isExternalDownBody(body)) {
        toast.error(
          t('externalServiceDown', { service: body.service, retryAfter: body.retryAfter }),
        )
        return
      }

      if (response.status >= 500) {
        toast.error(t('ERR-500'))
        return
      }

      const msg =
        (body && typeof body === 'object' ? (body as { message?: string }).message : undefined) ||
        t('generic')
      toast.error(msg)
    },
    [t],
  )
}

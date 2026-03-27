/**
 * GET /api/instagram/status — Status da conta Instagram + token + rate limits
 * Usado pelo InstagramPreChecks para exibir checklist pré-publicação.
 * module-12-calendar-publishing | INT-021
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { InstagramService } from '@/lib/services/instagram.service'

export async function GET(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const status = await InstagramService.getStatus()
    return ok(status)
  } catch {
    return internalError()
  }
}

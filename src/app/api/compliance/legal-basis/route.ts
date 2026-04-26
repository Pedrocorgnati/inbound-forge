/**
 * GET /api/compliance/legal-basis
 * TASK-1 ST005 / intake-review LGPD Compliance
 *
 * Retorna a documentação formal da base legal LGPD Art. 10 (CL-141).
 * Endpoint consultável para auditoria e transparência.
 * AUTH_001: JWT obrigatório.
 */
import { requireSession, ok } from '@/lib/api-auth'
import { LEGAL_BASIS } from '@/lib/compliance/legal-basis'

export async function GET() {
  const { response: authError } = await requireSession()
  if (authError) return authError

  return ok(LEGAL_BASIS)
}

import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'
import {
  detectClicksWithoutConversion,
  detectConversionsWithoutPost,
} from '@/lib/reconciliation-detector'

// POST /api/v1/reconciliation/sync — Detecta novos itens órfãos
// INT-106 | COMP-001: auditLog obrigatório
export async function POST(_request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  try {
    const [clicks, conversions] = await Promise.all([
      detectClicksWithoutConversion(),
      detectConversionsWithoutPost(),
    ])

    const created = clicks + conversions

    auditLog({
      action: 'reconciliation.sync',
      entityType: 'ReconciliationItem',
      entityId: 'sync',
      userId: user!.id,
      metadata: { clicksWithoutConversion: clicks, conversionsWithoutPost: conversions, created },
    }).catch(() => {})

    return ok({ created, clicksWithoutConversion: clicks, conversionsWithoutPost: conversions })
  } catch (err) {
    console.error('[reconciliation/sync]', err)
    return internalError('Erro ao executar sincronização de reconciliação')
  }
}

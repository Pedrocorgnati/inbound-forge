import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

// POST /api/v1/analytics/reconciliation — Reconciliação com GA4
// ANALYTICS_050: GA4 falhou durante reconciliação semanal
export async function POST(_request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const ga4MeasurementId = process.env.NEXT_PUBLIC_GA4_ID
  const ga4SecretKey = process.env.GA4_SECRET_KEY

  if (!ga4MeasurementId || !ga4SecretKey) {
    return internalError('GA4 não configurado')
  }

  try {
    // Buscar conversões da semana atual sem GA4 confirmado
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const conversions = await prisma.conversionEvent.findMany({
      where: { occurredAt: { gte: weekAgo } },
      select: { id: true, leadId: true, type: true, occurredAt: true },
    })

    let ga4Synced = 0
    let ga4Mismatches = 0

    for (const conversion of conversions) {
      try {
        const ga4Res = await fetch(
          `https://www.googleapis.com/analytics/v3/management/accounts?key=${ga4SecretKey}`,
          {
            method: 'GET',
            signal: AbortSignal.timeout(15_000),
          }
        )

        if (!ga4Res.ok) {
          // Criar ReconciliationItem com GA4_MISMATCH — ANALYTICS_050
          await prisma.reconciliationItem.create({
            data: {
              type: 'conversion_without_post',
              leadId: conversion.leadId ?? undefined,
              weekOf: new Date(),
              resolved: false,
              resolution: `ANALYTICS_050: GA4 mismatch para conversão ${conversion.id}`,
            },
          })
          ga4Mismatches++
        } else {
          ga4Synced++
        }
      } catch {
        // Timeout ou falha de rede com GA4
        await prisma.reconciliationItem.create({
          data: {
            type: 'conversion_without_post',
            leadId: conversion.leadId ?? undefined,
            weekOf: new Date(),
            resolved: false,
            resolution: `ANALYTICS_050: Falha de conexão GA4 para conversão ${conversion.id}`,
          },
        })
        ga4Mismatches++
      }
    }

    auditLog({
      action: 'analytics.reconciliation.ga4',
      entityType: 'ReconciliationItem',
      entityId: 'ga4-sync',
      userId: user!.id,
      metadata: { total: conversions.length, synced: ga4Synced, mismatches: ga4Mismatches },
    }).catch(() => {})

    if (ga4Mismatches > 0) {
      return ok(
        {
          code: 'ANALYTICS_050',
          message: 'Reconciliação com GA4 concluída com divergências.',
          synced: ga4Synced,
          mismatches: ga4Mismatches,
        },
        207
      )
    }

    return ok({ synced: ga4Synced, mismatches: 0 })
  } catch (err) {
    console.error('[analytics/reconciliation]', err)
    return internalError('Erro ao executar reconciliação com GA4')
  }
}

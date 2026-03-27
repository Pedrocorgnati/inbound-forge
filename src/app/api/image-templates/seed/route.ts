/**
 * POST /api/image-templates/seed — Seed dos 8 templates padrão (idempotente)
 *
 * Módulo: module-9-image-worker (TASK-5 ST002)
 * Rastreabilidade: TASK-5 ST001 ST002, FEAT-creative-generation-001
 */

import { NextResponse }         from 'next/server'
import { requireSession }       from '@/lib/api-auth'
import { imageTemplateService } from '@/lib/services/image-template.service'

export async function POST() {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  try {
    const seeded = await imageTemplateService.seed()
    return NextResponse.json({ seeded })
  } catch (err) {
    console.error('[image-templates/seed] POST error:', err)
    return NextResponse.json(
      { error: { code: 'IMAGE_063', message: 'Erro ao executar seed de templates.' } },
      { status: 500 }
    )
  }
}

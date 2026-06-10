/**
 * Rastreabilidade: CL-108, TASK-5 ST004
 * GET: retorna quota atual de cada provider de imagem.
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { checkQuota } from '@/lib/cost/quota-guard'

export async function GET() {
  const { user, response } = await requireSession()
  if (response) return response
  void user

  try {
    const [ideogram, flux] = await Promise.all([
      checkQuota('ideogram'),
      checkQuota('flux'),
    ])

    return NextResponse.json({
      providers: {
        ideogram: { ...ideogram, provider: 'ideogram' },
        flux: { ...flux, provider: 'flux' },
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

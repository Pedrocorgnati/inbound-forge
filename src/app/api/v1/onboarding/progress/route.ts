import { NextRequest, NextResponse } from 'next/server'
import { requireSession, badRequest, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'
import { OnboardingProgressPatchSchema } from '@/schemas/health.schema'

export const runtime = 'nodejs'

// GET /api/v1/onboarding/progress — retorna contagens para verificação de threshold
export async function GET() {
  const { user: _user, response } = await requireSession()
  if (response) return response

  try {
    // CaseLibraryEntry, PainLibraryEntry, SolutionPattern são base de conhecimento global
    // (sem operatorId no schema) — contar todos os registros da instância
    const [casesCount, painsCount, solutionsCount] = await Promise.all([
      prisma.caseLibraryEntry.count(),
      prisma.painLibraryEntry.count(),
      prisma.solutionPattern.count(),
    ])

    return NextResponse.json({
      counts: {
        cases: casesCount,
        pains: painsCount,
        solutions: solutionsCount,
      },
    })
  } catch {
    return internalError()
  }
}

// PATCH /api/v1/onboarding/progress — marca onboarding como concluído
export async function PATCH(req: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Corpo inválido')
  }

  try {
    OnboardingProgressPatchSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validação falhou', issues: err.errors },
        { status: 422 }
      )
    }
    return badRequest('VAL_001: Campo completed ausente ou falso')
  }

  try {
    // Upsert: cria ou atualiza o registro do operador com onboarding_completed=true
    // Nota: requer prisma generate após migration 20260326000003_module15_onboarding
    await prisma.$executeRaw`
      INSERT INTO operators (id, email, onboarding_completed, created_at, updated_at)
      VALUES (${user!.id}, ${user!.email ?? ''}, true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET onboarding_completed = true, updated_at = NOW()
    `

    // Setar cookie para o middleware (edge-compatible) sem precisar de DB call
    const res = NextResponse.json({ ok: true })
    res.cookies.set('inbound_forge_onboarded', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 ano
    })
    return res
  } catch {
    return internalError()
  }
}

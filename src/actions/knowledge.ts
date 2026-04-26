'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { CaseLibraryService } from '@/lib/services/case-library.service'
import { PainLibraryService } from '@/lib/services/pain-library.service'
import { SolutionPatternService } from '@/lib/services/solution-pattern.service'
import { ObjectionService } from '@/lib/services/objection.service'
import { CreateCaseDto, ListCasesQueryDto } from '@/lib/dtos/case-library.dto'
import { CreatePainDto, ListPainsQueryDto } from '@/lib/dtos/pain-library.dto'
import { CreatePatternDto, ListPatternsQueryDto } from '@/lib/dtos/solution-pattern.dto'
import { CreateObjectionDto, ListObjectionsQueryDto } from '@/lib/dtos/objection.dto'
import { KNOWLEDGE_THRESHOLDS, THRESHOLD_NUDGES } from '@/lib/constants/thresholds'
import { captureException } from '@/lib/sentry'
import { type ActionResult, actionSuccess, actionError } from '@/lib/action-utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOperatorId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user.id
}

async function checkSession(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

function formatZodError(error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ message: string }> }
    return zodError.issues.map((i) => i.message).join('; ')
  }
  return 'Dados inválidos'
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export async function getCases(query?: {
  page?: number
  limit?: number
  status?: string
  isDraft?: boolean
}) {
  if (!(await checkSession())) return { data: [], total: 0, error: 'Não autorizado' }
  try {
    const parsed = ListCasesQueryDto.parse({
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      status: query?.status,
      isDraft: query?.isDraft,
    })
    const result = await CaseLibraryService.findAll(parsed)
    return { data: result.data, total: result.total }
  } catch (err) {
    captureException(err, { action: 'getCases' })
    return { data: [], total: 0, error: 'Falha ao carregar cases' }
  }
}

export async function createCase(formData: {
  name: string
  sector: string
  systemType: string
  outcome: string
  hasQuantifiableResult?: boolean
  isDraft?: boolean
}): Promise<ActionResult<{ id: string }>> {
  try {
    await getOperatorId()
    const parsed = CreateCaseDto.parse(formData)
    const created = await CaseLibraryService.create(parsed)
    revalidatePath('/[locale]/knowledge', 'page')
    revalidateTag('cases')
    return actionSuccess({ id: created.id }, 'Case criado com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    captureException(err, { action: 'createCase' })
    return actionError(formatZodError(err))
  }
}

export async function updateCase(
  id: string,
  formData: {
    name?: string
    sector?: string
    systemType?: string
    outcome?: string
    hasQuantifiableResult?: boolean
    isDraft?: boolean
  },
): Promise<ActionResult> {
  try {
    await getOperatorId()
    await CaseLibraryService.update(id, formData)
    revalidatePath('/[locale]/knowledge', 'page')
    revalidateTag('cases')
    return actionSuccess(undefined, 'Case atualizado com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    captureException(err, { action: 'updateCase' })
    return actionError('Falha ao atualizar case')
  }
}

export async function deleteCase(id: string): Promise<ActionResult> {
  try {
    const operatorId = await getOperatorId()
    await CaseLibraryService.delete(id, operatorId)
    revalidatePath('/[locale]/knowledge', 'page')
    revalidateTag('cases')
    return actionSuccess(undefined, 'Case removido com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    captureException(err, { action: 'deleteCase' })
    return actionError('Falha ao remover case')
  }
}

// ─── Pains ────────────────────────────────────────────────────────────────────

export async function getPains(query?: {
  page?: number
  limit?: number
  sector?: string
  status?: string
}) {
  if (!(await checkSession())) return { data: [], total: 0, error: 'Não autorizado' }
  try {
    const parsed = ListPainsQueryDto.parse({
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      sector: query?.sector,
      status: query?.status,
    })
    const result = await PainLibraryService.findAll(parsed)
    return { data: result.data, total: result.total }
  } catch (err) {
    captureException(err, { action: 'getPains' })
    return { data: [], total: 0, error: 'Falha ao carregar dores' }
  }
}

export async function createPain(formData: {
  title: string
  description: string
  sectors: string[]
}): Promise<ActionResult<{ id: string }>> {
  try {
    await getOperatorId()
    const parsed = CreatePainDto.parse(formData)
    const created = await PainLibraryService.create(parsed)
    revalidatePath('/[locale]/knowledge', 'page')
    revalidateTag('pains')
    return actionSuccess({ id: created.id }, 'Dor criada com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    captureException(err, { action: 'createPain' })
    return actionError(formatZodError(err))
  }
}

export async function updatePain(
  id: string,
  formData: {
    title?: string
    description?: string
    sectors?: string[]
  },
): Promise<ActionResult> {
  try {
    await getOperatorId()
    await PainLibraryService.update(id, formData)
    revalidatePath('/[locale]/knowledge', 'page')
    revalidateTag('pains')
    return actionSuccess(undefined, 'Dor atualizada com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    captureException(err, { action: 'updatePain' })
    return actionError('Falha ao atualizar dor')
  }
}

export async function deletePain(id: string): Promise<ActionResult> {
  try {
    const operatorId = await getOperatorId()
    await PainLibraryService.delete(id, operatorId)
    revalidatePath('/[locale]/knowledge', 'page')
    revalidateTag('pains')
    return actionSuccess(undefined, 'Dor removida com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    captureException(err, { action: 'deletePain' })
    return actionError('Falha ao remover dor')
  }
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

export async function getPatterns(query?: {
  page?: number
  limit?: number
  painId?: string
}) {
  if (!(await checkSession())) return { data: [], total: 0, error: 'Não autorizado' }
  try {
    const parsed = ListPatternsQueryDto.parse({
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      painId: query?.painId,
    })
    const result = await SolutionPatternService.findAll(parsed)
    return { data: result.data, total: result.total }
  } catch (err) {
    captureException(err, { action: 'getPatterns' })
    return { data: [], total: 0, error: 'Falha ao carregar padrões' }
  }
}

export async function createPattern(formData: {
  name: string
  description: string
  painId: string
  caseId: string
}): Promise<ActionResult<{ id: string }>> {
  try {
    await getOperatorId()
    const parsed = CreatePatternDto.parse(formData)
    const created = await SolutionPatternService.create(parsed)
    revalidatePath('/[locale]/knowledge', 'page')
    revalidateTag('patterns')
    return actionSuccess({ id: created.id }, 'Padrão criado com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    if (err instanceof Error && err.message.startsWith('KNOWLEDGE_')) {
      return actionError(err.message)
    }
    captureException(err, { action: 'createPattern' })
    return actionError(formatZodError(err))
  }
}

// ─── Objections ───────────────────────────────────────────────────────────────

export async function getObjections(query?: {
  page?: number
  limit?: number
  type?: string
  status?: string
}) {
  if (!(await checkSession())) return { data: [], total: 0, error: 'Não autorizado' }
  try {
    const parsed = ListObjectionsQueryDto.parse({
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      type: query?.type,
      status: query?.status,
    })
    const result = await ObjectionService.findAll(parsed)
    return { data: result.data, total: result.total }
  } catch (err) {
    captureException(err, { action: 'getObjections' })
    return { data: [], total: 0, error: 'Falha ao carregar objeções' }
  }
}

export async function createObjection(formData: {
  content: string
  type: 'PRICE' | 'TRUST' | 'TIMING' | 'NEED' | 'AUTHORITY'
}): Promise<ActionResult<{ id: string }>> {
  try {
    await getOperatorId()
    const parsed = CreateObjectionDto.parse(formData)
    const created = await ObjectionService.create(parsed)
    revalidatePath('/[locale]/knowledge', 'page')
    revalidateTag('objections')
    return actionSuccess({ id: created.id }, 'Objeção criada com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    captureException(err, { action: 'createObjection' })
    return actionError(formatZodError(err))
  }
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export async function getKnowledgeProgress() {
  if (!(await checkSession())) {
    return {
      cases: { current: 0, threshold: KNOWLEDGE_THRESHOLDS.cases, unlocked: false },
      pains: { current: 0, threshold: KNOWLEDGE_THRESHOLDS.pains, unlocked: false },
      patterns: { current: 0, threshold: KNOWLEDGE_THRESHOLDS.patterns, unlocked: false },
      objections: { current: 0, threshold: KNOWLEDGE_THRESHOLDS.objections, unlocked: false },
      overallUnlocked: false,
      nextNudge: null,
      unlocked: false,
      error: 'Não autorizado',
    }
  }
  try {
    const [casesCount, painsCount, patternsCount, objectionsCount] = await Promise.all([
      prisma.caseLibraryEntry.count(),
      prisma.painLibraryEntry.count(),
      prisma.solutionPattern.count(),
      prisma.objection.count(),
    ])

    const t = KNOWLEDGE_THRESHOLDS

    const casesUnlocked = casesCount >= t.cases
    const painsUnlocked = painsCount >= t.pains
    const patternsUnlocked = patternsCount >= t.patterns
    const objectionsUnlocked = objectionsCount >= t.objections

    const overallUnlocked = casesUnlocked

    let nextNudge: string | null = null
    if (casesCount === 0) {
      nextNudge = THRESHOLD_NUDGES.cases_zero
    } else if (casesCount < t.cases) {
      nextNudge = THRESHOLD_NUDGES.cases_partial(casesCount)
    } else if (painsCount === 0) {
      nextNudge = THRESHOLD_NUDGES.pains_zero
    } else if (patternsCount < t.patterns) {
      nextNudge = THRESHOLD_NUDGES.patterns_low
    } else {
      nextNudge = THRESHOLD_NUDGES.cases_reached
    }

    return {
      cases: { current: casesCount, threshold: t.cases, unlocked: casesUnlocked },
      pains: { current: painsCount, threshold: t.pains, unlocked: painsUnlocked },
      patterns: { current: patternsCount, threshold: t.patterns, unlocked: patternsUnlocked },
      objections: { current: objectionsCount, threshold: t.objections, unlocked: objectionsUnlocked },
      overallUnlocked,
      nextNudge,
      unlocked: overallUnlocked,
    }
  } catch (err) {
    captureException(err, { action: 'getKnowledgeProgress' })
    return {
      cases: { current: 0, threshold: KNOWLEDGE_THRESHOLDS.cases, unlocked: false },
      pains: { current: 0, threshold: KNOWLEDGE_THRESHOLDS.pains, unlocked: false },
      patterns: { current: 0, threshold: KNOWLEDGE_THRESHOLDS.patterns, unlocked: false },
      objections: { current: 0, threshold: KNOWLEDGE_THRESHOLDS.objections, unlocked: false },
      overallUnlocked: false,
      nextNudge: null,
      unlocked: false,
    }
  }
}

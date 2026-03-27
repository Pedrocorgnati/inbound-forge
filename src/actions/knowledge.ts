'use server'

import { revalidatePath } from 'next/cache'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOperatorId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user.id
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
    console.error('[getCases]', err)
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
}) {
  try {
    await getOperatorId()
    const parsed = CreateCaseDto.parse(formData)
    const created = await CaseLibraryService.create(parsed)
    revalidatePath('/[locale]/knowledge', 'page')
    return { data: created }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    console.error('[createCase]', err)
    return { error: formatZodError(err) }
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
) {
  try {
    await getOperatorId()
    const updated = await CaseLibraryService.update(id, formData)
    revalidatePath('/[locale]/knowledge', 'page')
    return { data: updated }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    console.error('[updateCase]', err)
    return { error: 'Falha ao atualizar case' }
  }
}

export async function deleteCase(id: string) {
  try {
    const operatorId = await getOperatorId()
    await CaseLibraryService.delete(id, operatorId)
    revalidatePath('/[locale]/knowledge', 'page')
    return { success: true }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    console.error('[deleteCase]', err)
    return { error: 'Falha ao remover case' }
  }
}

// ─── Pains ────────────────────────────────────────────────────────────────────

export async function getPains(query?: {
  page?: number
  limit?: number
  sector?: string
  status?: string
}) {
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
    console.error('[getPains]', err)
    return { data: [], total: 0, error: 'Falha ao carregar dores' }
  }
}

export async function createPain(formData: {
  title: string
  description: string
  sectors: string[]
}) {
  try {
    await getOperatorId()
    const parsed = CreatePainDto.parse(formData)
    const created = await PainLibraryService.create(parsed)
    revalidatePath('/[locale]/knowledge', 'page')
    return { data: created }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    console.error('[createPain]', err)
    return { error: formatZodError(err) }
  }
}

export async function updatePain(
  id: string,
  formData: {
    title?: string
    description?: string
    sectors?: string[]
  },
) {
  try {
    await getOperatorId()
    const updated = await PainLibraryService.update(id, formData)
    revalidatePath('/[locale]/knowledge', 'page')
    return { data: updated }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    console.error('[updatePain]', err)
    return { error: 'Falha ao atualizar dor' }
  }
}

export async function deletePain(id: string) {
  try {
    const operatorId = await getOperatorId()
    await PainLibraryService.delete(id, operatorId)
    revalidatePath('/[locale]/knowledge', 'page')
    return { success: true }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    console.error('[deletePain]', err)
    return { error: 'Falha ao remover dor' }
  }
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

export async function getPatterns(query?: {
  page?: number
  limit?: number
  painId?: string
}) {
  try {
    const parsed = ListPatternsQueryDto.parse({
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      painId: query?.painId,
    })
    const result = await SolutionPatternService.findAll(parsed)
    return { data: result.data, total: result.total }
  } catch (err) {
    console.error('[getPatterns]', err)
    return { data: [], total: 0, error: 'Falha ao carregar padrões' }
  }
}

export async function createPattern(formData: {
  name: string
  description: string
  painId: string
  caseId: string
}) {
  try {
    await getOperatorId()
    const parsed = CreatePatternDto.parse(formData)
    const created = await SolutionPatternService.create(parsed)
    revalidatePath('/[locale]/knowledge', 'page')
    return { data: created }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    if (err instanceof Error && err.message.startsWith('KNOWLEDGE_')) {
      return { error: err.message }
    }
    console.error('[createPattern]', err)
    return { error: formatZodError(err) }
  }
}

// ─── Objections ───────────────────────────────────────────────────────────────

export async function getObjections(query?: {
  page?: number
  limit?: number
  type?: string
  status?: string
}) {
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
    console.error('[getObjections]', err)
    return { data: [], total: 0, error: 'Falha ao carregar objeções' }
  }
}

export async function createObjection(formData: {
  content: string
  type: 'PRICE' | 'TRUST' | 'TIMING' | 'NEED' | 'AUTHORITY'
}) {
  try {
    await getOperatorId()
    const parsed = CreateObjectionDto.parse(formData)
    const created = await ObjectionService.create(parsed)
    revalidatePath('/[locale]/knowledge', 'page')
    return { data: created }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    console.error('[createObjection]', err)
    return { error: formatZodError(err) }
  }
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export async function getKnowledgeProgress() {
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
    console.error('[getKnowledgeProgress] DB error:', err)
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

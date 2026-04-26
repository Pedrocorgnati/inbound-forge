import { createHmac } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const EXPORT_VERSION = '1.0.0'

const CaseSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  sector: z.string(),
  systemType: z.string(),
  outcome: z.string(),
  hasQuantifiableResult: z.boolean().optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'REJECTED']).optional(),
})

const PainSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  sectors: z.array(z.string()),
  relevanceScore: z.number().optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'REJECTED']).optional(),
})

const PatternSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  painId: z.string(),
  caseId: z.string(),
})

const ObjectionSchema = z.object({
  id: z.string().optional(),
  content: z.string(),
  type: z.string(),
  status: z.enum(['DRAFT', 'APPROVED', 'REJECTED']).optional(),
})

export const ExportPayloadSchema = z.object({
  meta: z.object({
    exportedAt: z.string(),
    version: z.string(),
    hash: z.string(),
  }),
  cases: z.array(CaseSchema),
  pains: z.array(PainSchema),
  patterns: z.array(PatternSchema),
  objections: z.array(ObjectionSchema),
})

export type ExportPayload = z.infer<typeof ExportPayloadSchema>
export type ImportStrategy = 'skip' | 'merge' | 'replace'

function getSecret(): string {
  const secret = process.env.KB_EXPORT_SECRET || process.env.CSRF_SECRET
  if (!secret) throw new Error('KB_EXPORT_SECRET ausente')
  return secret
}

function computeHash(payload: Omit<ExportPayload, 'meta'> & { meta: Omit<ExportPayload['meta'], 'hash'> }): string {
  const canonical = JSON.stringify({
    meta: payload.meta,
    cases: payload.cases,
    pains: payload.pains,
    patterns: payload.patterns,
    objections: payload.objections,
  })
  return createHmac('sha256', getSecret()).update(canonical).digest('hex')
}

export async function exportKnowledge(): Promise<ExportPayload> {
  const [cases, pains, patterns, objections] = await Promise.all([
    prisma.caseLibraryEntry.findMany(),
    prisma.painLibraryEntry.findMany(),
    prisma.solutionPattern.findMany(),
    prisma.objection.findMany(),
  ])

  const base = {
    meta: { exportedAt: new Date().toISOString(), version: EXPORT_VERSION },
    cases: cases.map(stripDates) as z.infer<typeof CaseSchema>[],
    pains: pains.map(stripDates) as z.infer<typeof PainSchema>[],
    patterns: patterns.map(stripDates) as z.infer<typeof PatternSchema>[],
    objections: objections.map(stripDates) as z.infer<typeof ObjectionSchema>[],
  }
  const hash = computeHash(base)
  return { ...base, meta: { ...base.meta, hash } }
}

function stripDates<T extends Record<string, unknown>>(row: T): T {
  const { createdAt: _c, updatedAt: _u, ...rest } = row as Record<string, unknown>
  return rest as T
}

export function verifyPayloadHash(payload: ExportPayload): boolean {
  const { hash, ...metaRest } = payload.meta
  const expected = computeHash({
    meta: metaRest,
    cases: payload.cases,
    pains: payload.pains,
    patterns: payload.patterns,
    objections: payload.objections,
  })
  return expected === hash
}

export function toCsvBundle(payload: ExportPayload): Record<string, string> {
  const toCsv = (rows: Array<Record<string, unknown>>): string => {
    if (rows.length === 0) return ''
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return ''
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
      return `"${s.replace(/"/g, '""')}"`
    }
    const body = rows.map((r) => headers.map((h) => escape(r[h])).join(',')).join('\n')
    return `${headers.join(',')}\n${body}`
  }
  return {
    'cases.csv': toCsv(payload.cases as Array<Record<string, unknown>>),
    'pains.csv': toCsv(payload.pains as Array<Record<string, unknown>>),
    'patterns.csv': toCsv(payload.patterns as Array<Record<string, unknown>>),
    'objections.csv': toCsv(payload.objections as Array<Record<string, unknown>>),
  }
}

export type ImportStats = {
  cases: { created: number; skipped: number; replaced: number }
  pains: { created: number; skipped: number; replaced: number }
  patterns: { created: number; skipped: number; replaced: number }
  objections: { created: number; skipped: number; replaced: number }
}

export async function importKnowledge(
  raw: unknown,
  strategy: ImportStrategy = 'skip'
): Promise<ImportStats> {
  const parsed = ExportPayloadSchema.parse(raw)
  if (!verifyPayloadHash(parsed)) throw new Error('Payload tampered — hash invalido')

  const stats: ImportStats = {
    cases: { created: 0, skipped: 0, replaced: 0 },
    pains: { created: 0, skipped: 0, replaced: 0 },
    patterns: { created: 0, skipped: 0, replaced: 0 },
    objections: { created: 0, skipped: 0, replaced: 0 },
  }

  await prisma.$transaction(async (tx) => {
    for (const entry of parsed.pains) {
      const existing = entry.id ? await tx.painLibraryEntry.findUnique({ where: { id: entry.id } }) : null
      if (existing) {
        if (strategy === 'skip') stats.pains.skipped++
        else {
          await tx.painLibraryEntry.update({
            where: { id: existing.id },
            data: {
              title: entry.title,
              description: entry.description,
              sectors: entry.sectors,
              relevanceScore: entry.relevanceScore,
              status: (entry.status ?? existing.status) as import('@prisma/client').EntryStatus,
            },
          })
          stats.pains.replaced++
        }
      } else {
        await tx.painLibraryEntry.create({
          data: {
            id: entry.id,
            title: entry.title,
            description: entry.description,
            sectors: entry.sectors,
            relevanceScore: entry.relevanceScore,
            status: entry.status as import('@prisma/client').EntryStatus,
          },
        })
        stats.pains.created++
      }
    }

    for (const entry of parsed.cases) {
      const existing = entry.id ? await tx.caseLibraryEntry.findUnique({ where: { id: entry.id } }) : null
      if (existing) {
        if (strategy === 'skip') stats.cases.skipped++
        else {
          await tx.caseLibraryEntry.update({
            where: { id: existing.id },
            data: {
              name: entry.name,
              sector: entry.sector,
              systemType: entry.systemType,
              outcome: entry.outcome,
              hasQuantifiableResult: entry.hasQuantifiableResult ?? existing.hasQuantifiableResult,
              status: (entry.status ?? existing.status) as import('@prisma/client').EntryStatus,
            },
          })
          stats.cases.replaced++
        }
      } else {
        await tx.caseLibraryEntry.create({
          data: {
            id: entry.id,
            name: entry.name,
            sector: entry.sector,
            systemType: entry.systemType,
            outcome: entry.outcome,
            hasQuantifiableResult: entry.hasQuantifiableResult,
            status: entry.status as import('@prisma/client').EntryStatus,
          },
        })
        stats.cases.created++
      }
    }

    for (const entry of parsed.patterns) {
      const existing = entry.id ? await tx.solutionPattern.findUnique({ where: { id: entry.id } }) : null
      if (existing) {
        if (strategy === 'skip') stats.patterns.skipped++
        else {
          await tx.solutionPattern.update({
            where: { id: existing.id },
            data: {
              name: entry.name,
              description: entry.description,
              painId: entry.painId,
              caseId: entry.caseId,
            },
          })
          stats.patterns.replaced++
        }
      } else {
        await tx.solutionPattern.create({
          data: {
            id: entry.id,
            name: entry.name,
            description: entry.description,
            painId: entry.painId,
            caseId: entry.caseId,
          },
        })
        stats.patterns.created++
      }
    }

    for (const entry of parsed.objections) {
      const existing = entry.id ? await tx.objection.findUnique({ where: { id: entry.id } }) : null
      if (existing) {
        if (strategy === 'skip') stats.objections.skipped++
        else {
          await tx.objection.update({
            where: { id: existing.id },
            data: {
              content: entry.content,
              type: entry.type as never,
              status: (entry.status ?? existing.status) as import('@prisma/client').EntryStatus,
            },
          })
          stats.objections.replaced++
        }
      } else {
        await tx.objection.create({
          data: {
            id: entry.id,
            content: entry.content,
            type: entry.type as never,
            status: entry.status as import('@prisma/client').EntryStatus,
          },
        })
        stats.objections.created++
      }
    }
  })

  return stats
}

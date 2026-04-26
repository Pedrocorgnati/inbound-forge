// TASK-13 (CL-289): monta payload JSON com dados pessoais do operator.
// TASK-3 ST005 (CL-220): inclui knowledgeBase assinada via exportKnowledge.

import 'server-only'
import { prisma } from '@/lib/prisma'
import { exportKnowledge, type ExportPayload } from '@/lib/knowledge/import-export.service'

export interface DataExport {
  generatedAt: string
  operator: unknown
  cases: unknown[]
  pains: unknown[]
  patterns: unknown[]
  objections: unknown[]
  leads: unknown[]
  auditLog: unknown[]
  knowledgeBase?: ExportPayload
}

export async function buildDataExport(operatorId: string): Promise<DataExport> {
  const [
    operator,
    cases,
    pains,
    patterns,
    objections,
    leads,
    auditLog,
    knowledgeBase,
  ] = await Promise.all([
    prisma.operator.findUnique({ where: { id: operatorId } }).catch(() => null),
    prisma.caseLibraryEntry.findMany({ take: 10_000 }).catch(() => []),
    prisma.painLibraryEntry.findMany({ take: 10_000 }).catch(() => []),
    prisma.solutionPattern.findMany({ take: 10_000 }).catch(() => []),
    prisma.objection.findMany({ take: 10_000 }).catch(() => []),
    prisma.lead.findMany({ take: 10_000 }).catch(() => []),
    prisma.auditLog
      .findMany({ where: { userId: operatorId }, take: 10_000, orderBy: { createdAt: 'desc' } })
      .catch(() => []),
    exportKnowledge().catch(() => undefined),
  ])

  return {
    generatedAt: new Date().toISOString(),
    operator,
    cases,
    pains,
    patterns,
    objections,
    leads,
    auditLog,
    knowledgeBase,
  }
}

import { prisma } from '@/lib/prisma'

export type KbEntryType = 'case' | 'pain' | 'pattern' | 'objection'

const MODEL_MAP: Record<KbEntryType, string> = {
  case: 'caseLibraryEntry',
  pain: 'painLibraryEntry',
  pattern: 'solutionPattern',
  objection: 'objection',
}

/**
 * Numero maximo de versoes mantidas por entrada da base de conhecimento.
 * Versoes alem desse limite sao podadas (mais antigas primeiro) apos cada novo snapshot.
 * Why: tabela KnowledgeEntryVersion cresce linearmente sem retencao — em uso prolongado
 * pode atingir centenas de milhares de linhas. 50 versoes cobrem o uso real do operador
 * (restore historico) sem inflar o banco.
 */
export const MAX_VERSIONS_PER_ENTRY = 50

async function pruneOldVersions(type: KbEntryType, entryId: string): Promise<number> {
  const total = await prisma.knowledgeEntryVersion.count({
    where: { entryType: type, entryId },
  })
  if (total <= MAX_VERSIONS_PER_ENTRY) return 0

  const excess = total - MAX_VERSIONS_PER_ENTRY
  const toDelete = await prisma.knowledgeEntryVersion.findMany({
    where: { entryType: type, entryId },
    orderBy: { version: 'asc' },
    take: excess,
    select: { id: true },
  })
  if (toDelete.length === 0) return 0

  const result = await prisma.knowledgeEntryVersion.deleteMany({
    where: { id: { in: toDelete.map(v => v.id) } },
  })
  return result.count
}

async function loadEntry(type: KbEntryType, entryId: string): Promise<Record<string, unknown> | null> {
  const model = (prisma as unknown as Record<string, { findUnique: (args: unknown) => Promise<unknown> }>)[
    MODEL_MAP[type]
  ]
  const row = (await model.findUnique({ where: { id: entryId } })) as Record<string, unknown> | null
  return row
}

export async function nextVersionNumber(type: KbEntryType, entryId: string): Promise<number> {
  const latest = await prisma.knowledgeEntryVersion.findFirst({
    where: { entryType: type, entryId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  return (latest?.version ?? 0) + 1
}

export async function createSnapshot(input: {
  type: KbEntryType
  entryId: string
  createdBy?: string
  changeSummary?: string
}): Promise<{ id: string; version: number } | null> {
  const entry = await loadEntry(input.type, input.entryId)
  if (!entry) return null

  const version = await nextVersionNumber(input.type, input.entryId)

  const created = await prisma.knowledgeEntryVersion.create({
    data: {
      entryType: input.type,
      entryId: input.entryId,
      version,
      snapshot: entry as never,
      createdBy: input.createdBy ?? null,
      changeSummary: input.changeSummary ?? null,
    },
  })

  await pruneOldVersions(input.type, input.entryId)

  return { id: created.id, version: created.version }
}

export async function listVersions(type: KbEntryType, entryId: string) {
  return prisma.knowledgeEntryVersion.findMany({
    where: { entryType: type, entryId },
    orderBy: { version: 'desc' },
  })
}

export async function restoreVersion(input: {
  type: KbEntryType
  entryId: string
  versionId: string
  restoredBy?: string
}): Promise<{ version: number } | null> {
  const version = await prisma.knowledgeEntryVersion.findUnique({ where: { id: input.versionId } })
  if (!version || version.entryType !== input.type || version.entryId !== input.entryId) return null

  const snap = version.snapshot as Record<string, unknown>
  const { id: _id, createdAt: _c, updatedAt: _u, ...data } = snap

  const model = (prisma as unknown as Record<string, { update: (args: unknown) => Promise<unknown> }>)[
    MODEL_MAP[input.type]
  ]
  await model.update({
    where: { id: input.entryId },
    data,
  })

  const snapshot = await createSnapshot({
    type: input.type,
    entryId: input.entryId,
    createdBy: input.restoredBy,
    changeSummary: `Restored from v${version.version}`,
  })
  return snapshot ? { version: snapshot.version } : null
}

export async function withVersioning<T>(
  type: KbEntryType,
  entryId: string,
  createdBy: string | undefined,
  changeSummary: string | undefined,
  op: () => Promise<T>
): Promise<T> {
  await createSnapshot({ type, entryId, createdBy, changeSummary })
  return op()
}

import { prisma } from '@/lib/prisma'
import type { CreatePainInput, UpdatePainInput, ListPainsQuery } from '@/lib/dtos/pain-library.dto'
import { logAudit } from '@/lib/audit/log'

export class PainLibraryService {
  /** Lista dores com filtro por setor e paginação. */
  static async findAll(query: ListPainsQuery) {
    const { page, limit, sector, status } = query
    const skip = (page - 1) * limit

    const where = {
      ...(status ? { status } : {}),
      ...(sector ? { sectors: { has: sector } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.painLibraryEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { casePains: true } },
        },
      }),
      prisma.painLibraryEntry.count({ where }),
    ])

    return { data, total, page, limit }
  }

  /** Busca dor por ID com cases vinculados. */
  static async findById(id: string) {
    return prisma.painLibraryEntry.findUnique({
      where: { id },
      include: {
        _count: { select: { casePains: true } },
        casePains: {
          include: { case: { select: { id: true, name: true, isDraft: true } } },
        },
      },
    })
  }

  /** Cria uma nova dor. */
  static async create(dto: CreatePainInput) {
    return prisma.painLibraryEntry.create({
      data: {
        title: dto.title,
        description: dto.description,
        sectors: dto.sectors,
        status: 'DRAFT',
      },
    })
  }

  /** Atualiza uma dor. */
  static async update(id: string, dto: UpdatePainInput) {
    return prisma.painLibraryEntry.update({
      where: { id },
      data: dto,
    })
  }

  /** Remove uma dor. CasePain links são removidos via cascade (onDelete: Cascade). */
  static async delete(id: string, operatorId: string) {
    await prisma.painLibraryEntry.delete({ where: { id } })
    await logAudit({
      action: 'pain.delete',
      entityType: 'PainLibraryEntry',
      entityId: id,
      operatorId,
    })
  }

  /**
   * Vincula um case a uma dor em transação atômica (DB-002).
   * Grava audit log dentro da transação.
   */
  static async linkCase(painId: string, caseId: string, operatorId: string) {
    return prisma.$transaction(async (tx) => {
      // Verificar existência prévia
      const existing = await tx.casePain.findUnique({
        where: { caseId_painId: { caseId, painId } },
      })
      if (existing) return { linked: false, alreadyLinked: true }

      await tx.casePain.create({ data: { caseId, painId } })

      // Audit log dentro da transação
      await tx.alertLog.create({
        data: {
          type: 'AUDIT',
          severity: 'INFO',
          message: JSON.stringify({
            action: 'pain.case.link',
            entityType: 'CasePain',
            entityId: `${painId}:${caseId}`,
            operatorId,
          }),
          resolved: true,
        },
      })

      return { linked: true }
    })
  }

  /**
   * Desvincula um case de uma dor em transação atômica (DB-002).
   */
  static async unlinkCase(painId: string, caseId: string, operatorId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.casePain.findUnique({
        where: { caseId_painId: { caseId, painId } },
      })
      if (!existing) return { unlinked: false, notFound: true }

      await tx.casePain.delete({ where: { caseId_painId: { caseId, painId } } })

      await tx.alertLog.create({
        data: {
          type: 'AUDIT',
          severity: 'INFO',
          message: JSON.stringify({
            action: 'pain.case.unlink',
            entityType: 'CasePain',
            entityId: `${painId}:${caseId}`,
            operatorId,
          }),
          resolved: true,
        },
      })

      return { unlinked: true }
    })
  }
}

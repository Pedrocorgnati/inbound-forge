import { prisma } from '@/lib/prisma'
import type { CreatePatternInput, UpdatePatternInput, ListPatternsQuery } from '@/lib/dtos/solution-pattern.dto'
import { logAudit } from '@/lib/audit/log'

export class SolutionPatternService {
  /** Lista padrões com filtro opcional por painId. */
  static async findAll(query: ListPatternsQuery) {
    const { page, limit, painId } = query
    const skip = (page - 1) * limit

    const where = painId ? { painId } : {}

    const [data, total] = await Promise.all([
      prisma.solutionPattern.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          pain: { select: { id: true, title: true } },
          case: { select: { id: true, name: true } },
        },
      }),
      prisma.solutionPattern.count({ where }),
    ])

    return { data, total, page, limit }
  }

  /** Busca padrão por ID. */
  static async findById(id: string) {
    return prisma.solutionPattern.findUnique({
      where: { id },
      include: {
        pain: { select: { id: true, title: true } },
        case: { select: { id: true, name: true } },
      },
    })
  }

  /**
   * Cria padrão — valida que painId existe no banco.
   * painId é obrigatório; caseId é obrigatório no schema atual (não nullable).
   */
  static async create(dto: CreatePatternInput) {
    // Verifica existência da dor
    const pain = await prisma.painLibraryEntry.findUnique({ where: { id: dto.painId } })
    if (!pain) {
      throw new Error('KNOWLEDGE_020: painId não encontrado')
    }

    // Verifica existência do case se fornecido
    if (dto.caseId) {
      const caseEntry = await prisma.caseLibraryEntry.findUnique({ where: { id: dto.caseId } })
      if (!caseEntry) {
        throw new Error('KNOWLEDGE_001: caseId não encontrado')
      }
    }

    return prisma.solutionPattern.create({
      data: {
        name: dto.name,
        description: dto.description,
        painId: dto.painId,
        caseId: dto.caseId,
      },
    })
  }

  /** Atualiza padrão. */
  static async update(id: string, dto: UpdatePatternInput) {
    return prisma.solutionPattern.update({
      where: { id },
      data: dto,
    })
  }

  /** Remove padrão e registra audit log (COMP-001). */
  static async delete(id: string, operatorId: string) {
    await prisma.solutionPattern.delete({ where: { id } })
    await logAudit({
      action: 'pattern.delete',
      entityType: 'SolutionPattern',
      entityId: id,
      operatorId,
    })
  }
}

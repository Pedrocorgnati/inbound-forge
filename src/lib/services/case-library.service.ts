import { prisma } from '@/lib/prisma'
import type { CreateCaseInput, UpdateCaseInput, ListCasesQuery } from '@/lib/dtos/case-library.dto'
import { logAudit } from '@/lib/audit/log'

export class CaseLibraryService {
  /**
   * Lista cases com paginação e filtro opcional por status/isDraft.
   * Max 100 por página (PERF-002).
   */
  static async findAll(query: ListCasesQuery) {
    const { page, limit, status, isDraft } = query
    const skip = (page - 1) * limit

    const where = {
      ...(status ? { status } : {}),
      ...(isDraft !== undefined ? { isDraft } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.caseLibraryEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { casePains: true, themes: true } },
        },
      }),
      prisma.caseLibraryEntry.count({ where }),
    ])

    return { data, total, page, limit }
  }

  /** Busca um case por ID. Retorna null se não encontrado. */
  static async findById(id: string) {
    return prisma.caseLibraryEntry.findUnique({
      where: { id },
      include: {
        _count: { select: { casePains: true, themes: true } },
        casePains: {
          include: { pain: { select: { id: true, title: true } } },
        },
      },
    })
  }

  /** Cria um novo case. */
  static async create(dto: CreateCaseInput) {
    return prisma.caseLibraryEntry.create({
      data: {
        name: dto.name,
        sector: dto.sector,
        systemType: dto.systemType,
        outcome: dto.outcome,
        hasQuantifiableResult: dto.hasQuantifiableResult ?? false,
        isDraft: dto.isDraft ?? true,
        status: 'DRAFT',
      },
    })
  }

  /**
   * Atualiza um case.
   * Ao publicar (isDraft → false), define status VALIDATED.
   */
  static async update(id: string, dto: UpdateCaseInput) {
    const updateData: Record<string, unknown> = { ...dto }

    // Publicação: quando isDraft muda para false → VALIDATED
    if (dto.isDraft === false) {
      updateData.status = 'VALIDATED'
    }
    // Volta a rascunho → DRAFT
    if (dto.isDraft === true) {
      updateData.status = 'DRAFT'
    }

    return prisma.caseLibraryEntry.update({
      where: { id },
      data: updateData,
    })
  }

  /**
   * Registra timestamp do último autosave.
   * Operação leve — sem alterar outros campos.
   */
  static async autosave(id: string, dto: UpdateCaseInput) {
    return prisma.caseLibraryEntry.update({
      where: { id },
      data: {
        ...dto,
        lastAutosave: new Date(),
      },
    })
  }

  /** Remove um case e registra audit log (COMP-001). */
  static async delete(id: string, operatorId: string) {
    await prisma.caseLibraryEntry.delete({ where: { id } })
    await logAudit({
      action: 'case.delete',
      entityType: 'CaseLibraryEntry',
      entityId: id,
      operatorId,
    })
  }
}

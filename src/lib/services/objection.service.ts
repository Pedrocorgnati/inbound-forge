import { prisma } from '@/lib/prisma'
import type { CreateObjectionInput, UpdateObjectionInput, ListObjectionsQuery } from '@/lib/dtos/objection.dto'
import { logAudit } from '@/lib/audit/log'

export class ObjectionService {
  /** Lista objeções com filtro por tipo e paginação. */
  static async findAll(query: ListObjectionsQuery) {
    const { page, limit, type, status } = query
    const skip = (page - 1) * limit

    const where = {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.objection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.objection.count({ where }),
    ])

    return { data, total, page, limit }
  }

  /** Busca objeção por ID. */
  static async findById(id: string) {
    return prisma.objection.findUnique({ where: { id } })
  }

  /** Cria objeção. */
  static async create(dto: CreateObjectionInput) {
    return prisma.objection.create({
      data: {
        content: dto.content,
        type: dto.type,
        status: 'DRAFT',
      },
    })
  }

  /** Atualiza objeção. */
  static async update(id: string, dto: UpdateObjectionInput) {
    return prisma.objection.update({
      where: { id },
      data: dto,
    })
  }

  /** Remove objeção + audit log (COMP-001). */
  static async delete(id: string, operatorId: string) {
    await prisma.objection.delete({ where: { id } })
    await logAudit({
      action: 'objection.delete',
      entityType: 'Objection',
      entityId: id,
      operatorId,
    })
  }
}

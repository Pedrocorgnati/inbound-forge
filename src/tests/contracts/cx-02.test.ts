/**
 * CX-02: ContentPiece.imageJobId + imageUrl atualizados após job de imagem completar
 * Owner: module-8/TASK-1 | Consumidor: module-9/TASK-5
 * Interface: src/types/content.ts / ContentPiece.imageJobId, ContentPiece.imageUrl
 */
import { describe, it, expect, afterEach } from 'vitest'
import { prisma, createTestContent, createImageJob, completeImageJob, failImageJob, cleanupTestData } from './helpers'

afterEach(async () => {
  await cleanupTestData()
})

describe('CX-02: ContentPiece.imageJobId / imageUrl', () => {
  it('imageUrl preenchido após job de imagem completar', async () => {
    const content = await createTestContent()
    const job = await createImageJob({ contentPieceId: content.id })

    await completeImageJob(job.id, 'https://cdn.ideogram.ai/image.jpg')

    const contentAfter = await prisma.contentPiece.findUnique({ where: { id: content.id } })
    expect(contentAfter!.imageUrl).toBe('https://cdn.ideogram.ai/image.jpg')
    expect(contentAfter!.imageJobId).toBe(job.id)
  })

  it('[ERROR] ContentPiece.imageUrl permanece null quando job falha', async () => {
    const content = await createTestContent()
    const job = await createImageJob({ contentPieceId: content.id })

    await failImageJob(job.id, 'rate_limit')

    const contentAfter = await prisma.contentPiece.findUnique({ where: { id: content.id } })
    expect(contentAfter!.imageUrl).toBeNull()
    expect(contentAfter!.imageJobId).toBe(job.id)  // jobId mantido para histórico
  })

  it('imageJobId é único por ContentPiece', async () => {
    const content = await createTestContent()
    const job = await createImageJob({ contentPieceId: content.id })
    await completeImageJob(job.id, 'https://cdn.ideogram.ai/image-1.jpg')

    // Tentar criar segundo job para mesmo content — deve falhar por unique constraint
    await expect(
      createImageJob({ contentPieceId: content.id })
    ).rejects.toThrow()
  })
})

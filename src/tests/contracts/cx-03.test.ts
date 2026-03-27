/**
 * CX-03: ContentPiece.scheduledPost preenchido ao criar Post
 * Owner: module-8/TASK-1 | Consumidor: module-12/TASK-1
 * Interface: src/types/content.ts / ContentPiece.scheduledPost
 */
import { describe, it, expect, afterEach } from 'vitest'
import { prisma, createTestContent, createTestPost, cleanupTestData } from './helpers'

afterEach(async () => {
  await cleanupTestData()
})

describe('CX-03: ContentPiece.scheduledPost', () => {
  it('scheduledPost preenchido ao criar Post', async () => {
    const content = await createTestContent()
    const post = await createTestPost({ contentPieceId: content.id })

    const contentAfter = await prisma.contentPiece.findUnique({
      where: { id: content.id },
      include: { scheduledPost: true },
    })

    expect(contentAfter!.scheduledPost).not.toBeNull()
    expect(contentAfter!.scheduledPost!.id).toBe(post.id)
  })

  it('relação navegável via Prisma include', async () => {
    const content = await createTestContent()
    await createTestPost({ contentPieceId: content.id })

    const contentWithPost = await prisma.contentPiece.findUnique({
      where: { id: content.id },
      include: { scheduledPost: true },
    })

    expect(contentWithPost).not.toBeNull()
    expect(contentWithPost!.scheduledPost).toBeDefined()
    expect(contentWithPost!.scheduledPost!.contentPieceId).toBe(content.id)
  })

  it('ContentPiece sem Post tem scheduledPost null', async () => {
    const content = await createTestContent()

    const contentAfter = await prisma.contentPiece.findUnique({
      where: { id: content.id },
      include: { scheduledPost: true },
    })

    expect(contentAfter!.scheduledPost).toBeNull()
  })
})

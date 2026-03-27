/**
 * CX-04: Post.trackingUrl preenchido ao criar UTMLink
 * Owner: module-12/TASK-1 | Consumidor: module-13/TASK-1
 * Interface: src/types/post.ts / Post.trackingUrl
 */
import { describe, it, expect, afterEach } from 'vitest'
import { prisma, createTestPost, createUTMLink, cleanupTestData } from './helpers'

afterEach(async () => {
  await cleanupTestData()
})

describe('CX-04: Post.trackingUrl', () => {
  it('trackingUrl preenchido ao criar UTMLink', async () => {
    const post = await createTestPost()
    await createUTMLink({ postId: post.id, source: 'inbound-forge', medium: 'linkedin' })

    const postAfter = await prisma.post.findUnique({ where: { id: post.id } })
    expect(postAfter!.trackingUrl).toMatch(/utm_source=inbound-forge/)
    expect(postAfter!.trackingUrl).toMatch(/utm_medium=linkedin/)
  })

  it('trackingUrl contém utm_campaign', async () => {
    const post = await createTestPost()
    await createUTMLink({ postId: post.id, source: 'inbound-forge', medium: 'blog' })

    const postAfter = await prisma.post.findUnique({ where: { id: post.id } })
    expect(postAfter!.trackingUrl).toMatch(/utm_campaign=/)
  })

  it('Post sem UTMLink tem trackingUrl null', async () => {
    const post = await createTestPost()
    expect(post.trackingUrl).toBeNull()
  })
})

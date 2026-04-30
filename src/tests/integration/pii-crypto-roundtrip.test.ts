/**
 * PA-06 / G-003 — PII integration test: encryptPII → persist → decryptPII roundtrip.
 * Requer DATABASE_URL com Prisma migrate aplicado.
 * Skippado automaticamente em CI sem DB.
 *
 * Valida COMP-002: contactInfo gravado cifrado, legível via decryptPII.
 */
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { encryptPII, decryptPII } from '@/lib/crypto'
import { hashContactInfo, parseContactInfo } from '@/lib/leads/contact-hash'

const prisma = new PrismaClient()

const DB_AVAILABLE = !!process.env.DATABASE_URL

async function seedThemeAndPost() {
  const theme = await prisma.theme.create({
    data: { title: `pii-test-theme-${Date.now()}` },
  })
  const post = await prisma.post.create({
    data: {
      caption: 'pii test post',
      channel: 'BLOG',
      hashtags: [],
      cta: '',
      themeId: theme.id,
    },
  })
  return { theme, post }
}

describe.skipIf(!DB_AVAILABLE)('PII crypto roundtrip — COMP-002', () => {
  let leadId: string
  let themeId: string
  let postId: string
  const plainContact = 'pii-test@example.com'

  beforeAll(async () => {
    const { theme, post } = await seedThemeAndPost()
    themeId = theme.id
    postId = post.id
  })

  afterAll(async () => {
    if (leadId) await prisma.lead.delete({ where: { id: leadId } }).catch(() => null)
    await prisma.post.delete({ where: { id: postId } }).catch(() => null)
    await prisma.theme.delete({ where: { id: themeId } }).catch(() => null)
    await prisma.$disconnect()
  })

  it('encryptPII produz ciphertext diferente do plaintext', () => {
    const cipher = encryptPII(plainContact)
    expect(cipher).not.toBe(plainContact)
    expect(cipher.length).toBeGreaterThan(20)
  })

  it('decryptPII reverte exatamente o plaintext original', () => {
    const cipher = encryptPII(plainContact)
    expect(decryptPII(cipher)).toBe(plainContact)
  })

  it('IV aleatório — dois ciphertexts do mesmo plaintext são diferentes', () => {
    const c1 = encryptPII(plainContact)
    const c2 = encryptPII(plainContact)
    expect(c1).not.toBe(c2)
    expect(decryptPII(c1)).toBe(plainContact)
    expect(decryptPII(c2)).toBe(plainContact)
  })

  it('persiste lead com contactInfo cifrado e recupera descriptografado', async () => {
    const cipher = encryptPII(plainContact)
    const parts = parseContactInfo(plainContact)
    const contactHash = hashContactInfo(parts)

    const lead = await prisma.lead.create({
      data: {
        firstTouchPostId: postId,
        firstTouchThemeId: themeId,
        contactInfo: cipher,
        contactHash,
        lgpdConsent: true,
        lgpdConsentAt: new Date(),
        name: 'PII Test Lead',
      },
    })
    leadId = lead.id

    // Verifica que no banco está cifrado (não é o plaintext)
    expect(lead.contactInfo).not.toBe(plainContact)
    expect(lead.contactInfo).toBe(cipher)

    // Verifica que decryptPII recupera o original
    const recovered = decryptPII(lead.contactInfo!)
    expect(recovered).toBe(plainContact)
  })

  it('contactHash é determinístico e correto', () => {
    const parts = parseContactInfo(plainContact)
    const h1 = hashContactInfo(parts)
    const h2 = hashContactInfo(parts)
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64) // SHA-256 hex
  })

  it('PATCH com novo contactInfo recalcula hash e cifra novo valor', async () => {
    const newContact = 'pii-updated@example.com'
    const newCipher = encryptPII(newContact)
    const newHash = hashContactInfo(parseContactInfo(newContact))

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { contactInfo: newCipher, contactHash: newHash },
    })

    expect(decryptPII(updated.contactInfo!)).toBe(newContact)
    expect(updated.contactHash).toBe(newHash)
    expect(updated.contactHash).not.toBe(hashContactInfo(parseContactInfo(plainContact)))
  })
})

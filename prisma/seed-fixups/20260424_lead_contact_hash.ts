/**
 * TASK-3 ST002 backfill — calcula contactHash para leads legacy.
 *
 * Executar uma vez apos a migration 20260424000005_lead_contact_hash:
 *   npx tsx prisma/seed-fixups/20260424_lead_contact_hash.ts
 *
 * Leads com contactInfo null/undecryptable ficam com contactHash NULL
 * (unique NULL nao colide). DPO deve reconciliar manualmente.
 */
import { PrismaClient } from '@prisma/client'
import { decryptPII } from '../../src/lib/crypto'
import { hashContactInfo, parseContactInfo } from '../../src/lib/leads/contact-hash'

const prisma = new PrismaClient()

async function main() {
  const leads = await prisma.lead.findMany({
    where: { contactHash: null },
    select: { id: true, contactInfo: true },
  })

  let updated = 0
  let skipped = 0
  const collisions: string[] = []

  for (const lead of leads) {
    if (!lead.contactInfo) {
      skipped++
      continue
    }
    let plain: string | null = null
    try {
      plain = decryptPII(lead.contactInfo)
    } catch {
      skipped++
      continue
    }
    const parsed = parseContactInfo(plain)
    if (!parsed.email && !parsed.phone) {
      skipped++
      continue
    }
    const hash = hashContactInfo(parsed)
    try {
      await prisma.lead.update({ where: { id: lead.id }, data: { contactHash: hash } })
      updated++
    } catch (err: any) {
      if (err?.code === 'P2002') {
        collisions.push(lead.id)
      } else {
        throw err
      }
    }
  }

  console.log(`[backfill] updated=${updated} skipped=${skipped} collisions=${collisions.length}`)
  if (collisions.length > 0) {
    console.log('Colisoes (rever DPO):', collisions.join(','))
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

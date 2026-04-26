/**
 * TASK-5 ST001 (CL-AU-016): agregador LGPD de portabilidade.
 * Consolida dados do operador autenticado em um bundle JSON.
 * PII de leads eh mascarada (email a***@x.com, phone ultimos 4 digitos).
 */
import { prisma } from '@/lib/prisma'
import { decryptPII } from '@/lib/crypto'
import { parseContactInfo } from '@/lib/leads/contact-hash'

const SCHEMA_VERSION = '1.0.0'

export interface ExportBundle {
  schemaVersion: string
  exportedAt: string
  user: {
    id: string
    email: string | null
  }
  leads: Array<{
    id: string
    name: string | null
    company: string | null
    email: string | null
    phone: string | null
    channel: string | null
    funnelStage: string | null
    status: string
    createdAt: string
  }>
  contentPieces: Array<{ id: string; title: string; status: string; createdAt: string }>
  themes: Array<{ id: string; title: string; status: string; createdAt: string }>
  auditLogs: Array<{ action: string; entityType: string; createdAt: string }>
}

function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const head = local.slice(0, 1)
  return `${head}***@${domain}`
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  return `***${digits.slice(-4)}`
}

function decryptMasked(contactInfo: string | null): { email: string | null; phone: string | null } {
  if (!contactInfo) return { email: null, phone: null }
  let plain: string | null = null
  try {
    plain = decryptPII(contactInfo)
  } catch {
    return { email: null, phone: null }
  }
  const { email, phone } = parseContactInfo(plain)
  return {
    email: maskEmail(email ?? null),
    phone: maskPhone(phone ?? null),
  }
}

export async function exportUserData(
  userId: string,
  userEmail: string | null = null,
): Promise<ExportBundle> {
  const [leads, contentPieces, themes, auditLogs] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: {
        id: true,
        name: true,
        company: true,
        contactInfo: true,
        channel: true,
        funnelStage: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.contentPiece.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: { id: true, baseTitle: true, status: true, createdAt: true },
    }),
    prisma.theme.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { action: true, entityType: true, createdAt: true },
    }),
  ])

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    user: { id: userId, email: userEmail },
    leads: leads.map((l) => {
      const { email, phone } = decryptMasked(l.contactInfo)
      return {
        id: l.id,
        name: l.name,
        company: l.company,
        email,
        phone,
        channel: l.channel,
        funnelStage: l.funnelStage,
        status: l.status,
        createdAt: l.createdAt.toISOString(),
      }
    }),
    contentPieces: contentPieces.map((c) => ({
      id: c.id,
      title: c.baseTitle,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
    themes: themes.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    auditLogs: auditLogs.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  }
}

/**
 * Rastreabilidade: CL-298, TASK-2 ST003
 * Agrega todos os dados do operador para export LGPD.
 * PII de leads mascarada. Gera objeto JSON pronto para serializar em ZIP.
 */
import 'server-only'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export interface LgpdExportManifest {
  schemaVersion: string
  exportedAt: string
  operatorId: string
  entities: string[]
  sha256?: string
}

export interface LgpdExportBundle {
  manifest: LgpdExportManifest
  profile: unknown
  themes: unknown[]
  contentPieces: unknown[]
  leads: unknown[]
  conversionEvents: unknown[]
  auditLogs: unknown[]
}

function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.slice(0, 1)}***@${domain}`
}

export async function buildLgpdExport(operatorId: string): Promise<LgpdExportBundle> {
  const [profile, themes, contentPieces, leads, conversionEvents, auditLogs] = await Promise.all([
    prisma.operator.findUnique({
      where: { id: operatorId },
      select: { id: true, email: true, onboardingCompleted: true, createdAt: true },
    }),
    prisma.theme.findMany({
      select: { id: true, title: true, status: true, createdAt: true },
      take: 10_000,
    }),
    prisma.contentPiece.findMany({
      select: { id: true, baseTitle: true, status: true, createdAt: true },
      take: 10_000,
    }).catch(() => [] as unknown[]),
    prisma.lead.findMany({
      select: {
        id: true,
        contactInfo: true,
        company: true,
        channel: true,
        funnelStage: true,
        status: true,
        createdAt: true,
      },
      take: 10_000,
    }).catch(() => [] as unknown[]),
    prisma.conversionEvent.findMany({
      select: { id: true, type: true, createdAt: true },
      take: 10_000,
    }).catch(() => [] as unknown[]),
    prisma.auditLog.findMany({
      where: { userId: operatorId },
      select: { action: true, entityType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    }),
  ])

  const maskedLeads = (leads as Array<{ contactInfo?: string | null; [k: string]: unknown }>).map(
    (l) => ({ ...l, contactInfo: undefined, email: maskEmail(l.contactInfo as string | null) }),
  )

  const bundle: LgpdExportBundle = {
    manifest: {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      operatorId,
      entities: ['profile', 'themes', 'contentPieces', 'leads', 'conversionEvents', 'auditLogs'],
    },
    profile,
    themes,
    contentPieces,
    leads: maskedLeads,
    conversionEvents,
    auditLogs,
  }

  const hash = crypto.createHash('sha256').update(JSON.stringify(bundle)).digest('hex')
  bundle.manifest.sha256 = hash

  return bundle
}

/**
 * TASK-9 (CL-208) — Knowledge graph / backlinks.
 */
import { prisma } from '@/lib/prisma'

export type KnowledgeType = 'pain' | 'case' | 'pattern'

export interface Backlink {
  id: string
  type: 'case' | 'theme' | 'pattern'
  slug: string
  title: string
  snippet?: string
}

export async function getBacklinks(type: KnowledgeType, id: string): Promise<Backlink[]> {
  const results: Backlink[] = []

  if (type === 'pain') {
    const casePains = await prisma.casePain.findMany({
      where: { painId: id },
      include: { case: true },
    })
    for (const cp of casePains) {
      results.push({
        id: cp.case.id,
        type: 'case',
        slug: cp.case.id,
        title: cp.case.name,
        snippet: cp.case.outcome.slice(0, 120),
      })
    }
    const themes = await prisma.theme.findMany({
      where: { painId: id },
      select: { id: true, title: true },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    })
    for (const theme of themes) {
      results.push({ id: theme.id, type: 'theme', slug: theme.id, title: theme.title })
    }
    const patterns = await prisma.solutionPattern.findMany({
      where: { painId: id },
      select: { id: true, name: true, description: true },
    })
    for (const p of patterns) {
      results.push({
        id: p.id,
        type: 'pattern',
        slug: p.id,
        title: p.name,
        snippet: p.description.slice(0, 120),
      })
    }
  } else if (type === 'case') {
    const themes = await prisma.theme.findMany({
      where: { caseId: id },
      select: { id: true, title: true },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    })
    for (const theme of themes) {
      results.push({ id: theme.id, type: 'theme', slug: theme.id, title: theme.title })
    }
    const patterns = await prisma.solutionPattern.findMany({
      where: { caseId: id },
      select: { id: true, name: true, description: true },
    })
    for (const p of patterns) {
      results.push({
        id: p.id,
        type: 'pattern',
        slug: p.id,
        title: p.name,
        snippet: p.description.slice(0, 120),
      })
    }
  } else if (type === 'pattern') {
    const themes = await prisma.theme.findMany({
      where: { solutionPatternId: id },
      select: { id: true, title: true },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    })
    for (const theme of themes) {
      results.push({ id: theme.id, type: 'theme', slug: theme.id, title: theme.title })
    }
  }

  return results
}

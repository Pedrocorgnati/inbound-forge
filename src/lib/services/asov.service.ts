import { prisma } from '@/lib/prisma'

export type AsovLlm = 'perplexity' | 'chatgpt_search' | 'gemini'

interface ProbeResult {
  llm: AsovLlm
  query: string
  mentioned: boolean
  rank: number | null
  raw: string
  status: 'ok' | 'error'
}

interface ThemeForProbe {
  id: string
  title: string
  pain?: { description: string } | null
}

const INTERNAL_DOMAINS = (process.env.ASOV_INTERNAL_DOMAINS ?? 'inbound-forge.com')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean)

function buildQuery(theme: ThemeForProbe): string {
  const pain = theme.pain?.description ?? theme.title
  return `Qual a melhor solução para "${pain}"? Cite fontes ou casos reais.`
}

function containsInternal(citations: string[] | undefined): { mentioned: boolean; rank: number | null } {
  if (!citations?.length) return { mentioned: false, rank: null }
  const idx = citations.findIndex((url) =>
    INTERNAL_DOMAINS.some((d) => url.toLowerCase().includes(d))
  )
  return idx >= 0 ? { mentioned: true, rank: idx + 1 } : { mentioned: false, rank: null }
}

async function probePerplexity(query: string): Promise<ProbeResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    return { llm: 'perplexity', query, mentioned: false, rank: null, raw: '', status: 'error' }
  }

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: query }],
      }),
      signal: AbortSignal.timeout(30_000),
    })
    const json = await res.json()
    const citations: string[] = json.citations ?? []
    const hit = containsInternal(citations)
    return {
      llm: 'perplexity',
      query,
      mentioned: hit.mentioned,
      rank: hit.rank,
      raw: JSON.stringify({ citations }).slice(0, 8_000),
      status: res.ok ? 'ok' : 'error',
    }
  } catch {
    return { llm: 'perplexity', query, mentioned: false, rank: null, raw: '', status: 'error' }
  }
}

async function probeChatgptSearch(_query: string): Promise<ProbeResult> {
  return {
    llm: 'chatgpt_search',
    query: _query,
    mentioned: false,
    rank: null,
    raw: 'stub',
    status: 'error',
  }
}

async function probeGemini(_query: string): Promise<ProbeResult> {
  return {
    llm: 'gemini',
    query: _query,
    mentioned: false,
    rank: null,
    raw: 'stub',
    status: 'error',
  }
}

export async function probeTheme(theme: ThemeForProbe, llm: AsovLlm): Promise<ProbeResult> {
  const query = buildQuery(theme)
  switch (llm) {
    case 'perplexity':
      return probePerplexity(query)
    case 'chatgpt_search':
      return probeChatgptSearch(query)
    case 'gemini':
      return probeGemini(query)
  }
}

export async function persistSnapshot(themeId: string, result: ProbeResult) {
  const probeDate = new Date()
  probeDate.setUTCHours(0, 0, 0, 0)

  return prisma.asovSnapshot.upsert({
    where: {
      UQ_asov_theme_llm_date: {
        themeId,
        llm: result.llm,
        probeDate,
      },
    },
    create: {
      themeId,
      llm: result.llm,
      probeDate,
      query: result.query,
      mentioned: result.mentioned,
      rank: result.rank,
      rawResponse: result.raw,
      status: result.status,
    },
    update: {
      mentioned: result.mentioned,
      rank: result.rank,
      rawResponse: result.raw,
      status: result.status,
    },
  })
}

export async function runProbeForTheme(themeId: string, llms: AsovLlm[] = ['perplexity']) {
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    include: { pain: { select: { description: true } } },
  })
  if (!theme) throw new Error('Theme not found')

  const results: ProbeResult[] = []
  for (const llm of llms) {
    const r = await probeTheme({ id: theme.id, title: theme.title, pain: theme.pain }, llm)
    await persistSnapshot(theme.id, r)
    results.push(r)
  }
  return results
}

export async function asovRate(themeId: string, days: number): Promise<number> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  const snapshots = await prisma.asovSnapshot.findMany({
    where: { themeId, probeDate: { gte: since }, status: 'ok' },
    select: { mentioned: true },
  })
  if (snapshots.length === 0) return 0
  const mentions = snapshots.filter((s) => s.mentioned).length
  return mentions / snapshots.length
}

export async function asovAggregate(period: '7d' | '30d') {
  const days = period === '7d' ? 7 : 30
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  const snapshots = await prisma.asovSnapshot.findMany({
    where: { probeDate: { gte: since }, status: 'ok' },
    select: { themeId: true, mentioned: true, probeDate: true },
  })

  const byTheme = new Map<string, { total: number; mentions: number }>()
  for (const s of snapshots) {
    const cur = byTheme.get(s.themeId) ?? { total: 0, mentions: 0 }
    cur.total += 1
    if (s.mentioned) cur.mentions += 1
    byTheme.set(s.themeId, cur)
  }

  const totalProbes = snapshots.length
  const totalMentions = snapshots.filter((s) => s.mentioned).length

  return {
    globalRate: totalProbes === 0 ? 0 : totalMentions / totalProbes,
    totalProbes,
    totalMentions,
    themes: Array.from(byTheme.entries()).map(([themeId, v]) => ({
      themeId,
      rate: v.total === 0 ? 0 : v.mentions / v.total,
      total: v.total,
      mentions: v.mentions,
    })),
  }
}

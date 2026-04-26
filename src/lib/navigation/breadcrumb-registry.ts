// Breadcrumb registry — mapeia pathname (com placeholders) -> labels i18n e parent
// TASK-10 ST001 / CL-198

export interface BreadcrumbEntry {
  // Pattern em formato "/segmento/[param]" — matches Next.js route conventions
  pattern: string
  // Chave de traducao (namespace "breadcrumbs")
  labelKey: string
  // Parent pattern (opcional). Default: segmento anterior do proprio pattern.
  parent?: string
  // Resolver para labels dinamicos (ex.: /leads/[id] -> "Jose Silva").
  // Recebe os params resolvidos e retorna label ou null (fallback para labelKey).
  dynamicResolver?: (params: Record<string, string>) => Promise<string | null>
}

const BASE: BreadcrumbEntry[] = [
  { pattern: '/dashboard', labelKey: 'breadcrumbs.dashboard' },
  { pattern: '/analytics', labelKey: 'breadcrumbs.analytics' },
  { pattern: '/assets', labelKey: 'breadcrumbs.assets' },
  { pattern: '/blog-manage', labelKey: 'breadcrumbs.blogManage' },
  {
    pattern: '/blog-manage/[slug]',
    labelKey: 'breadcrumbs.blogArticle',
    parent: '/blog-manage',
  },
  {
    pattern: '/blog-manage/[slug]/preview',
    labelKey: 'breadcrumbs.blogPreview',
    parent: '/blog-manage/[slug]',
  },
  { pattern: '/calendar', labelKey: 'breadcrumbs.calendar' },
  { pattern: '/compliance', labelKey: 'breadcrumbs.compliance' },
  { pattern: '/content', labelKey: 'breadcrumbs.content' },
  { pattern: '/fila', labelKey: 'breadcrumbs.fila' },
  { pattern: '/health', labelKey: 'breadcrumbs.health' },
  { pattern: '/knowledge', labelKey: 'breadcrumbs.knowledge' },
  { pattern: '/leads', labelKey: 'breadcrumbs.leads' },
  {
    pattern: '/leads/[id]',
    labelKey: 'breadcrumbs.lead',
    parent: '/leads',
    dynamicResolver: async ({ id }) => {
      try {
        const res = await fetch(`/api/v1/leads/${encodeURIComponent(id)}/title`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok) return null
        const data = (await res.json()) as { title?: string }
        return data.title ?? null
      } catch {
        return null
      }
    },
  },
  { pattern: '/niche-opportunities', labelKey: 'breadcrumbs.nicheOpportunities' },
  {
    pattern: '/niche-opportunities/rejected',
    labelKey: 'breadcrumbs.rejectedThemes',
    parent: '/niche-opportunities',
  },
  { pattern: '/posts', labelKey: 'breadcrumbs.posts' },
  { pattern: '/profile', labelKey: 'breadcrumbs.profile' },
  { pattern: '/settings', labelKey: 'breadcrumbs.settings' },
  {
    pattern: '/settings/api',
    labelKey: 'breadcrumbs.settingsApi',
    parent: '/settings',
  },
  {
    pattern: '/settings/schedule',
    labelKey: 'breadcrumbs.settingsSchedule',
    parent: '/settings',
  },
  {
    pattern: '/settings/preferences',
    labelKey: 'breadcrumbs.settingsPreferences',
    parent: '/settings',
  },
  {
    pattern: '/settings/costs',
    labelKey: 'breadcrumbs.settingsCosts',
    parent: '/settings',
  },
  { pattern: '/sources', labelKey: 'breadcrumbs.sources' },
  { pattern: '/utm', labelKey: 'breadcrumbs.utm' },
]

const LOOKUP: Record<string, BreadcrumbEntry> = Object.fromEntries(
  BASE.map((e) => [e.pattern, e]),
)

// Converte pathname real em pattern (troca valores concretos por [seg]).
// Note: primeiro segmento e a locale — deve ser removido antes de entrar aqui.
function normalizeToPattern(pathSegments: string[]): string {
  // Reconstroi candidatos em ordem decrescente de profundidade, casando com BASE
  const patternCandidates: string[][] = []
  for (let i = pathSegments.length; i > 0; i -= 1) {
    patternCandidates.push(pathSegments.slice(0, i))
  }
  // Resolve cada segmento: tenta literal, depois qualquer [slug|id] conhecido
  return (
    '/' +
    pathSegments
      .map((seg, idx) => {
        const prefix = '/' + pathSegments.slice(0, idx + 1).join('/')
        if (LOOKUP[prefix]) return seg
        const asSlug = '/' + [...pathSegments.slice(0, idx), '[slug]'].join('/')
        if (LOOKUP[asSlug]) return '[slug]'
        const asId = '/' + [...pathSegments.slice(0, idx), '[id]'].join('/')
        if (LOOKUP[asId]) return '[id]'
        return seg
      })
      .join('/')
  )
}

export interface ResolvedBreadcrumb {
  href: string
  labelKey: string
  params?: Record<string, string>
  dynamicResolver?: BreadcrumbEntry['dynamicResolver']
}

/**
 * Resolve uma cadeia de breadcrumbs a partir do pathname completo (inclui locale).
 * Retorna lista ordenada Home -> ... -> pagina atual.
 */
export function resolveBreadcrumbs(pathname: string): ResolvedBreadcrumb[] {
  const [, locale, ...rest] = pathname.split('/').filter(Boolean).length
    ? [''].concat(pathname.split('/').filter(Boolean))
    : ['']
  if (!locale) return []
  const segments = rest
  if (segments.length === 0 || segments[0] === '' || segments[0] === 'dashboard') {
    // Root/home — sem breadcrumbs (conforme ST003: evitar em home)
    return []
  }

  const pattern = normalizeToPattern(segments)
  const params: Record<string, string> = {}
  segments.forEach((seg, idx) => {
    const patternParts = pattern.split('/').filter(Boolean)
    const part = patternParts[idx]
    if (part?.startsWith('[') && part.endsWith(']')) {
      params[part.slice(1, -1)] = seg
    }
  })

  // Sobe a cadeia pelo campo parent; se ausente, corta o ultimo segmento
  const chainPatterns: string[] = []
  let current: string | undefined = pattern
  while (current) {
    chainPatterns.unshift(current)
    const entry: BreadcrumbEntry | undefined = LOOKUP[current]
    if (entry?.parent) {
      current = entry.parent
      continue
    }
    const trimmed: string = '/' + current.split('/').filter(Boolean).slice(0, -1).join('/')
    if (trimmed === '/' || trimmed === current) break
    if (LOOKUP[trimmed]) {
      current = trimmed
    } else {
      current = undefined
    }
  }

  const result: ResolvedBreadcrumb[] = [
    { href: `/${locale}/dashboard`, labelKey: 'breadcrumbs.home' },
  ]
  for (const p of chainPatterns) {
    const entry = LOOKUP[p]
    if (!entry) continue
    // Monta href substituindo placeholders por valores reais
    const href =
      '/' +
      locale +
      p
        .split('/')
        .filter(Boolean)
        .map((part) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            return params[part.slice(1, -1)] ?? part
          }
          return part
        })
        .map((s) => '/' + s)
        .join('')
        .slice(1)
    result.push({
      href,
      labelKey: entry.labelKey,
      params,
      dynamicResolver: entry.dynamicResolver,
    })
  }
  return result
}

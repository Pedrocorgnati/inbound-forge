/**
 * BreadcrumbList JSON-LD — Intake Review TASK-7 ST003 (CL-155).
 */
import { JsonLdScript } from '@/components/blog/JsonLdScript'

export interface Crumb {
  name: string
  url: string
}

export function BreadcrumbSchema({ crumbs }: { crumbs: Crumb[] }) {
  if (!crumbs?.length) return null
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: c.name,
      item: c.url,
    })),
  }
  return <JsonLdScript schemas={[schema]} />
}

export default BreadcrumbSchema

import type { UTMParams } from '@/types/utm'

export function buildUTMUrl(baseUrl: string, params: UTMParams): string {
  const url = new URL(baseUrl)
  url.searchParams.set('utm_source', params.source)
  url.searchParams.set('utm_medium', params.medium)
  url.searchParams.set('utm_campaign', params.campaign)
  if (params.term) url.searchParams.set('utm_term', params.term)
  if (params.content) url.searchParams.set('utm_content', params.content)
  return url.toString()
}

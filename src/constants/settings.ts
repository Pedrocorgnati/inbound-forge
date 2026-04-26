import { BookLock, Clock, Sliders, DollarSign, Settings2 } from 'lucide-react'

export interface SettingsNavItem {
  labelKey: string
  href: string
  icon: typeof BookLock
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  { labelKey: 'api', href: '/settings/api', icon: BookLock },
  { labelKey: 'schedule', href: '/settings/schedule', icon: Clock },
  { labelKey: 'preferences', href: '/settings/preferences', icon: Sliders },
  { labelKey: 'costs', href: '/settings/costs', icon: DollarSign },
  { labelKey: 'system', href: '/settings/system', icon: Settings2 },
]

export const CREDENTIAL_PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic API', envVar: 'ANTHROPIC_API_KEY' },
  { key: 'ideogram', label: 'Ideogram 2.0', envVar: 'IDEOGRAM_API_KEY' },
  { key: 'instagram', label: 'Instagram Graph', envVar: 'INSTAGRAM_ACCESS_TOKEN' },
  { key: 'supabase_url', label: 'Supabase URL', envVar: 'NEXT_PUBLIC_SUPABASE_URL' },
  { key: 'supabase_anon', label: 'Supabase Anon Key', envVar: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
] as const

export type CredentialProvider = typeof CREDENTIAL_PROVIDERS[number]['key']

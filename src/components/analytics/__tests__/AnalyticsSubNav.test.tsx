// @vitest-environment jsdom
// FE-01: valida os 5 links e o active-state por match EXATO (overview nao acende
// nas sub-rotas).
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

const { mockUsePathname } = vi.hoisted(() => ({ mockUsePathname: vi.fn() }))

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>{children}</a>
  ),
}))

import { AnalyticsSubNav } from '../AnalyticsSubNav'

const SEGMENTS = ['overview', 'channels', 'themes', 'learning', 'asov'] as const

describe('AnalyticsSubNav', () => {
  it('renderiza os 5 links e marca overview ativo na rota index', () => {
    mockUsePathname.mockReturnValue('/pt-BR/analytics')
    const { getByTestId } = render(<AnalyticsSubNav locale="pt-BR" />)

    for (const seg of SEGMENTS) {
      expect(getByTestId(`analytics-subnav-${seg}`)).toBeTruthy()
    }
    expect(getByTestId('analytics-subnav-overview').getAttribute('aria-current')).toBe('page')
    expect(getByTestId('analytics-subnav-channels').getAttribute('aria-current')).toBeNull()

    // hrefs corretos por segmento (com prefixo de locale)
    expect(getByTestId('analytics-subnav-overview').getAttribute('href')).toBe('/pt-BR/analytics')
    expect(getByTestId('analytics-subnav-channels').getAttribute('href')).toBe('/pt-BR/analytics/channels')
    expect(getByTestId('analytics-subnav-asov').getAttribute('href')).toBe('/pt-BR/analytics/asov')
  })

  it('match EXATO: na sub-rota channels, channels fica ativo e overview NAO', () => {
    mockUsePathname.mockReturnValue('/pt-BR/analytics/channels')
    const { getByTestId } = render(<AnalyticsSubNav locale="pt-BR" />)

    expect(getByTestId('analytics-subnav-channels').getAttribute('aria-current')).toBe('page')
    expect(getByTestId('analytics-subnav-overview').getAttribute('aria-current')).toBeNull()
  })
})

// @vitest-environment jsdom
// NOTE: requer `npm install -D jsdom` para rodar com este ambiente
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { mockHealthData } from '@/__tests__/mocks/handlers'

// Mock hooks — evita chamadas de rede nos testes de componente
vi.mock('@/hooks/useHealthPolling', () => ({
  useHealthPolling: vi.fn(() => ({
    data: mockHealthData,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  })),
}))

// Mock sub-componentes pesados para isolar HealthDashboard
vi.mock('@/components/health/AlertLogPanel', () => ({
  AlertLogPanel: () => <div data-testid="alert-log-panel" />,
}))

vi.mock('@/components/health/ApiUsageBreakdown', () => ({
  ApiUsageBreakdown: () => <div data-testid="api-usage-breakdown" />,
}))

vi.mock('@/components/health/ErrorHistoryList', () => ({
  ErrorHistoryList: () => <div data-testid="error-history-list" />,
}))

vi.mock('@/components/health/WorkerHealthBadge', () => ({
  WorkerHealthBadge: ({ type }: { type: string }) => (
    <div data-testid={`worker-badge-${type.toLowerCase()}`}>{type}</div>
  ),
}))

vi.mock('@/components/health/HealthCard', () => ({
  HealthCard: ({ type }: { type: string }) => (
    <div data-testid={`health-card-${type?.toLowerCase()}`}>{type}</div>
  ),
}))

vi.mock('@/components/health/RateLimitPanel', () => ({
  RateLimitPanel: () => <div data-testid="rate-limit-panel" />,
}))

import { HealthDashboard } from '../HealthDashboard'
import { useHealthPolling } from '@/hooks/useHealthPolling'

describe('HealthDashboard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renderiza badge de status operacional', () => {
    render(<HealthDashboard />)
    const badge = screen.getByTestId('health-status-badge')
    expect(badge).toBeDefined()
    expect(badge.textContent).toContain('Operacional')
  })

  it('renderiza botão de refresh', () => {
    render(<HealthDashboard />)
    const btn = screen.getByTestId('health-refresh-button')
    expect(btn).toBeDefined()
  })

  it('chama refresh ao clicar no botão', () => {
    const refreshMock = vi.fn()
    vi.mocked(useHealthPolling).mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      error: null,
      refresh: refreshMock,
    })
    render(<HealthDashboard />)
    fireEvent.click(screen.getByTestId('health-refresh-button'))
    expect(refreshMock).toHaveBeenCalledOnce()
  })

  it('exibe skeleton quando isLoading=true', () => {
    vi.mocked(useHealthPolling).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refresh: vi.fn(),
    })
    render(<HealthDashboard />)
    // badge não deve aparecer no loading state
    expect(screen.queryByTestId('health-status-badge')).toBeNull()
  })

  it('exibe mensagem de erro quando error está presente', () => {
    vi.mocked(useHealthPolling).mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Falha ao conectar',
      refresh: vi.fn(),
    })
    render(<HealthDashboard />)
    expect(screen.getByText('Falha ao conectar')).toBeDefined()
  })
})

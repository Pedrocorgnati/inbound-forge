/**
 * Testes — JsonLdScript XSS prevention
 * Rastreabilidade: TASK-11/ST004, A-006
 * Valida que isomorphic-dompurify sanitiza </script> injection via dangerouslySetInnerHTML
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { JsonLdScript } from '../JsonLdScript'

describe('JsonLdScript — XSS prevention (A-006)', () => {
  it('sanitiza </script> injection no JSON-LD', () => {
    const maliciousSchema = {
      '@type': 'BlogPosting',
      name: 'Test</script><script>alert(1)</script>',
    }
    const { container } = render(<JsonLdScript schemas={[maliciousSchema]} />)
    const scriptContent = container.querySelector('script')?.innerHTML ?? ''
    expect(scriptContent).not.toContain('</script><script>')
    expect(scriptContent).not.toContain('alert(1)')
  })

  it('preserva JSON-LD válido após sanitização', () => {
    const validSchema = {
      '@type': 'BlogPosting',
      name: 'Artigo Válido',
      url: 'https://example.com',
    }
    const { container } = render(<JsonLdScript schemas={[validSchema]} />)
    const scriptContent = container.querySelector('script')?.innerHTML ?? ''
    expect(scriptContent).toContain('BlogPosting')
    expect(scriptContent).toContain('Artigo Válido')
  })

  it('renderiza script com type application/ld+json', () => {
    const schema = { '@type': 'WebSite', name: 'Inbound Forge' }
    const { container } = render(<JsonLdScript schemas={[schema]} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
  })

  it('sanitiza múltiplas injections no mesmo campo', () => {
    const schema = {
      '@type': 'BlogPosting',
      description: '<img src=x onerror=alert(1)><script>fetch("evil.com")</script>',
    }
    const { container } = render(<JsonLdScript schemas={[schema]} />)
    const scriptContent = container.querySelector('script')?.innerHTML ?? ''
    expect(scriptContent).not.toContain('onerror=alert')
    expect(scriptContent).not.toContain('fetch("evil.com")')
  })
})

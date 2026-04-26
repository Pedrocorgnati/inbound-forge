import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// Mock next/image — RTL renders <img> instead of <Image>
vi.mock('next/image', () => ({
  default: ({ src, alt, priority, ...rest }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} {...rest} />
  },
}))

import { BlogHero } from '../BlogHero'

describe('BlogHero', () => {
  it('renderiza com src e alt corretos', () => {
    const { getByTestId } = render(
      <BlogHero src="https://example.com/hero.jpg" alt="Título do artigo" />
    )
    const wrapper = getByTestId('blog-hero')
    expect(wrapper).toBeTruthy()
    const img = wrapper.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://example.com/hero.jpg')
    expect(img?.getAttribute('alt')).toBe('Título do artigo')
  })

  it('img tem loading="eager" porque priority está ativo', () => {
    const { getByTestId } = render(
      <BlogHero src="https://example.com/hero.jpg" alt="Hero" />
    )
    const img = getByTestId('blog-hero').querySelector('img')
    // priority=true → next/image define loading="eager" internamente
    expect(img?.getAttribute('loading')).toBe('eager')
  })

  it('wrapper tem data-testid="blog-hero"', () => {
    const { getByTestId } = render(
      <BlogHero src="/img/hero.png" alt="alt text" />
    )
    expect(getByTestId('blog-hero')).toBeDefined()
  })
})

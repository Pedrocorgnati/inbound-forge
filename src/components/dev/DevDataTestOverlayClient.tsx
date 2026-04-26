'use client'
// Client Component wrapper — necessário no Next.js 15+ para usar ssr:false com dynamic()
// RESOLVED: Next.js 15 breaking change (ssr:false não permitido em Server Components)
import dynamic from 'next/dynamic'

const DevDataTestOverlay = dynamic(
  () => import('./DataTestOverlay').then((mod) => mod.DevDataTestOverlay),
  { ssr: false }
)

export function DevDataTestOverlayClient() {
  return <DevDataTestOverlay />
}

import type { Metadata } from 'next'
import { BlogManageClient } from '@/components/blog/BlogManageClient'

export const metadata: Metadata = { title: 'Blog' }

export default async function BlogAdminListPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <BlogManageClient locale={locale} />
}

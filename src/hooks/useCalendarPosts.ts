'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PublishingPost } from '@/types/publishing'
import { format } from 'date-fns'

interface CalendarFilters {
  channels: string[]
  statuses: string[]
}

interface UseCalendarPostsParams {
  startDate: Date
  endDate: Date
  filters: CalendarFilters
}

interface UseCalendarPostsReturn {
  posts: Record<string, PublishingPost[]>
  isLoading: boolean
  error: string | null
  refetch: () => void
}

function groupPostsByDate(posts: PublishingPost[]): Record<string, PublishingPost[]> {
  const grouped: Record<string, PublishingPost[]> = {}
  for (const post of posts) {
    if (!post.scheduledAt) continue
    const key = format(new Date(post.scheduledAt), 'yyyy-MM-dd')
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(post)
  }
  return grouped
}

export function useCalendarPosts({
  startDate,
  endDate,
  filters,
}: UseCalendarPostsParams): UseCalendarPostsReturn {
  const [posts, setPosts] = useState<Record<string, PublishingPost[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchPosts = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        scheduledFrom: startDate.toISOString(),
        scheduledTo: endDate.toISOString(),
      })

      for (const ch of filters.channels) {
        params.append('channel', ch)
      }
      for (const st of filters.statuses) {
        params.append('status', st)
      }

      const res = await fetch(`/api/posts?${params.toString()}`, {
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`Erro ao buscar posts: ${res.status}`)
      }

      const data: PublishingPost[] = await res.json()
      setPosts(groupPostsByDate(data))
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [startDate, endDate, filters])

  useEffect(() => {
    fetchPosts()
    return () => abortRef.current?.abort()
  }, [fetchPosts])

  return { posts, isLoading, error, refetch: fetchPosts }
}

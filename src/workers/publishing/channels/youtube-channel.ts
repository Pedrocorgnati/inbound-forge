/**
 * YouTube Shorts channel adapter — Inbound Forge
 * TASK-7 ST003 / CL-073 (pos-MVP)
 *
 * Integra com fila de publishing existente.
 * Renderer FFmpeg e stub — ver src/workers/media/shorts-renderer.ts.
 */
import { renderShort } from '@/workers/media/shorts-renderer'
import { YouTubeClient } from '@/lib/integrations/youtube/client'

export interface YouTubePublishItem {
  operatorId: string
  articleId: string
  title: string
  description: string
  tags: string[]
  highlights: string[]
}

export async function publishToYouTubeShorts(item: YouTubePublishItem): Promise<{ videoId: string }> {
  // ST001: renderizar video
  const { filePath } = await renderShort({
    articleId: item.articleId,
    title: item.title,
    highlights: item.highlights,
  })

  // ST002: upload via cliente YouTube
  const client = new YouTubeClient()
  // TODO: carregar tokens do operador (mesmo padrao que TikTok — Redis interim)
  const accessToken = process.env.YOUTUBE_ACCESS_TOKEN_DEV ?? ''
  const uploadUrl = await client.initiateResumableUpload({
    title: item.title,
    description: item.description,
    tags: item.tags,
    videoFilePath: filePath,
    accessToken,
  })

  console.info(`[youtube-channel] Upload iniciado | articleId=${item.articleId} | uploadUrl=${uploadUrl}`)

  // TODO: fazer upload do arquivo em chunks e retornar videoId real
  return { videoId: 'pending' }
}

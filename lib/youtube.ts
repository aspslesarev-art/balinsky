// Pulls the latest videos from our YouTube channel via the public RSS feed.
// No API key, no quotas — YouTube serves a 15-item Atom feed per channel.
// Cached at the edge for 30 minutes; revalidate via fetch tag if needed.

const CHANNEL_ID = 'UClpPGRcaFgsq11ar2qWHC9Q' // @balinsky_info
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`

export type YouTubeVideo = {
  id: string
  title: string
  url: string
  thumbnail: string
  publishedAt: string
}

// Atom feed is small and predictable — a regex pass is faster than pulling
// in an XML parser dependency and is robust against the few fields we use.
function parseFeed(xml: string): YouTubeVideo[] {
  const out: YouTubeVideo[] = []
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g
  let m: RegExpExecArray | null
  while ((m = entryRe.exec(xml)) !== null) {
    const entry = m[1]
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
    const title = entry.match(/<title>([^<]+)<\/title>/)?.[1]
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1]
    const thumb = entry.match(/<media:thumbnail url="([^"]+)"/)?.[1]
    if (!id || !title) continue
    out.push({
      id,
      title: decodeEntities(title),
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: thumb ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: published ?? '',
    })
  }
  return out
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export async function loadLatestYouTubeVideos(limit = 6): Promise<YouTubeVideo[]> {
  try {
    const r = await fetch(FEED_URL, {
      next: { revalidate: 1800, tags: ['youtube:feed'] },
    })
    if (!r.ok) return []
    const xml = await r.text()
    return parseFeed(xml).slice(0, limit)
  } catch {
    return []
  }
}

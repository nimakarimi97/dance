const VIDEO_ID = /^[\w-]{11}$/
const YOUTUBE_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i

export function parseYoutubeId(input) {
  const value = String(input ?? '').trim()
  if (!value) return null
  if (VIDEO_ID.test(value)) return value

  let url
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return null
  }
  if (!YOUTUBE_HOSTS.test(url.hostname)) return null

  const [first, second] = url.pathname.split('/').filter(Boolean)
  const candidate = url.hostname.endsWith('youtu.be')
    ? first
    : url.searchParams.get('v') ?? (['shorts', 'embed', 'live', 'v'].includes(first) ? second : null)
  return candidate && VIDEO_ID.test(candidate) ? candidate : null
}

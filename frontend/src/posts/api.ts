export type Post = {
  id: number
  title: string
  body: string
  createdAt: string
}

function isPost(value: unknown): value is Post {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value && typeof value.id === 'number' &&
    'title' in value && typeof value.title === 'string' &&
    'body' in value && typeof value.body === 'string' &&
    'createdAt' in value && typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt))
}

export async function fetchPosts(signal: AbortSignal): Promise<Post[]> {
  const response = await fetch('/api/posts', { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('Posts request failed')
  const data: unknown = await response.json()
  if (!Array.isArray(data) || !data.every(isPost)) {
    throw new Error('Unexpected posts response')
  }
  return data
}

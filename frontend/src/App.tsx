import { useEffect, useState } from 'react'
import { fetchPosts, type Post } from './posts/api'
import { PostCard } from './posts/PostCard'

type FeedState =
  | { kind: 'loading' }
  | { kind: 'loaded'; posts: Post[] }
  | { kind: 'error' }

function App() {
  const [feed, setFeed] = useState<FeedState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12_000)
    let active = true

    async function loadPosts() {
      try {
        const posts = await fetchPosts(controller.signal)
        if (active) setFeed({ kind: 'loaded', posts })
      } catch {
        if (active) setFeed({ kind: 'error' })
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void loadPosts()
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [attempt])

  function reload() {
    setFeed({ kind: 'loading' })
    setAttempt((previous) => previous + 1)
  }

  const loading = feed.kind === 'loading'
  const announcement = loading ? 'Loading posts…'
    : feed.kind === 'error' ? 'Could not load posts.'
    : feed.posts.length === 0 ? 'No posts yet.'
    : `${feed.posts.length} ${feed.posts.length === 1 ? 'post' : 'posts'} loaded.`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-5 sm:px-8">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 font-bold text-white">r/</span>
          <span className="text-xl font-bold tracking-tight">reddit clone</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-700">The community feed</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-5">
          <h1 className="text-4xl font-bold tracking-tight">Latest posts</h1>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Loading…' : feed.kind === 'error' ? 'Try again' : 'Refresh'}
          </button>
        </div>
        <p className="mt-4 leading-relaxed text-slate-600">Conversations start here. Browse the newest posts from the community.</p>
        <p role="status" aria-live="polite" aria-atomic="true" className="mt-6 text-sm text-slate-600">{announcement}</p>

        <section aria-label="Latest posts" aria-busy={loading} className="mt-5 space-y-4">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">Getting the latest conversations…</div>
          )}
          {feed.kind === 'error' && (
            <div className="rounded-2xl border border-red-200 bg-white p-8">
              <h2 className="text-xl font-semibold">The feed is unavailable</h2>
              <p className="mt-3 leading-relaxed text-slate-600">We couldn’t load the posts. Please try again in a moment.</p>
            </div>
          )}
          {feed.kind === 'loaded' && (feed.posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h2 className="text-xl font-semibold">No conversations yet</h2>
              <p className="mt-3 leading-relaxed text-slate-600">There are no posts to show. Check back soon.</p>
            </div>
          ) : feed.posts.map((post) => <PostCard key={post.id} post={post} />))}
        </section>
        {feed.kind === 'loaded' && feed.posts.length > 0 && (
          <p className="mt-6 text-center text-sm text-slate-500">Showing up to 50 of the newest posts.</p>
        )}
      </main>
    </div>
  )
}

export default App

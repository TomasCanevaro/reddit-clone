import { useEffect, useState } from 'react'
import { fetchPosts, type Post } from './api'
import { PostCard } from './PostCard'

type FeedState =
  | { kind: 'loading' }
  | { kind: 'loaded'; posts: Post[] }
  | { kind: 'error' }

export function FeedPage() {
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
    <>
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-700 dark:text-orange-400">The community feed</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-5">
          <h1 className="text-4xl font-bold tracking-tight">Latest posts</h1>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-5 py-2.5 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 dark:focus-visible:outline-orange-400 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Loading…' : feed.kind === 'error' ? 'Try again' : 'Refresh'}
          </button>
        </div>
        <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">Conversations start here. Browse the newest posts from the community.</p>
        <p role="status" aria-live="polite" aria-atomic="true" className="mt-6 text-sm text-slate-600 dark:text-slate-300">{announcement}</p>

        <section aria-label="Latest posts" aria-busy={loading} className="mt-5 space-y-4">
          {loading && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-slate-600 dark:text-slate-300">Getting the latest conversations…</div>
          )}
          {feed.kind === 'error' && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 p-8">
              <h2 className="text-xl font-semibold">The feed is unavailable</h2>
              <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">We couldn’t load the posts. Please try again in a moment.</p>
            </div>
          )}
          {feed.kind === 'loaded' && (feed.posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <h2 className="text-xl font-semibold">No conversations yet</h2>
              <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">There are no posts to show. Check back soon.</p>
            </div>
          ) : feed.posts.map((post) => <PostCard key={post.id} post={post} />))}
        </section>
        {feed.kind === 'loaded' && feed.posts.length > 0 && (
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">Showing up to 50 of the newest posts.</p>
        )}
    </>
  )
}

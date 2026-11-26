import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { fetchPost, type Post } from './api'
import { NotFound } from './NotFound'
import { PostCard } from './PostCard'

type PostState =
  | { kind: 'loading' }
  | { kind: 'loaded'; post: Post }
  | { kind: 'not-found' }
  | { kind: 'error' }

export function PostPage() {
  const { id } = useParams()
  // Keep the ID as a string so route parsing does not round Java long values.
  if (!id || !/^\d{1,19}$/.test(id) || BigInt(id) > 9223372036854775807n) {
    return <NotFound post />
  }
  // Reset state when navigating directly from one post URL to another.
  return <PostDetail key={id} id={id} />
}

function PostDetail({ id }: { id: string }) {
  const [state, setState] = useState<PostState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12_000)
    let active = true

    async function loadPost() {
      try {
        const post = await fetchPost(id, controller.signal)
        if (active) setState(post ? { kind: 'loaded', post } : { kind: 'not-found' })
      } catch {
        if (active) setState({ kind: 'error' })
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void loadPost()
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [id, attempt])

  if (state.kind === 'not-found') return <NotFound post />

  function retry() {
    setState({ kind: 'loading' })
    setAttempt((previous) => previous + 1)
  }

  return (
    <>
      <Link to="/" className="mb-6 inline-block rounded font-semibold text-orange-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600 dark:text-orange-400">Back to feed</Link>
      {state.kind === 'loading' && (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold">Loading post…</h1>
        </div>
      )}
      {state.kind === 'error' && (
        <section role="alert" className="rounded-2xl border border-red-200 bg-white p-8 dark:border-red-900 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold">Couldn’t load this post</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Please try again in a moment.</p>
          <button type="button" onClick={retry} className="mt-6 rounded-full bg-orange-700 px-5 py-3 font-semibold text-white hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600">Try again</button>
        </section>
      )}
      {state.kind === 'loaded' && <PostCard post={state.post} detail />}
    </>
  )
}

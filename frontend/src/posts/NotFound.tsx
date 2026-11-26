import { Link } from 'react-router'

export function NotFound({ post = false }: { post?: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-3xl font-bold">{post ? 'Post not found' : 'Page not found'}</h1>
      <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">
        {post ? 'This post doesn’t exist or is no longer available.' : 'There is no page at this address.'}
      </p>
      <Link to="/" className="mt-6 inline-block rounded font-semibold text-orange-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600 dark:text-orange-400">Back to feed</Link>
    </section>
  )
}

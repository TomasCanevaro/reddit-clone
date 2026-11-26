import { Link } from 'react-router'
import type { Post } from './api'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function PostCard({ post, detail = false }: { post: Post; detail?: boolean }) {
  const Heading = detail ? 'h1' : 'h2'
  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Posted <time dateTime={post.createdAt}>{dateFormatter.format(new Date(post.createdAt))}</time>
      </p>
      <Heading className="mt-3 text-2xl font-semibold tracking-tight wrap-anywhere">
        {detail ? post.title : (
          <Link to={`/posts/${post.id}`} className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600">
            {post.title}
          </Link>
        )}
      </Heading>
      {post.body && <p className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 wrap-anywhere">{post.body}</p>}
    </article>
  )
}

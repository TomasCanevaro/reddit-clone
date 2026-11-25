import type { Post } from './api'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <p className="text-sm text-slate-500">
        Posted <time dateTime={post.createdAt}>{dateFormatter.format(new Date(post.createdAt))}</time>
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight wrap-anywhere">{post.title}</h2>
      {post.body && <p className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-700 wrap-anywhere">{post.body}</p>}
    </article>
  )
}

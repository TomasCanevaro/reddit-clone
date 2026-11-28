import { Link, Route, Routes } from 'react-router'
import { ThemeToggle } from './ThemeToggle'
import { AuthControls } from './auth/AuthControls'
import { AuthPage } from './auth/AuthPage'
import { FeedPage } from './posts/FeedPage'
import { PostPage } from './posts/PostPage'
import { NotFound } from './posts/NotFound'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-5 py-5 sm:px-8">
          <Link to="/" aria-label="Reddit clone home" className="flex items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 font-bold text-white">r/</span>
            <span className="text-xl font-bold tracking-tight">reddit clone</span>
          </Link>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <AuthControls />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/posts/:id" element={<PostPage />} />
          <Route path="/login" element={<AuthPage key="login" mode="login" />} />
          <Route path="/register" element={<AuthPage key="register" mode="register" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

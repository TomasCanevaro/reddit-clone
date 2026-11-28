import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from './AuthContext'
import { AuthError, register } from './api'

const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-orange-600 focus:outline-2 focus:outline-orange-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { state, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const registration = mode === 'register'
  const notice = location.state as { registered?: boolean; username?: string } | null
  const [username, setUsername] = useState(notice?.username ?? '')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const errorRef = useRef<HTMLDivElement>(null)
  const active = useRef(true)

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  if (state.kind === 'authenticated') return <Navigate to="/" replace />
  if (state.kind === 'loading') return <p role="status">Checking your session…</p>

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    setFields({})
    try {
      if (registration) {
        await register(username, password)
        if (active.current) {
          setPassword('')
          navigate('/login', { replace: true, state: { registered: true, username } })
        }
      } else {
        await signIn(username, password)
        if (active.current) {
          setPassword('')
          navigate('/', { replace: true })
        }
      }
    } catch (failure) {
      if (active.current) {
        setError(failure instanceof AuthError ? failure.message : 'Couldn’t connect. Please try again.')
        if (failure instanceof AuthError) setFields(failure.fields)
      }
    } finally {
      if (active.current) setPending(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-3xl font-bold tracking-tight">{registration ? 'Join the conversation' : 'Welcome back'}</h1>
      <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
        {registration ? 'Create an account to get started.' : 'Log in to your account.'}
      </p>
      {!registration && notice?.registered && (
        <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Account created. You can log in now.</p>
      )}
      {state.kind === 'error' && <p className="mt-5 text-sm text-amber-800 dark:text-amber-200">We couldn’t check your existing session. You can still try this form.</p>}
      {error && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800 focus:outline-2 focus:outline-red-600 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}
      <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5" aria-busy={pending}>
        <div>
          <label htmlFor="username" className="font-medium">Username</label>
          <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
            required minLength={registration ? 3 : undefined} maxLength={20}
            pattern={registration ? '[A-Za-z0-9_\\-]{3,20}' : undefined}
            value={username} onChange={(event) => setUsername(event.target.value)} disabled={pending}
            aria-invalid={Boolean(fields.username)}
            aria-describedby={fields.username ? 'username-error' : registration ? 'username-hint' : undefined}
            className={inputClass} />
          {registration && <p id="username-hint" className="mt-2 text-sm text-slate-600 dark:text-slate-300">3–20 letters, numbers, underscores, or hyphens.</p>}
          {fields.username && <p id="username-error" className="mt-2 text-sm text-red-700 dark:text-red-300">{fields.username}</p>}
        </div>
        <div>
          <label htmlFor="password" className="font-medium">Password</label>
          <input id="password" name="password" type="password"
            autoComplete={registration ? 'new-password' : 'current-password'} required
            minLength={registration ? 12 : undefined} maxLength={128}
            value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending}
            aria-invalid={Boolean(fields.password)}
            aria-describedby={fields.password ? 'password-error' : registration ? 'password-hint' : undefined}
            className={inputClass} />
          {registration && <p id="password-hint" className="mt-2 text-sm text-slate-600 dark:text-slate-300">12–128 characters. A long, unique passphrase works well.</p>}
          {fields.password && <p id="password-error" className="mt-2 text-sm text-red-700 dark:text-red-300">{fields.password}</p>}
        </div>
        <button type="submit" disabled={pending} className="w-full rounded-full bg-orange-700 px-5 py-3 font-semibold text-white hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600 disabled:cursor-wait disabled:opacity-60">
          {pending ? (registration ? 'Creating account…' : 'Logging in…') : (registration ? 'Create account' : 'Log in')}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
        {registration ? 'Already have an account? ' : 'New here? '}
        <Link to={registration ? '/login' : '/register'} className="rounded font-semibold text-orange-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600 dark:text-orange-400">
          {registration ? 'Log in' : 'Create an account'}
        </Link>
      </p>
    </section>
  )
}

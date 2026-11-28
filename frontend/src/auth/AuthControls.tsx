import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from './AuthContext'

const buttonClass = 'rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800'

export function AuthControls() {
  const { state, refresh, signOut } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function logout() {
    setPending(true)
    setError('')
    try {
      await signOut()
    } catch {
      setError('Couldn’t log out. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {state.kind === 'loading' && <span role="status" className="text-sm text-slate-500 dark:text-slate-400">Checking account…</span>}
      {state.kind === 'error' && (
        <>
          <span className="text-sm text-slate-600 dark:text-slate-300">Account unavailable</span>
          <button type="button" onClick={refresh} className={buttonClass}>Retry</button>
        </>
      )}
      {state.kind === 'anonymous' && (
        <nav aria-label="Account" className="flex items-center gap-3">
          <Link to="/login" className={buttonClass}>Log in</Link>
          <Link to="/register" className="rounded-full bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600">Sign up</Link>
        </nav>
      )}
      {state.kind === 'authenticated' && (
        <>
          <span className="text-sm font-medium">u/{state.user.username}</span>
          <button type="button" disabled={pending} onClick={() => void logout()} className={buttonClass}>
            {pending ? 'Logging out…' : 'Log out'}
          </button>
        </>
      )}
      {error && state.kind === 'authenticated' && <p role="alert" className="basis-full text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  )
}

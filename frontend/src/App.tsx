import { useEffect, useState } from 'react'

type ConnectionState =
  | { kind: 'checking' }
  | { kind: 'connected' }
  | { kind: 'degraded' }
  | { kind: 'unavailable' }

const messages = {
  checking: {
    title: 'Checking connection…',
    description: 'Contacting the backend and checking its database connection.',
    badge: 'Checking',
    color: 'bg-slate-100 text-slate-700',
  },
  connected: {
    title: 'Everything is connected',
    description: 'The backend is responding and its database health check is passing.',
    badge: 'Connected',
    color: 'bg-emerald-50 text-emerald-800',
  },
  degraded: {
    title: 'A service needs attention',
    description: 'The backend is responding, but a health check is failing. Check that PostgreSQL is running.',
    badge: 'Needs attention',
    color: 'bg-amber-50 text-amber-900',
  },
  unavailable: {
    title: 'Unable to check the connection',
    description: 'The backend could not be reached or returned an unexpected response. Check that it is running, then try again.',
    badge: 'Unavailable',
    color: 'bg-red-50 text-red-800',
  },
}

function App() {
  const [connection, setConnection] = useState<ConnectionState>({ kind: 'checking' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12_000)
    let active = true

    async function checkConnection() {
      try {
        const response = await fetch('/actuator/health', {
          signal: controller.signal,
          cache: 'no-store',
        })
        const health: unknown = await response.json()
        if (!health || typeof health !== 'object' || !('status' in health)) {
          throw new Error('Unexpected health response')
        }
        if (response.ok && health.status === 'UP') {
          if (active) setConnection({ kind: 'connected' })
        } else if (response.status === 503 &&
          (health.status === 'DOWN' || health.status === 'OUT_OF_SERVICE')) {
          if (active) setConnection({ kind: 'degraded' })
        } else {
          throw new Error('Unexpected health status')
        }
      } catch {
        if (active) setConnection({ kind: 'unavailable' })
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void checkConnection()
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [attempt])

  const message = messages[connection.kind]
  const checking = connection.kind === 'checking'

  function retry() {
    setConnection({ kind: 'checking' })
    setAttempt((previous) => previous + 1)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-5 sm:px-8">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 font-bold text-white">r/</span>
          <span className="text-xl font-bold tracking-tight">reddit clone</span>
          <span className="ml-auto text-sm text-slate-500">Local development</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-700">Project foundation</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">A place to start.</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
          Communities, conversations, and shared interests. First, let’s make sure everything is connected.
        </p>

        <section aria-labelledby="connection-heading" className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="connection-heading" className="text-lg font-semibold">Connection status</h2>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${message.color}`}>{message.badge}</span>
          </div>
          <div role="status" aria-live="polite" aria-atomic="true" className="mt-6">
            <h3 className="text-2xl font-semibold tracking-tight">{message.title}</h3>
            <p className="mt-3 leading-relaxed text-slate-600">{message.description}</p>
          </div>
          <button
            type="button"
            onClick={retry}
            disabled={checking}
            className="mt-7 rounded-full bg-orange-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 disabled:cursor-wait disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Check again'}
          </button>
        </section>
        <p className="mt-6 text-sm leading-relaxed text-slate-500">Next up: building the first post feed, one feature at a time.</p>
      </main>
    </div>
  )
}

export default App

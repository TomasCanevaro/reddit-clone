export type User = {
  id: number
  username: string
  createdAt: string
}

export class AuthError extends Error {
  status: number
  fields: Record<string, string>

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.fields = fields
  }
}

function request(path: string, options: RequestInit = {}) {
  const timeout = AbortSignal.timeout(12_000)
  return fetch(path, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
  })
}

async function readUser(response: Response): Promise<User> {
  const value: unknown = await response.json()
  if (!value || typeof value !== 'object' ||
    !('id' in value) || typeof value.id !== 'number' ||
    !('username' in value) || typeof value.username !== 'string' ||
    !('createdAt' in value) || typeof value.createdAt !== 'string' ||
    Number.isNaN(Date.parse(value.createdAt))) {
    throw new Error('Unexpected account response')
  }
  // Keep only the public fields even if the response includes extra properties.
  return { id: value.id, username: value.username, createdAt: value.createdAt }
}

async function csrfPost(path: string, options: RequestInit): Promise<Response> {
  // Fetch before each write: login/logout rotate the token, and sessions expire.
  for (let attempt = 0; attempt < 2; attempt++) {
    const csrfResponse = await request('/api/auth/csrf')
    if (!csrfResponse.ok) throw new AuthError('Unable to prepare the request. Please try again.', csrfResponse.status)
    const csrf: unknown = await csrfResponse.json()
    if (!csrf || typeof csrf !== 'object' ||
      !('headerName' in csrf) || csrf.headerName !== 'X-CSRF-TOKEN' ||
      !('token' in csrf) || typeof csrf.token !== 'string' || !csrf.token) {
      throw new Error('Unexpected CSRF response')
    }
    const headers = new Headers(options.headers)
    headers.set(csrf.headerName, csrf.token)
    const response = await request(path, { ...options, method: 'POST', headers })
    // A rejected CSRF request has not reached the handler. Refresh and retry once.
    if (response.status !== 403 || attempt === 1) return response
  }
  throw new Error('Request could not be completed')
}

async function failure(response: Response): Promise<AuthError> {
  const fields: Record<string, string> = {}
  if (response.status === 400) {
    const problem: unknown = await response.json().catch(() => null)
    if (problem && typeof problem === 'object' && 'errors' in problem &&
      problem.errors && typeof problem.errors === 'object') {
      for (const field of ['username', 'password']) {
        const message = (problem.errors as Record<string, unknown>)[field]
        if (typeof message === 'string') fields[field] = message
      }
    }
  }
  const messages: Record<number, string> = {
    400: 'Check the highlighted fields and try again.',
    401: 'Invalid username or password.',
    403: 'Your session changed. Please try again.',
    409: 'That username is already taken.',
  }
  return new AuthError(messages[response.status] ?? 'The account service is unavailable. Please try again.', response.status, fields)
}

export async function currentUser(signal?: AbortSignal): Promise<User | null> {
  const response = await request('/api/auth/me', { signal })
  if (response.status === 401) return null
  if (!response.ok) throw await failure(response)
  return readUser(response)
}

export async function login(username: string, password: string): Promise<User> {
  const response = await csrfPost('/api/auth/login', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
  })
  if (!response.ok) throw await failure(response)
  return readUser(response)
}

export async function register(username: string, password: string): Promise<User> {
  const response = await csrfPost('/api/auth/register', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) throw await failure(response)
  return readUser(response)
}

export async function logout(): Promise<void> {
  const response = await csrfPost('/api/auth/logout', {})
  if (!response.ok) throw await failure(response)
}

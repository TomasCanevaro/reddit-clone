import { afterEach, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import { AuthError, currentUser, login, logout, register } from '../src/auth/api.ts'

const user = { id: 7, username: 'Example', createdAt: '2026-01-01T10:00:00Z' }
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' }
afterEach(() => mock.restoreAll())

type Step = {
  path: string
  status?: number
  body?: unknown
  check?: (options: RequestInit) => void
}

function expectRequests(steps: Step[]) {
  let index = 0
  mock.method(globalThis, 'fetch', async (path: string, options: RequestInit) => {
    const step = steps[index++]
    assert.ok(step, 'Unexpected additional request')
    assert.equal(path, step.path)
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.cache, 'no-store')
    assert.ok(options.signal)
    step.check?.(options)
    return step.body === undefined
      ? new Response(null, { status: step.status ?? 204 })
      : Response.json(step.body, { status: step.status ?? 200 })
  })
  return () => assert.equal(index, steps.length)
}

test('restores a current user and keeps only public fields', async () => {
  const done = expectRequests([{ path: '/api/auth/me', body: { ...user, passwordHash: 'must-not-be-kept' } }])
  assert.deepEqual(await currentUser(), user)
  done()
})

test('treats only 401 as an anonymous session', async () => {
  const done = expectRequests([{ path: '/api/auth/me', status: 401 }])
  assert.equal(await currentUser(), null)
  done()
})

test('does not mistake an unavailable backend for a logged-out user', async () => {
  const done = expectRequests([{ path: '/api/auth/me', status: 503 }])
  await assert.rejects(currentUser(), (error) => error instanceof AuthError && error.status === 503)
  done()
})

test('login gets CSRF first and sends a URL-encoded body with cookies', async () => {
  const password = 'pass with + and & symbols'
  const done = expectRequests([
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/login', body: user, check(options) {
      assert.equal(options.method, 'POST')
      assert.equal(new Headers(options.headers).get('X-CSRF-TOKEN'), csrf.token)
      assert.equal(new Headers(options.headers).get('Content-Type'), 'application/x-www-form-urlencoded')
      assert.ok(options.body instanceof URLSearchParams)
      assert.equal(options.body.get('username'), 'Example')
      assert.equal(options.body.get('password'), password)
    } },
  ])
  assert.deepEqual(await login('Example', password), user)
  done()
})

test('registration sends JSON with a fresh CSRF header', async () => {
  const done = expectRequests([
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/register', status: 201, body: user, check(options) {
      assert.equal(new Headers(options.headers).get('Content-Type'), 'application/json')
      assert.equal(new Headers(options.headers).get('X-CSRF-TOKEN'), csrf.token)
      assert.deepEqual(JSON.parse(options.body as string), { username: 'Example', password: 'long-passphrase' })
    } },
  ])
  assert.deepEqual(await register('Example', 'long-passphrase'), user)
  done()
})

test('retains field validation messages without reflecting arbitrary error fields', async () => {
  const done = expectRequests([
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/register', status: 400, body: { errors: { username: 'Invalid username.', password: 'Too short.', internal: 'private' } } },
  ])
  await assert.rejects(register('ab', 'short'), (error) => {
    assert.ok(error instanceof AuthError)
    assert.deepEqual(error.fields, { username: 'Invalid username.', password: 'Too short.' })
    return true
  })
  done()
})

test('duplicate usernames produce a useful conflict message', async () => {
  const done = expectRequests([
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/register', status: 409 },
  ])
  await assert.rejects(register('Example', 'long-passphrase'), /That username is already taken/)
  done()
})

test('incorrect credentials produce the generic login message', async () => {
  const done = expectRequests([
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/login', status: 401 },
  ])
  await assert.rejects(login('Example', 'wrong'), /Invalid username or password/)
  done()
})

test('logout accepts an empty 204 response without parsing JSON', async () => {
  const done = expectRequests([
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/logout', status: 204, check(options) {
      assert.equal(options.method, 'POST')
      assert.equal(new Headers(options.headers).get('X-CSRF-TOKEN'), csrf.token)
    } },
  ])
  await logout()
  done()
})

test('refreshes the token and retries a rejected CSRF request once', async () => {
  const done = expectRequests([
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/login', status: 403 },
    { path: '/api/auth/csrf', body: { ...csrf, token: 'new-token' } },
    { path: '/api/auth/login', body: user, check(options) {
      assert.equal(new Headers(options.headers).get('X-CSRF-TOKEN'), 'new-token')
    } },
  ])
  assert.deepEqual(await login('Example', 'long-passphrase'), user)
  done()
})

test('does not loop when the second CSRF request is also rejected', async () => {
  const done = expectRequests([
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/logout', status: 403 },
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/logout', status: 403 },
  ])
  await assert.rejects(logout(), (error) => error instanceof AuthError && error.status === 403)
  done()
})

test('never submits credentials if token acquisition fails', async () => {
  const done = expectRequests([{ path: '/api/auth/csrf', status: 503 }])
  await assert.rejects(login('Example', 'long-passphrase'), /Unable to prepare/)
  done()
})

test('rejects malformed CSRF responses before making a POST', async () => {
  const done = expectRequests([{ path: '/api/auth/csrf', body: { token: 'missing-header' } }])
  await assert.rejects(register('Example', 'long-passphrase'), /Unexpected CSRF response/)
  done()
})

test('rejects invalid account responses instead of marking a user signed in', async () => {
  const done = expectRequests([
    { path: '/api/auth/csrf', body: csrf },
    { path: '/api/auth/login', body: { ...user, createdAt: 'invalid' } },
  ])
  await assert.rejects(login('Example', 'long-passphrase'), /Unexpected account response/)
  done()
})

import { afterEach, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchPost } from '../src/posts/api.ts'

const post = { id: 61, title: 'Example', body: 'Full body', createdAt: '2026-01-03T10:00:00Z' }
afterEach(() => mock.restoreAll())

test('fetches a post by its route ID and forwards the abort signal', async () => {
  const signal = new AbortController().signal
  const request = mock.method(globalThis, 'fetch', async () => Response.json(post))
  assert.deepEqual(await fetchPost('61', signal), post)
  assert.equal(request.mock.calls[0].arguments[0], '/api/posts/61')
  assert.equal(request.mock.calls[0].arguments[1].signal, signal)
})

test('handles an empty 404 response as a missing post', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }))
  assert.equal(await fetchPost('0', new AbortController().signal), null)
})

test('keeps server failures distinct from missing posts', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(null, { status: 500 }))
  await assert.rejects(fetchPost('61', new AbortController().signal), /request failed/)
})

test('rejects malformed post data instead of rendering it', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ ...post, createdAt: 'invalid' }))
  await assert.rejects(fetchPost('61', new AbortController().signal), /Unexpected post response/)
})

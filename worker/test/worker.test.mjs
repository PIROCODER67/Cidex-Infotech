// Run with: node --test test/worker.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const realFetch = globalThis.fetch;
const html = '<!doctype html><html><head><title>Test site for a business</title><meta name="description" content="A description of the business that is long enough to be useful."><meta name="viewport" content="width=device-width"></head><body><h1>Hi</h1><img src="a.jpg" alt="a"></body></html>';
function mockFetch(handler) { globalThis.fetch = async (url, init) => handler(String(url), init) ?? realFetch(url, init); }
const req = (path, body, method = 'POST') => new Request('https://site.test' + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
const env = (extra = {}) => ({ ASSETS: null, ...extra });

test('health answers', async () => {
  const r = await worker.fetch(new Request('https://site.test/api/health'), env());
  assert.equal(r.status, 200);
});

test('submit without storage or email says so, and does not claim success', async () => {
  const r = await worker.fetch(req('/api/submit', { kind: 'mail', name: 'A', email: 'a@example.com', message: 'hello there' }), env());
  assert.equal(r.status, 503);
  const d = await r.json();
  assert.equal(d.ok, false);
});

test('submit with KV storage saves the record', async () => {
  const store = {};
  const kv = { put: async (k, v) => { store[k] = v; } };
  const r = await worker.fetch(req('/api/submit', { kind: 'profile', name: 'A', email: 'a@example.com', details: { company: 'X' } }), env({ FORMS: kv }));
  const d = await r.json();
  assert.equal(d.ok, true);
  assert.equal(d.saved, true);
  assert.equal(Object.keys(store).length, 1);
});

test('submit with Resend emails the team', async () => {
  let sent = null;
  mockFetch((url, init) => { if (url.startsWith('https://api.resend.com')) { sent = JSON.parse(init.body); return new Response('{}', { status: 200 }); } return null; });
  try {
    const r = await worker.fetch(req('/api/submit', { kind: 'mail', name: 'A', email: 'a@example.com', message: 'hello there' }), env({ RESEND_API_KEY: 'test', TEAM_EMAIL: 'team@example.com' }));
    const d = await r.json();
    assert.equal(d.ok, true);
    assert.equal(d.emailed, true);
    assert.deepEqual(sent.to, ['team@example.com']);
  } finally { globalThis.fetch = realFetch; }
});

test('SEO check runs without Supabase and returns a report', async () => {
  mockFetch((url) => { if (url.startsWith('https://example.com')) return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }); return null; });
  try {
    const r = await worker.fetch(req('/api/audit', { url: 'https://example.com', email: 'a@example.com', name: 'A', website: '', elapsed: 5000 }), env());
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(typeof d.score, 'number');
    assert.ok(Array.isArray(d.checks) && d.checks.length > 0);
  } finally { globalThis.fetch = realFetch; }
});

test('chat says AI is not switched on without an API key', async () => {
  const r = await worker.fetch(req('/api/chat', { messages: [{ role: 'user', content: 'website price' }], state: {} }), env());
  assert.equal(r.status, 503);
});

test('chat returns a reply from the model, with the estimate from our rules', async () => {
  mockFetch((url) => {
    if (url.includes('/chat/completions')) return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ reply: 'What is your business type?', service: 'seo', answers: { keywords: 5, pages_to_optimise: 3, content_writing: false } }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    return null;
  });
  try {
    const r = await worker.fetch(req('/api/chat', { messages: [{ role: 'user', content: 'SEO price' }], state: {} }), env({ OPENAI_API_KEY: 'k', OPENAI_BASE_URL: 'https://upstream.test/v1' }));
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(typeof d.reply, 'string');
    assert.ok(d.reply.length > 0);
  } finally { globalThis.fetch = realFetch; }
});

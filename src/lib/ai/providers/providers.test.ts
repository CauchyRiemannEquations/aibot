import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { AIProviderError } from '@/lib/ai/errors';
import { anthropicAdapter } from '@/lib/ai/providers/anthropic';
import { googleAdapter } from '@/lib/ai/providers/google';
import { openAiAdapter } from '@/lib/ai/providers/openai';
import { openRouterAdapter } from '@/lib/ai/providers/openrouter';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function setFetch(handler: () => Response) {
  globalThis.fetch = (async () => handler()) as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sseResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

const IMG = 'data:image/png;base64,aGVsbG8=';

/* ── OpenAI 호환 (OpenRouter/OpenAI) ── */
for (const adapter of [openRouterAdapter, openAiAdapter]) {
  test(`${adapter.id}: testCredential success`, async () => {
    setFetch(() => jsonResponse(200, { choices: [{ message: { content: 'ok' } }] }));
    const result = await adapter.testCredential({ apiKey: 'k', model: 'm' });
    assert.equal(result.ok, true);
  });

  test(`${adapter.id}: invalid key → INVALID_CREDENTIAL`, async () => {
    setFetch(() => jsonResponse(401, { error: { message: 'unauthorized' } }));
    const result = await adapter.testCredential({ apiKey: 'bad', model: 'm' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'INVALID_CREDENTIAL');
  });

  test(`${adapter.id}: quota 429 → INSUFFICIENT_CREDIT`, async () => {
    setFetch(() => jsonResponse(429, { error: { message: 'insufficient quota' } }));
    const result = await adapter.testCredential({ apiKey: 'k', model: 'm' });
    assert.equal(result.code, 'INSUFFICIENT_CREDIT');
  });

  test(`${adapter.id}: rate limit 429 → RATE_LIMITED`, async () => {
    setFetch(() => jsonResponse(429, { error: { message: 'slow down' } }));
    const result = await adapter.testCredential({ apiKey: 'k', model: 'm' });
    assert.equal(result.code, 'RATE_LIMITED');
  });

  test(`${adapter.id}: bad model 404 → MODEL_NOT_FOUND`, async () => {
    setFetch(() => jsonResponse(404, { error: { message: 'no such model' } }));
    const result = await adapter.testCredential({ apiKey: 'k', model: 'nope' });
    assert.equal(result.code, 'MODEL_NOT_FOUND');
  });

  test(`${adapter.id}: OCR extracts recognized text`, async () => {
    setFetch(() => jsonResponse(200, { choices: [{ message: { content: '$x^2$ 문제' } }] }));
    const text = await adapter.recognizeProblemFromImage({
      apiKey: 'k',
      model: 'm',
      dataUrl: IMG,
      mimeType: 'image/png',
    });
    assert.match(text, /x\^2/);
  });

  test(`${adapter.id}: streaming converts SSE deltas to text`, async () => {
    const sse =
      'data: {"choices":[{"delta":{"content":"안"}}]}\n' +
      'data: {"choices":[{"delta":{"content":"녕"}}]}\n' +
      'data: [DONE]\n';
    setFetch(() => sseResponse(sse));
    const stream = await adapter.streamTutorReply({
      apiKey: 'k',
      model: 'm',
      systemPrompt: 's',
      messages: [{ role: 'user', content: 'hi' }],
    });
    assert.equal(await readAll(stream), '안녕');
  });
}

/* ── Anthropic ── */
test('anthropic: testCredential success', async () => {
  setFetch(() => jsonResponse(200, { content: [{ type: 'text', text: 'ok' }] }));
  const result = await anthropicAdapter.testCredential({ apiKey: 'k', model: 'm' });
  assert.equal(result.ok, true);
});

test('anthropic: invalid key → INVALID_CREDENTIAL', async () => {
  setFetch(() => jsonResponse(401, { error: { message: 'auth' } }));
  const result = await anthropicAdapter.testCredential({ apiKey: 'bad', model: 'm' });
  assert.equal(result.code, 'INVALID_CREDENTIAL');
});

test('anthropic: OCR extracts text blocks', async () => {
  setFetch(() => jsonResponse(200, { content: [{ type: 'text', text: '문제 $y=1$' }] }));
  const text = await anthropicAdapter.recognizeProblemFromImage({
    apiKey: 'k',
    model: 'm',
    dataUrl: IMG,
    mimeType: 'image/png',
  });
  assert.match(text, /y=1/);
});

test('anthropic: streaming converts content_block_delta', async () => {
  const sse =
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"질"}}\n' +
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"문"}}\n';
  setFetch(() => sseResponse(sse));
  const stream = await anthropicAdapter.streamTutorReply({
    apiKey: 'k',
    model: 'm',
    systemPrompt: 's',
    messages: [{ role: 'user', content: 'hi' }],
  });
  assert.equal(await readAll(stream), '질문');
});

/* ── Google ── */
test('google: testCredential success', async () => {
  setFetch(() => jsonResponse(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }));
  const result = await googleAdapter.testCredential({ apiKey: 'k', model: 'm' });
  assert.equal(result.ok, true);
});

test('google: bad image 400 → UNSUPPORTED_IMAGE', async () => {
  setFetch(() => jsonResponse(400, { error: { message: 'invalid image input' } }));
  const result = await googleAdapter.testCredential({ apiKey: 'k', model: 'm' });
  assert.equal(result.code, 'UNSUPPORTED_IMAGE');
});

test('google: OCR extracts parts text', async () => {
  setFetch(() =>
    jsonResponse(200, { candidates: [{ content: { parts: [{ text: '문제 ' }, { text: '$z$' }] } }] }),
  );
  const text = await googleAdapter.recognizeProblemFromImage({
    apiKey: 'k',
    model: 'm',
    dataUrl: IMG,
    mimeType: 'image/png',
  });
  assert.match(text, /\$z\$/);
});

test('google: streaming converts candidate parts', async () => {
  const sse =
    'data: {"candidates":[{"content":{"parts":[{"text":"생"}]}}]}\n' +
    'data: {"candidates":[{"content":{"parts":[{"text":"각"}]}}]}\n';
  setFetch(() => sseResponse(sse));
  const stream = await googleAdapter.streamTutorReply({
    apiKey: 'k',
    model: 'm',
    systemPrompt: 's',
    messages: [{ role: 'user', content: 'hi' }],
  });
  assert.equal(await readAll(stream), '생각');
});

test('adapters throw AIProviderError on unsupported image data url', async () => {
  setFetch(() => jsonResponse(200, {}));
  await assert.rejects(
    anthropicAdapter.recognizeProblemFromImage({
      apiKey: 'k',
      model: 'm',
      dataUrl: 'not-a-data-url',
      mimeType: 'image/png',
    }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'UNSUPPORTED_IMAGE',
  );
});

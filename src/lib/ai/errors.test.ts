import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AIProviderError,
  classifyHttpStatus,
  toStudentMessage,
  toTeacherMessage,
} from '@/lib/ai/errors';

const PROVIDER_WORDS = ['gemini', 'openai', 'anthropic', 'claude', 'openrouter', 'api'];

test('classifyHttpStatus maps common statuses', () => {
  assert.equal(classifyHttpStatus(401), 'INVALID_CREDENTIAL');
  assert.equal(classifyHttpStatus(403), 'INVALID_CREDENTIAL');
  assert.equal(classifyHttpStatus(402), 'INSUFFICIENT_CREDIT');
  assert.equal(classifyHttpStatus(429), 'RATE_LIMITED');
  assert.equal(classifyHttpStatus(429, 'quota exceeded'), 'INSUFFICIENT_CREDIT');
  assert.equal(classifyHttpStatus(404), 'MODEL_NOT_FOUND');
  assert.equal(classifyHttpStatus(500), 'UPSTREAM_UNAVAILABLE');
  assert.equal(classifyHttpStatus(400, 'invalid image data'), 'UNSUPPORTED_IMAGE');
});

test('student messages never contain provider names', () => {
  const codes = [
    'INVALID_CREDENTIAL',
    'INSUFFICIENT_CREDIT',
    'RATE_LIMITED',
    'MODEL_NOT_FOUND',
    'UNSUPPORTED_IMAGE',
    'UPSTREAM_UNAVAILABLE',
    'UNKNOWN',
  ] as const;
  for (const code of codes) {
    for (const ctx of ['tutor', 'ocr'] as const) {
      const message = toStudentMessage(new AIProviderError(code, 'raw upstream detail'), ctx);
      const lower = message.toLowerCase();
      for (const word of PROVIDER_WORDS) {
        assert.ok(!lower.includes(word), `student message leaked "${word}": ${message}`);
      }
    }
  }
});

test('student message for unknown error is generic', () => {
  const message = toStudentMessage(new Error('boom sk-secret'), 'tutor');
  assert.ok(!message.includes('sk-secret'));
  assert.ok(message.length > 0);
});

test('OCR context yields the photo-specific student message', () => {
  const message = toStudentMessage(new AIProviderError('INVALID_CREDENTIAL', 'x'), 'ocr');
  assert.ok(message.includes('사진'));
});

test('teacher messages are specific but omit provider names', () => {
  const message = toTeacherMessage(new AIProviderError('INVALID_CREDENTIAL', 'x'));
  const lower = message.toLowerCase();
  for (const word of ['gemini', 'openrouter', 'anthropic', 'openai']) {
    assert.ok(!lower.includes(word));
  }
});

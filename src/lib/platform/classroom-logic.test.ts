import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkAvailability,
  generateSlug,
  toPublicView,
  type ClassroomRow,
} from '@/lib/platform/classroom-logic';

function makeRow(overrides: Partial<ClassroomRow> = {}): ClassroomRow {
  return {
    id: 'room-1',
    teacher_id: 'teacher-1',
    name: '2학년 3반 미적분',
    public_slug: 'abc123',
    provider_credential_id: 'cred-1',
    subject_id: 'calculus-1',
    vision_model: 'gemini-2.5-flash',
    tutor_model: 'gemini-2.5-flash',
    solver_model: null,
    guidance_note: '오늘은 3단원 과제',
    is_active: true,
    optional_access_code_hash: null,
    daily_limit_per_session: 30,
    daily_limit_total: 500,
    expires_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

test('active classroom is available', () => {
  assert.deepEqual(checkAvailability(makeRow()), { available: true });
});

test('inactive classroom is unavailable', () => {
  assert.deepEqual(checkAvailability(makeRow({ is_active: false })), {
    available: false,
    reason: 'inactive',
  });
});

test('expired classroom is unavailable', () => {
  const row = makeRow({ expires_at: '2020-01-01T00:00:00Z' });
  assert.deepEqual(checkAvailability(row), { available: false, reason: 'expired' });
});

test('future expiry is still available', () => {
  const row = makeRow({ expires_at: '2999-01-01T00:00:00Z' });
  assert.deepEqual(checkAvailability(row), { available: true });
});

test('missing classroom is not_found', () => {
  assert.deepEqual(checkAvailability(null), { available: false, reason: 'not_found' });
});

test('public view exposes only safe fields and no provider/model/teacher info', () => {
  const view = toPublicView(makeRow());
  const keys = Object.keys(view).sort();
  assert.deepEqual(keys, [
    'dailyLimitPerSession',
    'guidanceNote',
    'name',
    'requiresAccessCode',
    'slug',
    'subjectId',
  ]);

  const serialized = JSON.stringify(view).toLowerCase();
  for (const banned of ['gemini', 'teacher', 'cred', 'model', 'provider', 'openrouter', 'api']) {
    assert.ok(!serialized.includes(banned), `public view leaked "${banned}"`);
  }
});

test('requiresAccessCode reflects presence of hash', () => {
  assert.equal(toPublicView(makeRow({ optional_access_code_hash: 'x' })).requiresAccessCode, true);
  assert.equal(toPublicView(makeRow({ optional_access_code_hash: null })).requiresAccessCode, false);
});

test('generated slugs are long and unique', () => {
  const a = generateSlug();
  const b = generateSlug();
  assert.ok(a.length >= 24);
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});

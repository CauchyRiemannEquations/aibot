import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hashAccessCode, verifyAccessCode } from '@/lib/platform/access-code';

test('hashing is deterministic per slug+code', () => {
  assert.equal(hashAccessCode('slug1', '1234'), hashAccessCode('slug1', '1234'));
});

test('same code under different slugs yields different hashes', () => {
  assert.notEqual(hashAccessCode('slug1', '1234'), hashAccessCode('slug2', '1234'));
});

test('correct code verifies', () => {
  const hash = hashAccessCode('slug1', 'secret');
  assert.equal(verifyAccessCode('slug1', 'secret', hash), true);
});

test('incorrect code is rejected', () => {
  const hash = hashAccessCode('slug1', 'secret');
  assert.equal(verifyAccessCode('slug1', 'wrong', hash), false);
});

test('hash never equals the raw code', () => {
  assert.notEqual(hashAccessCode('slug1', 'secret'), 'secret');
});

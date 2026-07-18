import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import {
  decryptWithKey,
  encryptWithKey,
  maskCredential,
  parseMasterKey,
} from './credential-crypto.core';

const key = randomBytes(32);

test('encrypt/decrypt round-trip returns the original plaintext', () => {
  const secret = 'sk-or-v1-super-secret-key-1234567890';
  const payload = encryptWithKey(secret, key);
  assert.equal(payload.keyVersion, 1);
  assert.notEqual(payload.ciphertext, secret);
  const decrypted = decryptWithKey(payload, key);
  assert.equal(decrypted, secret);
});

test('ciphertext does not contain the plaintext', () => {
  const secret = 'plaintext-value-xyz';
  const payload = encryptWithKey(secret, key);
  assert.ok(!payload.ciphertext.includes(secret));
});

test('decrypting with the wrong key throws', () => {
  const payload = encryptWithKey('secret-value', key);
  const wrongKey = randomBytes(32);
  assert.throws(() => decryptWithKey(payload, wrongKey));
});

test('tampered ciphertext is rejected by GCM auth', () => {
  const payload = encryptWithKey('secret-value', key);
  const raw = Buffer.from(payload.ciphertext, 'base64');
  raw[0] = raw[0] ^ 0xff;
  const tampered = { ...payload, ciphertext: raw.toString('base64') };
  assert.throws(() => decryptWithKey(tampered, key));
});

test('tampered auth tag is rejected', () => {
  const payload = encryptWithKey('secret-value', key);
  const tag = Buffer.from(payload.authTag, 'base64');
  tag[0] = tag[0] ^ 0xff;
  const tampered = { ...payload, authTag: tag.toString('base64') };
  assert.throws(() => decryptWithKey(tampered, key));
});

test('each encryption uses a fresh IV', () => {
  const a = encryptWithKey('same', key);
  const b = encryptWithKey('same', key);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.ciphertext, b.ciphertext);
});

test('maskCredential exposes only the last four characters', () => {
  assert.equal(maskCredential('sk-or-v1-abcd1234'), '1234');
  assert.equal(maskCredential('xy'), '••••');
});

test('parseMasterKey accepts base64, hex, and 32-byte utf8', () => {
  assert.equal(parseMasterKey(randomBytes(32).toString('base64')).length, 32);
  assert.equal(parseMasterKey(randomBytes(32).toString('hex')).length, 32);
  assert.equal(parseMasterKey('a'.repeat(32)).length, 32);
});

test('parseMasterKey rejects short or missing keys', () => {
  assert.throws(() => parseMasterKey(undefined));
  assert.throws(() => parseMasterKey('too-short'));
});

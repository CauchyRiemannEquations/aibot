import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateImageFile } from '@/lib/image';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];

function fileOf(bytes: number[], type: string, name = 'p'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

test('valid PNG passes and uses the sniffed mime', async () => {
  const result = await validateImageFile(fileOf(PNG_MAGIC, 'image/png'), 1024);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.mimeType, 'image/png');
    assert.match(result.dataUrl, /^data:image\/png;base64,/);
  }
});

test('valid JPEG passes', async () => {
  const result = await validateImageFile(fileOf(JPEG_MAGIC, 'image/jpeg'), 1024);
  assert.equal(result.ok, true);
});

test('oversize file is rejected before reading', async () => {
  const result = await validateImageFile(fileOf(PNG_MAGIC, 'image/png'), 4);
  assert.deepEqual(result, { ok: false, error: 'too_large' });
});

test('unsupported declared type is rejected', async () => {
  const result = await validateImageFile(fileOf(PNG_MAGIC, 'application/pdf'), 1024);
  assert.deepEqual(result, { ok: false, error: 'unsupported_type' });
});

test('declared image but wrong signature is rejected', async () => {
  const garbage = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b];
  const result = await validateImageFile(fileOf(garbage, 'image/png'), 1024);
  assert.deepEqual(result, { ok: false, error: 'not_an_image' });
});

test('mislabeled jpeg with png bytes is accepted as png (signature wins)', async () => {
  const result = await validateImageFile(fileOf(PNG_MAGIC, 'image/jpeg'), 1024);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.mimeType, 'image/png');
});

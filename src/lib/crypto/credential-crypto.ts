import 'server-only';

import {
  CURRENT_KEY_VERSION,
  decryptWithKey,
  encryptWithKey,
  maskCredential,
  parseMasterKey,
  type EncryptedPayload,
} from '@/lib/crypto/credential-crypto.core';

/*
 * API 키 암호화 공개 진입점 (server-only).
 * 마스터 키는 CREDENTIAL_ENCRYPTION_KEY 환경변수에서만 읽는다.
 * 이 모듈은 클라이언트 번들에 포함될 수 없다.
 */

function getMasterKey(): Buffer {
  return parseMasterKey(process.env.CREDENTIAL_ENCRYPTION_KEY);
}

export function encryptCredential(plainText: string): EncryptedPayload {
  return encryptWithKey(plainText, getMasterKey());
}

export function decryptCredential(payload: EncryptedPayload): string {
  return decryptWithKey(payload, getMasterKey());
}

export { maskCredential, CURRENT_KEY_VERSION };
export type { EncryptedPayload };

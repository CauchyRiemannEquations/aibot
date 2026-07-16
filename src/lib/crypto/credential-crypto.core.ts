import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/*
 * API 키 암호화 순수 로직 (AES-256-GCM).
 * server-only 제약 없이 단위 테스트가 가능하도록 분리한 코어.
 * 앱 코드는 반드시 server-only 래퍼(credential-crypto.ts)를 통해 사용한다.
 * 원문 키·마스터 키는 이 모듈 어디에서도 로그로 남기지 않는다.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM 권장 96-bit
const CURRENT_KEY_VERSION = 1;

export type EncryptedPayload = {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
  keyVersion: number;
};

/** 마스터 키 파싱: base64(32바이트) 또는 hex(64자) 또는 임의 문자열(최소 32바이트) 허용. */
export function parseMasterKey(raw: string | undefined): Buffer {
  if (!raw || raw.trim().length === 0) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is not set.');
  }
  const value = raw.trim();

  // base64로 정확히 32바이트면 그대로 사용
  try {
    const b64 = Buffer.from(value, 'base64');
    if (b64.length === 32) return b64;
  } catch {
    /* ignore */
  }
  // hex 64자 → 32바이트
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, 'hex');
  }
  // 그 외: UTF-8 바이트가 정확히 32바이트일 때만 허용
  const utf8 = Buffer.from(value, 'utf8');
  if (utf8.length === 32) return utf8;

  throw new Error(
    'CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes (base64 of 32 bytes, 64 hex chars, or 32-byte string).',
  );
}

export function encryptWithKey(plainText: string, masterKey: Buffer): EncryptedPayload {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    throw new Error('plainText must be a non-empty string.');
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: CURRENT_KEY_VERSION,
  };
}

export function decryptWithKey(payload: EncryptedPayload, masterKey: Buffer): string {
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);
  // 변조된 ciphertext/authTag이면 여기서 예외가 발생한다.
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

/** 화면 표시에 쓸 마지막 4자리. 그 외 부분은 절대 노출하지 않는다. */
export function maskCredential(apiKey: string): string {
  const trimmed = (apiKey ?? '').trim();
  if (trimmed.length <= 4) return '••••';
  return trimmed.slice(-4);
}

/** 접속 코드 등 상수 시간 비교가 필요할 때 사용. */
export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export { CURRENT_KEY_VERSION };

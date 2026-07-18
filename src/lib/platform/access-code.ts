import { createHash, timingSafeEqual } from 'node:crypto';

/*
 * 반 접속 코드 해시.
 * 접속 코드는 편의용 저엔트로피 게이트이므로 강력한 비밀번호 해시가 아니라
 * slug를 솔트로 사용하는 SHA-256으로 처리하고 상수 시간 비교한다.
 * (보안 문서에 한계를 명시)
 */
export function hashAccessCode(slug: string, code: string): string {
  return createHash('sha256').update(`${slug}:${code}`).digest('hex');
}

export function verifyAccessCode(slug: string, code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashAccessCode(slug, code), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

/*
 * 앱 운영 모드 및 플랫폼 공통 설정.
 * 이 모듈은 클라이언트에서도 import될 수 있으므로 비밀 값을 읽지 않는다.
 * (NEXT_PUBLIC_* 만 참조)
 */

export type AppMode = 'single' | 'platform';

export function getAppMode(): AppMode {
  return process.env.NEXT_PUBLIC_APP_MODE === 'platform' || process.env.APP_MODE === 'platform'
    ? 'platform'
    : 'single';
}

export function isPlatformMode(): boolean {
  return getAppMode() === 'platform';
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}

/* 서버 전용: 플랫폼 운영자 이메일 목록. 클라이언트에서 호출하지 않는다. */
export function getPlatformOwnerEmails(): string[] {
  return (process.env.PLATFORM_OWNER_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  return getPlatformOwnerEmails().includes(email.trim().toLowerCase());
}

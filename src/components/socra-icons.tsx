/*
 * 다크 네온(1c) 디자인의 심플 라인 아이콘.
 * 로봇 마스코트를 대체한다. 24×24 viewBox, currentColor stroke.
 */

export function CameraIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5h3.5L8 6.2h8l1.5 2.3H21v11H3z" />
      <circle cx="12" cy="13.2" r="3.4" />
    </svg>
  );
}

export function SendArrowIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

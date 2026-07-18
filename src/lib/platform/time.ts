/*
 * Asia/Seoul 기준 날짜 계산. 사용량 집계와 한도는 항상 서울 시각의 '오늘'로 계산한다.
 */
export function seoulDateString(now: Date = new Date()): string {
  // en-CA 로케일은 YYYY-MM-DD 형식을 준다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

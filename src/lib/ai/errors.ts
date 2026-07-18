import type { AIProviderErrorCode } from '@/lib/ai/types';

/*
 * 제공업체 오류를 내부 공통 형태로 표현.
 * message는 서버 로그/교사 화면용이며, 절대 원문 API 키를 담지 않는다.
 * 학생에게는 toStudentMessage()로 제공업체 이름을 제거한 일반 문구만 노출한다.
 */
export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;
  readonly httpStatus?: number;

  constructor(code: AIProviderErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/* 제공업체 이름 등 민감 토큰이 문구에 새어 나가지 않도록 하는 화이트리스트 문구. */
const STUDENT_MESSAGE: Record<AIProviderErrorCode, string> = {
  INVALID_CREDENTIAL: 'AI 튜터와 연결하지 못했어요. 잠시 후 다시 시도하거나 선생님께 문의해 주세요.',
  INSUFFICIENT_CREDIT: 'AI 튜터와 연결하지 못했어요. 잠시 후 다시 시도하거나 선생님께 문의해 주세요.',
  RATE_LIMITED: '지금 이용자가 많아요. 잠시 후 다시 시도해 주세요.',
  MODEL_NOT_FOUND: 'AI 튜터와 연결하지 못했어요. 잠시 후 다시 시도하거나 선생님께 문의해 주세요.',
  UNSUPPORTED_IMAGE: '사진을 읽지 못했어요. 더 선명한 사진으로 다시 시도해 주세요.',
  UPSTREAM_UNAVAILABLE: 'AI 튜터와 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
  UNKNOWN: 'AI 튜터와 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

const OCR_STUDENT_MESSAGE = '사진을 읽지 못했어요. 더 선명한 사진으로 다시 시도해 주세요.';

export function toStudentMessage(error: unknown, context: 'ocr' | 'tutor' = 'tutor'): string {
  if (error instanceof AIProviderError) {
    if (context === 'ocr' && error.code !== 'RATE_LIMITED') {
      return OCR_STUDENT_MESSAGE;
    }
    return STUDENT_MESSAGE[error.code];
  }
  return context === 'ocr' ? OCR_STUDENT_MESSAGE : STUDENT_MESSAGE.UNKNOWN;
}

export function toTeacherMessage(error: unknown): string {
  if (error instanceof AIProviderError) {
    switch (error.code) {
      case 'INVALID_CREDENTIAL':
        return 'API 키가 유효하지 않아요. 키를 다시 확인해 주세요.';
      case 'INSUFFICIENT_CREDIT':
        return '제공업체 잔액 또는 사용 한도가 부족해요. 결제 상태를 확인해 주세요.';
      case 'RATE_LIMITED':
        return '요청이 너무 몰렸어요. 잠시 후 다시 시도해 주세요.';
      case 'MODEL_NOT_FOUND':
        return '모델 ID를 찾지 못했어요. 모델 이름을 다시 확인해 주세요.';
      case 'UNSUPPORTED_IMAGE':
        return '이미지 형식을 처리하지 못했어요. 다른 사진으로 시도해 주세요.';
      case 'UPSTREAM_UNAVAILABLE':
        return 'AI 제공업체 서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.';
      default:
        return '연결에 실패했어요. 잠시 후 다시 시도해 주세요.';
    }
  }
  return '연결에 실패했어요. 잠시 후 다시 시도해 주세요.';
}

/* HTTP 상태코드 → 공통 오류 코드 매핑 (OpenAI 호환/Anthropic/Google 공통 기본값). */
export function classifyHttpStatus(status: number, bodySnippet = ''): AIProviderErrorCode {
  const snippet = bodySnippet.toLowerCase();
  if (status === 401 || status === 403) return 'INVALID_CREDENTIAL';
  if (status === 402) return 'INSUFFICIENT_CREDIT';
  if (status === 429) {
    if (snippet.includes('quota') || snippet.includes('credit') || snippet.includes('billing')) {
      return 'INSUFFICIENT_CREDIT';
    }
    return 'RATE_LIMITED';
  }
  if (status === 404) return 'MODEL_NOT_FOUND';
  if (status === 400) {
    if (snippet.includes('model')) return 'MODEL_NOT_FOUND';
    if (snippet.includes('image') || snippet.includes('media') || snippet.includes('mime')) {
      return 'UNSUPPORTED_IMAGE';
    }
    return 'UNKNOWN';
  }
  if (status >= 500) return 'UPSTREAM_UNAVAILABLE';
  return 'UNKNOWN';
}

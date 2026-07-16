/*
 * 다중 AI 제공업체 공통 타입.
 * 모든 제공업체(Google/OpenAI/Anthropic/OpenRouter)는 이 인터페이스 뒤에 숨는다.
 * SDK·모델명을 여기 밖으로 흩뿌리지 않는다.
 */

export type ProviderId = 'google' | 'openai' | 'anthropic' | 'openrouter';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ProviderModels = {
  visionModel: string;
  tutorModel: string;
  solverModel?: string;
};

/* 내부 공통 오류 코드 — 제공업체별 오류를 이 형태로 정규화한다. */
export type AIProviderErrorCode =
  | 'INVALID_CREDENTIAL'
  | 'INSUFFICIENT_CREDIT'
  | 'RATE_LIMITED'
  | 'MODEL_NOT_FOUND'
  | 'UNSUPPORTED_IMAGE'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UNKNOWN';

export type CredentialTestResult = {
  ok: boolean;
  code?: AIProviderErrorCode;
  /* 교사 화면용 구체 메시지. 절대 원문 API 키를 담지 않는다. */
  message: string;
};

export type RecognizeParams = {
  apiKey: string;
  model: string;
  /** data:{mime};base64,{...} 형식 */
  dataUrl: string;
  mimeType: string;
};

export type StreamTutorParams = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
};

export type GenerateSolutionParams = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
};

export type TestCredentialParams = {
  apiKey: string;
  /** 연결 테스트에 사용할 모델 (보통 tutorModel). */
  model: string;
};

export interface AIProviderAdapter {
  readonly id: ProviderId;
  testCredential(params: TestCredentialParams): Promise<CredentialTestResult>;
  recognizeProblemFromImage(params: RecognizeParams): Promise<string>;
  streamTutorReply(params: StreamTutorParams): Promise<ReadableStream<Uint8Array>>;
  generateSolution(params: GenerateSolutionParams): Promise<string>;
}

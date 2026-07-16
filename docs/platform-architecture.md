# 플랫폼 아키텍처

## 운영 모드

`APP_MODE` 환경변수로 두 모드를 전환한다. 기본값은 `single`.

- `single`: 기존 단일 사용자 사이트. 서버 `OPENROUTER_API_KEY` 를 사용.
- `platform`: 다중 교사 공유 플랫폼. 교사별 자격증명·반·사용량 한도·대시보드.

모드 판별은 `src/lib/platform/config.ts` 의 `getAppMode()` 한 곳에서만 한다. 모드에 따라 렌더가 달라지는 페이지(`/`, 교사·관리자 레이아웃)는 `dynamic = 'force-dynamic'` 으로 런타임에 평가한다.

## 공통 서비스 계층 (두 모드가 재사용)

기존 교육 로직은 그대로 두고, 제공업체 호출만 서비스 계층으로 분리했다.

```
src/lib/
  socratic.ts        # 소크라테스식 시스템 프롬프트 (변경 없음, 재사용)
  prompts.ts         # 풀이 프롬프트 (변경 없음)
  rag.ts             # 키워드 RAG (변경 없음)
  cards.ts           # 과목 위계 + JSONL 카드 로딩 (변경 없음)
  subjects.ts        # 과목 정의 (변경 없음)
  image.ts           # 이미지 검증 + data URL 변환 (시그니처 검증 추가)
  ai/
    types.ts             # ProviderId, AIProviderAdapter, 오류 코드
    defaults.ts          # SUPPORTED_PROVIDERS, PROVIDER_LABELS, DEFAULT_PROVIDER_MODELS
    errors.ts            # 오류 정규화 + 학생/교사용 문구 분리
    registry.ts          # getProviderAdapter(providerId)
    credential-resolver.ts  # single 모드 자격증명 해석
    providers/
      shared.ts             # SSE→text 변환, fetch 헬퍼, OCR 프롬프트
      openai-compatible.ts  # OpenAI Chat Completions 공통 구현
      openrouter.ts / openai.ts / anthropic.ts / google.ts
```

두 모드 모두 동일한 RAG·프롬프트·OCR·위계 로직을 통과하고, 다른 점은 "어떤 자격증명으로 어느 제공업체 어댑터를 호출하는가" 뿐이다.

- single 모드 라우트(`/api/read-problem`, `/api/tutor`, `/api/solve`)는 `resolveSingleModeProvider()` 로 env 기반 자격증명을 얻는다.
- platform 학생 라우트(`/api/student/[slug]/*`)는 `resolveClassroomProvider(row)` 로 반→자격증명을 복호화해 얻는다.

## 제공업체 어댑터

`AIProviderAdapter` 인터페이스:

```ts
testCredential(params): Promise<CredentialTestResult>
recognizeProblemFromImage(params): Promise<string>
streamTutorReply(params): Promise<ReadableStream<Uint8Array>>
generateSolution(params): Promise<string>
```

- OpenRouter/OpenAI 는 Chat Completions 형식을 공유하므로 `createOpenAiCompatibleAdapter` 로 baseUrl/headers만 주입해 재사용.
- Anthropic 은 Messages API (system 분리, 이미지 base64 source, `content_block_delta` 스트림).
- Google 은 generateContent / streamGenerateContent(alt=sse), 이미지 inlineData.
- 제공업체 오류는 HTTP 상태 → `AIProviderErrorCode` 로 정규화한다.

## 데이터 모델 (platform)

| 테이블 | 용도 |
| --- | --- |
| `profiles` | Supabase 사용자 ↔ 교사/관리자 프로필 |
| `provider_credentials` | 교사별 암호화된 API 키 (원문 미저장) |
| `classrooms` | 반 설정, 무작위 `public_slug`, 한도, 접속코드 해시, 만료 |
| `student_sessions` | 익명 학생 세션 (쿠키 토큰 해시, 접속코드 검증 여부) |
| `usage_daily` | 반별·날짜별 집계 (OCR/튜터/성공/실패/제공업체) |
| `session_usage_daily` | 익명 세션별·날짜별 요청 수 (세션 한도 강제) |

## 한도 처리 (원자적)

`consume_quota()` PostgreSQL 함수가 반 전체/세션 카운트 행을 upsert + 잠금으로 확인·증가한다. 동시 요청이 들어와도 한 트랜잭션 안에서 직렬화되어 한도가 우회되지 않는다. 요청 성공/실패는 `record_usage_result()` 로 별도 집계한다. 날짜는 `Asia/Seoul` 기준으로 서버에서 계산한다.

## 요청 흐름 (학생)

1. `/c/[slug]` 클라이언트가 `/api/student/[slug]/session` 호출 → 반 조회·가용성·접속코드·세션 발급.
2. 문제 사진 → `/api/student/[slug]/recognize` → 가드 → 한도 소비 → 반 자격증명 복호화 → OCR.
3. 대화 → `/api/student/[slug]/tutor` → 가드 → 한도 소비 → RAG+프롬프트 → 스트리밍.

클라이언트가 보낸 `teacherId/providerId/credentialId/modelId` 는 신뢰하지 않는다. 서버가 slug 기준으로 DB에서 실제 설정을 조회한다.

## 인증

- 교사: Supabase Magic Link. `middleware.ts` 가 `/teacher/*`, `/admin/*` 접근을 통제하고 로그인 후 원래 페이지로 되돌린다.
- 관리자: `PLATFORM_OWNER_EMAILS` 에 포함된 이메일만 `/admin` 접근.
- 학생: 익명 세션 쿠키(Secure·HttpOnly·SameSite=Lax), 계정 없음.

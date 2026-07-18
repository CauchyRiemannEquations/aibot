# PULLI (aibot)

정답을 절대 말하지 않는 소크라테스식 AI 수학 튜터입니다.

학생이 문제 사진을 올리면(또는 직접 입력하면) 서버에서 AI 모델로 문제를 읽고, 과목별 개념카드를 검색해 참고한 뒤, 정답 대신 좋은 질문을 하나씩 던져서 학생이 스스로 답에 도달하게 돕습니다.

두 가지 운영 모드를 지원합니다.

- **single 모드 (기본)**: 서버 환경변수 `OPENROUTER_API_KEY` 하나로 동작하는 기존 단일 사용자 사이트.
- **platform 모드**: 여러 교사가 각자 이메일로 로그인하고, 자신의 AI 키를 연결하고, 반을 만들어 학생용 링크·QR을 발급하는 다중 교사 공유 플랫폼. 학생은 계정·API 키 없이 링크만으로 사용합니다.

기본값은 `single`이라 기존 배포가 그대로 유지됩니다.

## 주요 기능 (교육 로직은 두 모드가 공유)

- 문제 사진 업로드 + OCR (또는 문제 직접 입력)
- 소크라테스식 대화형 튜터 (스트리밍 응답)
  - 최종 답을 절대 먼저 말하지 않음
  - 힌트 사다리: 진단 → 개념 연결 → 분해 → 유사 예시
  - 학생이 답을 제시하면 스스로 검증하도록 유도
- 교육과정 위계 강제 (공통수학Ⅰ → 공통수학Ⅱ → 대수 → 미적분Ⅰ → 미적분Ⅱ, 확률과 통계·기하는 독립 선택)
- 과목별 JSONL 개념카드 RAG (내부 참고용, 학생 비노출)
- Markdown + KaTeX 수식 렌더링
- 4개 AI 제공업체 지원: Google Gemini · OpenAI · Anthropic Claude · OpenRouter

## 기술 스택

- Next.js App Router · React · TypeScript (strict)
- Supabase (Auth · PostgreSQL · RLS) — platform 모드
- 제공업체 REST API를 공통 어댑터 뒤에서 호출 (무거운 SDK 미사용)
- Zod 서버 입력 검증 · JSONL 키워드 RAG

---

## 1. single 모드 실행 (기존 방식)

```bash
npm install
cp .env.example .env.local   # OPENROUTER_* 값 채우기, APP_MODE=single 유지
npm run dev
```

`.env.local` 최소 설정:

```env
APP_MODE=single
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_TUTOR_MODEL=google/gemini-2.5-flash
OPENROUTER_VISION_MODEL=google/gemini-2.5-flash
OPENROUTER_SOLVER_MODEL=google/gemini-2.5-flash
MAX_IMAGE_SIZE_MB=8
```

`/` 에서 기존 PULLI 튜터가 그대로 열립니다.

## 2. platform 모드 실행

`.env.local` 에 `APP_MODE=platform` 과 Supabase/암호화 값을 설정한 뒤:

```bash
npm run dev
```

- `/` : 플랫폼 소개 + 교사 로그인 진입
- `/teacher/login` : 교사 이메일 로그인
- `/teacher/dashboard` `/teacher/providers` `/teacher/classes/...` : 교사 도구
- `/c/[slug]` : 학생 접속 (계정 불필요)
- `/admin` : 플랫폼 운영자 전용 최소 대시보드

## 3. Supabase 프로젝트 생성

1. <https://supabase.com> 에서 새 프로젝트 생성.
2. Project Settings → API 에서 `Project URL`, `anon public key`, `service_role key` 확인.
3. Authentication → Providers → Email 을 켜고, **Magic Link** 를 활성화.
4. Authentication → URL Configuration 에서 `Site URL` 을 앱 URL로, `Redirect URLs` 에 `https(또는 http)://<앱>/auth/callback` 을 추가.

## 4. 환경변수 설정

`.env.example` 를 참고하세요. platform 모드 필수 값:

| 변수 | 용도 | 클라이언트 노출 |
| --- | --- | --- |
| `APP_MODE` | `platform` 로 설정 | - |
| `NEXT_PUBLIC_APP_URL` | 학생 링크·QR·매직링크 리다이렉트 | 가능 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | 가능 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 admin 클라이언트 | **금지** |
| `CREDENTIAL_ENCRYPTION_KEY` | 교사 API 키 암호화 마스터 키 | **금지** |
| `PLATFORM_OWNER_EMAILS` | 관리자 이메일(쉼표 구분) | **금지** |

## 5. SQL migration 적용

`supabase/migrations/0001_platform_init.sql` 하나로 전체 스키마·RLS·사용량 함수가 만들어집니다.

- Supabase 대시보드 → SQL Editor 에 파일 내용을 붙여넣고 실행, 또는
- Supabase CLI: `supabase db push` (프로젝트 링크 후)

## 6. 이메일 Magic Link 설정

Supabase Authentication → Email 템플릿은 기본값으로 충분합니다. `Redirect URLs` 에 `/auth/callback` 이 포함돼 있어야 로그인이 완료됩니다. 개발 중에는 Supabase 기본 메일 발송이 동작하며, 운영에서는 SMTP 커스텀을 권장합니다.

## 7. Vercel 배포 설정

1. GitHub 저장소를 Vercel에 연결.
2. Project → Settings → Environment Variables 에 위 표의 값을 모두 등록 (`APP_MODE=platform` 포함).
3. `NEXT_PUBLIC_APP_URL` 을 실제 배포 도메인으로 설정.
4. 배포 후 Supabase Redirect URLs 에 배포 도메인의 `/auth/callback` 추가.

자세한 절차는 [`docs/deployment-checklist.md`](docs/deployment-checklist.md) 참고.

## 8. 암호화 키 생성

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

출력값을 `CREDENTIAL_ENCRYPTION_KEY` 에 넣습니다. `encryption_key_version` 필드가 있어 이후 키 교체가 가능합니다.

## 9. 플랫폼 운영자 이메일

`PLATFORM_OWNER_EMAILS=owner@example.com,admin@example.com` 처럼 설정하면 해당 이메일로 로그인한 교사가 `/admin` 에 접근할 수 있습니다.

## 10. 교사 사용 방법

1. `/teacher/login` 에서 이메일로 로그인 (메일의 링크 클릭).
2. `AI 연결` 에서 제공업체를 고르고 API 키를 입력 → **연결 테스트** 통과 후 저장.
3. `반 만들기` 에서 이름·과목·AI 연결·한도·(선택)접속 코드·만료일 설정.
4. 반 상세에서 학생용 링크 복사 / QR 다운로드.

## 11. 학생 링크 공유

반 상세의 학생 링크(`/c/<slug>`) 또는 QR을 학생에게 공유합니다. 학생은 계정 없이 접속하며, 접속 코드가 설정된 반은 코드 입력 후 사용합니다. AI 제공업체를 나중에 바꿔도 학생 링크는 그대로 유지됩니다.

## 12. 지원 AI 제공업체

Google Gemini · OpenAI · Anthropic Claude · OpenRouter. 기본 모델은 `src/lib/ai/defaults.ts` 에서 중앙 관리하며, 교사가 고급 설정에서 모델 ID를 직접 지정할 수 있습니다. 학생 화면에는 제공업체·모델명이 노출되지 않습니다.

## 13. API 키 보안 구조

- 교사 API 키는 저장 전 **AES-256-GCM** 으로 암호화 (`src/lib/crypto/credential-crypto.ts`, `server-only`).
- 원문 키는 DB·API 응답·로그에 남기지 않으며, 화면에는 마지막 4자리만 표시.
- 복호화는 서버에서 AI 요청 직전에만 수행. 학생 브라우저로 키가 전송되지 않음.
- 자세한 내용은 [`docs/security-and-privacy.md`](docs/security-and-privacy.md).

## 14. 문제 사진과 대화 저장 정책

- 학생 이미지는 형식 검증(매직 바이트) 후 OCR 요청에만 메모리에서 사용하고 별도 저장하지 않음.
- 대화 내용은 DB에 저장하지 않으며, 사용량 집계와 성공/실패 상태만 기록.

## 15. 사용량 제한의 한계

- 익명 세션별 한도는 쿠키 기반이라 브라우저 교체·쿠키 삭제로 우회될 수 있음.
- 이를 보완하기 위해 **반 전체 일일 하드 한도** 를 함께 적용하며, 한도 확인·증가는 PostgreSQL 함수로 원자적으로 처리.

## 16. 로컬 개발 및 테스트 명령어

```bash
npm run dev        # 개발 서버
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # 단위/보안/제공업체 테스트 (node:test + tsx)
npm run test:rag   # RAG 회귀 테스트
npm run build      # 프로덕션 빌드
```

## 추가 문서

- [`docs/platform-architecture.md`](docs/platform-architecture.md)
- [`docs/security-and-privacy.md`](docs/security-and-privacy.md)
- [`docs/deployment-checklist.md`](docs/deployment-checklist.md)

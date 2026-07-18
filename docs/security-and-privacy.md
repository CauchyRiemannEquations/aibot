# 보안 및 개인정보

## 교사 API 키

### 저장 방식

- 키는 저장 전 **AES-256-GCM** 으로 암호화한다 (`src/lib/crypto/credential-crypto.ts`).
- 저장 컬럼: `encrypted_api_key`, `encryption_iv`, `encryption_auth_tag`, `encryption_key_version`, `api_key_last4`.
- **원문 키는 어디에도 저장하지 않는다.** 마지막 4자리(`api_key_last4`)만 화면 표시용으로 보관한다.
- 마스터 키는 `CREDENTIAL_ENCRYPTION_KEY` 환경변수에서만 읽는다. `encryption_key_version` 필드로 향후 키 교체가 가능하다.

### 다루는 규칙

- 암호화/복호화 모듈은 `server-only` 로 클라이언트 번들 유입을 차단한다.
- `SUPABASE_SERVICE_ROLE_KEY`, `CREDENTIAL_ENCRYPTION_KEY` 는 `NEXT_PUBLIC_` 접두사가 없어 클라이언트로 나가지 않는다.
- 복호화는 서버에서 AI 요청 직전에만 수행하고, 결과 키는 응답·로그·에러 객체에 포함하지 않는다.
- 오류는 서버 로그용 정보와 사용자 노출 문구를 분리한다. 클라이언트에는 정규화된 문구만 반환한다.

### 학생에게 노출되지 않는 근거

- 학생 API(`/api/student/*`)는 slug 기준으로 서버가 자격증명을 조회·복호화하며, 응답 본문에는 문제 인식 결과/대화 텍스트만 담는다.
- 학생용 공개 뷰(`toPublicView`)는 `slug, name, subjectId, guidanceNote, requiresAccessCode, dailyLimitPerSession` 만 포함한다. 제공업체·모델·교사·자격증명 ID를 담지 않는다 (단위 테스트로 검증).
- 학생 오류 문구는 제공업체 이름(Gemini/OpenAI/Claude/Anthropic/OpenRouter)과 "API/토큰/크레딧/결제" 같은 단어를 포함하지 않도록 화이트리스트 문구만 사용한다 (`toStudentMessage`, 테스트로 검증).

### 정직한 표현

화면 안내는 "암호화하여 저장 / 학생에게 노출되지 않음 / AI 요청 시에만 서버에서 사용 / 언제든 삭제 가능" 으로 표기한다. "운영자도 절대 볼 수 없다" 처럼 과장된 문구는 사용하지 않는다. 서비스 역할 키와 암호화 키를 함께 가진 운영자는 기술적으로 복호화가 가능하다는 점을 문서에 명시한다.

## Row Level Security

- `profiles`, `provider_credentials`, `classrooms`, `usage_daily` 에 RLS를 켜고 `auth.uid()` 기준 소유 정책을 둔다.
- 교사는 자신의 프로필·자격증명·반·사용량만 조회/수정할 수 있다. 다른 교사의 키·반은 조회 불가.
- 학생용 공개 페이지는 DB를 직접 자유롭게 읽지 못한다 (`classrooms` 에 공개 select 정책 없음, `student_sessions`/`session_usage_daily` 는 정책 없음 → service role만 접근).
- service role을 사용하는 서버 API도 classroom 소유권(`teacher_id`)을 매 쿼리에서 별도로 대조한다.

## 이미지 / 대화 처리

- 지원 MIME 화이트리스트(JPEG/PNG/WebP/GIF) + **매직 바이트 시그니처** 검증. 선언 MIME만 신뢰하지 않는다.
- 파일 크기 제한(`MAX_IMAGE_SIZE_MB`).
- 이미지는 OCR 요청에 필요한 동안만 메모리에서 처리하고 DB/스토리지에 저장하지 않는다. base64 전체를 로그로 남기지 않는다.
- 대화 본문/문제 본문은 DB에 저장하지 않는다. 사용량 집계와 성공/실패 상태만 저장한다.
- 학생 화면에 개인정보(이름·학교)가 포함된 사진을 올리지 말라는 안내를 표시한다.

## 사용량 한도의 한계

- 익명 세션 한도는 쿠키 기반이므로 브라우저 교체·쿠키 삭제로 우회될 수 있다. 과장하지 않는다.
- 보완책으로 **반 전체 일일 하드 한도** 를 함께 적용하며, 한도 확인·증가는 `consume_quota()` 로 원자적으로 처리해 동시 요청 우회를 막는다.

## 남아 있는 위험과 한계

- 접속 코드는 저엔트로피 편의 게이트다. slug 솔트 SHA-256 + 상수 시간 비교를 쓰지만, 무차별 대입에 완전히 강하지 않다. 강한 보호가 필요하면 별도 인증을 권장한다.
- 매직 링크 이메일 전달은 Supabase/SMTP 설정에 의존한다.
- 실제 제공업체 API 키로의 연결 검증은 배포자가 각 제공업체 콘솔에서 유효한 키로 수행해야 한다.
- 운영자 신뢰 모델: service role 키 + 암호화 키를 가진 운영자는 복호화가 가능하다(위 "정직한 표현" 참고).

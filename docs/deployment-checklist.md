# 배포 체크리스트 (플랫폼 운영자용)

개발 지식이 없어도 순서대로 따라 하면 됩니다. 각 항목을 하나씩 체크하세요.

## A. Supabase 준비

- [ ] <https://supabase.com> 가입 후 새 프로젝트 생성
- [ ] 프로젝트가 완전히 켜질 때까지 대기 (수 분)
- [ ] 왼쪽 메뉴 **Project Settings → API** 에서 아래 3개 값을 복사해 안전한 곳에 보관
  - [ ] `Project URL`
  - [ ] `anon public` 키
  - [ ] `service_role` 키 (비밀! 절대 공개 금지)
- [ ] **SQL Editor → New query** 에 저장소의 `supabase/migrations/0001_platform_init.sql` 전체 내용을 붙여넣고 **Run**
- [ ] 실행이 성공(오류 없음)했는지 확인
- [ ] **Authentication → Providers → Email** 활성화, **Magic Link** 켜기
- [ ] **Authentication → URL Configuration**
  - [ ] `Site URL` 을 배포할 주소로 설정 (예: `https://socra.example.com`)
  - [ ] `Redirect URLs` 에 `https://socra.example.com/auth/callback` 추가

## B. 암호화 키 생성

- [ ] 아래 명령을 한 번 실행해 나온 값을 복사 (터미널에서)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- [ ] 이 값을 `CREDENTIAL_ENCRYPTION_KEY` 로 사용 (한 번 정하면 바꾸지 말 것 — 바꾸면 기존 저장 키를 복호화할 수 없음)

## C. Vercel 배포

- [ ] <https://vercel.com> 에서 GitHub 저장소 import
- [ ] **Settings → Environment Variables** 에 아래 값 모두 등록 (Production/Preview)
  - [ ] `APP_MODE` = `platform`
  - [ ] `NEXT_PUBLIC_APP_URL` = 배포 도메인 (예: `https://socra.example.com`)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` = A에서 복사한 Project URL
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = A의 anon 키
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` = A의 service_role 키
  - [ ] `CREDENTIAL_ENCRYPTION_KEY` = B에서 생성한 값
  - [ ] `PLATFORM_OWNER_EMAILS` = 관리자 이메일 (쉼표로 여러 개 가능)
  - [ ] `MAX_IMAGE_SIZE_MB` = `8` (선택)
- [ ] **Deploy** 실행
- [ ] 배포 완료 후 실제 도메인 확인

## D. 배포 후 연결 마무리

- [ ] Supabase **Redirect URLs** 에 최종 배포 도메인의 `/auth/callback` 이 들어있는지 재확인
- [ ] 배포 도메인 `/` 접속 → 플랫폼 소개 화면이 보이는지 확인
- [ ] `/teacher/login` 에서 본인 이메일로 로그인 → 메일 링크 클릭 → 대시보드 진입 확인

## E. 동작 확인 (샘플 교사 흐름)

- [ ] `AI 연결` 에서 제공업체 선택 → 실제 API 키 입력 → **연결 테스트** 성공 확인 → 저장
- [ ] `반 만들기` 로 테스트 반 생성
- [ ] 반 상세에서 학생 링크 복사 / QR 다운로드
- [ ] 시크릿 창에서 학생 링크 열기 → 제공업체·API 같은 단어가 안 보이는지 확인
- [ ] 문제 사진 업로드 → 인식 → SOCRA 대화가 스트리밍되는지 확인
- [ ] 한도를 낮게 설정해 초과 시 일반 안내가 뜨는지 확인
- [ ] 반 비활성화 → 학생 링크가 막히는지 확인

## F. 운영 팁

- [ ] `PLATFORM_OWNER_EMAILS` 계정으로 `/admin` 접근 확인
- [ ] 운영에서는 Supabase Authentication → SMTP 를 자체 발송 도메인으로 설정 권장
- [ ] `service_role` 키와 `CREDENTIAL_ENCRYPTION_KEY` 는 Vercel 환경변수에만 두고 저장소/문서에 남기지 말 것

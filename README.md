# 소크라 (aibot)

정답을 절대 말하지 않는 소크라테스식 AI 수학 튜터입니다.

학생이 문제 사진을 올리면(또는 직접 입력하면) 서버에서 OpenRouter 모델로 문제를 읽고, 과목별 개념카드를 검색해 참고한 뒤, 정답 대신 좋은 질문을 하나씩 던져서 학생이 스스로 답에 도달하게 돕습니다.

## 주요 기능

- 문제 사진 업로드 + OCR (또는 문제 직접 입력)
- 소크라테스식 대화형 튜터 (스트리밍 응답)
  - 최종 답을 절대 먼저 말하지 않음 ("답만 알려줘" 요구에도 유지)
  - 힌트 사다리: 진단 → 개념 연결 → 분해 → 유사 예시
  - 학생이 답을 제시하면 스스로 검증하도록 유도
- 교육과정 위계 강제
  - 공통수학Ⅰ → 공통수학Ⅱ → 대수 → 미적분Ⅰ → 미적분Ⅱ
  - 확률과 통계, 기하는 독립 선택 과목 (벡터는 기하에서만 사용)
  - 선택 과목 범위 밖 개념은 힌트에서도 금지
- 과목별 JSONL 개념카드 RAG (튜터의 내부 참고용, 학생에게 비노출)
- Markdown + LaTeX 수식 렌더링
- OpenRouter API 키 서버 환경변수 처리 (브라우저에 노출되지 않음)

## 기술 스택

- Next.js App Router
- React
- TypeScript
- OpenRouter
- JSONL 기반 키워드 RAG

## 시작 방법

```bash
npm install
npm run dev
```

## 환경변수

`.env.local` 파일에 아래 값을 설정합니다.

```env
OPENROUTER_API_KEY=...
OPENROUTER_VISION_MODEL=google/gemini-flash-latest
OPENROUTER_SOLVER_MODEL=google/gemini-flash-latest
OPENROUTER_CHECKER_MODEL=google/gemini-flash-latest
MAX_IMAGE_SIZE_MB=8
DAILY_REQUEST_LIMIT_PER_USER=30
```

## 테스트

```bash
npm run test:rag
npm run build
```

## 참고

- `.env.local`은 `.gitignore`에 포함되어 있어 저장소에 올라가지 않습니다.
- RAG 검색 함수는 `retrieveRelevantCards(problemText, cards, topK)`로 분리되어 있어 이후 벡터 검색으로 교체하기 쉽도록 구성했습니다.

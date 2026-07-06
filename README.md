# aibot

미적분Ⅰ 사진 문제풀이봇 MVP입니다.

학생이 문제를 직접 타이핑하지 않고 사진을 업로드하면, 서버에서 OpenRouter의 이미지 입력 가능 모델로 문제를 읽고, `mijeokbun1_ai_rag_cards_v0_1.jsonl` 개념카드를 검색해 단계별 풀이를 제공합니다.

## 주요 기능

- 문제 사진 업로드
- 사진 미리보기
- AI가 인식한 문제 표시
- 관련 개념카드 1~3개 검색
- 7개 섹션 고정 풀이 형식 출력
- Markdown + LaTeX 수식 렌더링
- OpenRouter API 키 서버 환경변수 처리

## 풀이 섹션

- `[문제 읽기]`
- `[사용 개념]`
- `[풀이 전략]`
- `[단계별 풀이]`
- `[정답]`
- `[검산]`
- `[비슷한 문제 팁]`

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

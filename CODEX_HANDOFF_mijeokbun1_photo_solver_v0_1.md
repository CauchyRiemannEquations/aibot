# Codex 전달용 구현 지시서 v0.1

## 프로젝트명
미적분Ⅰ 사진 문제풀이봇 MVP

## 목표
학생이 수학 문제 사진을 업로드하면, 앱이 문제를 읽고, 미적분Ⅰ AI용 개념카드(RAG)를 참고하여 단계별 풀이를 제공하는 웹앱을 만든다.

학생용 개념노트는 교사가 별도 파일로 업로드할 예정이므로, 이번 MVP에서는 AI 풀이용 RAG 카드와 문제풀이 흐름을 우선 구현한다.

## 필수 기능

### 1. 학생 화면
- 문제 사진 업로드
- 사진 미리보기
- AI가 인식한 문제 표시
- “풀이 시작” 버튼
- 단계별 풀이 출력
- “다시 설명해줘” 버튼
- “힌트만 줘” 버튼은 선택 기능으로 구현 가능

### 2. 서버/API
- OpenRouter API 키는 서버 환경변수에만 저장한다.
- 프론트엔드에 API 키를 노출하지 않는다.
- 이미지 입력이 가능한 OpenRouter 모델을 호출할 수 있게 한다.
- 모델명은 환경변수로 바꿀 수 있게 한다.
- 요청 흐름은 다음과 같다.
  1. 이미지 업로드 수신
  2. 이미지 또는 base64를 vision 모델에 전달
  3. 문제 텍스트/OCR 결과 생성
  4. OCR 결과를 바탕으로 RAG 카드 검색
  5. 관련 카드와 시스템 프롬프트를 함께 넣어 풀이 생성
  6. 가능하면 별도 검산 프롬프트로 풀이 검토
  7. 최종 답변 반환

### 3. RAG 카드 검색
- `mijeokbun1_ai_rag_cards_v0_1.jsonl` 파일을 로드한다.
- MVP에서는 복잡한 벡터DB 없이 키워드/문자열 검색으로 시작해도 된다.
- 검색 기준:
  - OCR 문제 텍스트와 카드 `keywords` 비교
  - 카드 `title`, `unit`, `retrieval_text` 검색
  - 관련도 상위 1~3개 카드 선택
- 추후 embedding/vector search로 교체 가능하도록 `retrieveRelevantCards(problemText)` 함수를 분리한다.

### 4. 답변 형식
모든 풀이 답변은 다음 섹션을 포함한다.

- [문제 읽기]
- [사용 개념]
- [풀이 전략]
- [단계별 풀이]
- [정답]
- [검산]
- [비슷한 문제 팁]

### 5. OCR 확인 UX
수학 사진 인식 오류를 줄이기 위해 풀이 전에 인식 결과를 보여준다.

권장 흐름:
1. 학생이 사진 업로드
2. AI가 문제를 읽음
3. 화면에 “제가 읽은 문제가 맞나요?” 표시
4. 학생이 “풀이 시작” 클릭
5. 풀이 생성

단, 빠른 MVP에서는 이미지 업로드 후 OCR+풀이를 한 번에 처리하되, 답변 맨 위에 [문제 읽기]를 반드시 표시한다.

## 권장 파일 구조

```text
src/
  app/
    page.tsx
    api/
      solve/route.ts
      read-problem/route.ts
  lib/
    openrouter.ts
    rag.ts
    prompts.ts
    types.ts
  data/
    mijeokbun1_ai_rag_cards_v0_1.jsonl
```

프레임워크는 기존 프로젝트 상황에 맞춰 Next.js, React+Express, Vite+Node 중 편한 방식으로 구현한다.

## 환경변수 예시

```env
OPENROUTER_API_KEY=...
OPENROUTER_VISION_MODEL=...
OPENROUTER_SOLVER_MODEL=...
OPENROUTER_CHECKER_MODEL=...
```

## 핵심 타입 예시

```ts
export type ConceptCard = {
  id: string;
  course: string;
  unit: string;
  category: string;
  title: string;
  visibility: 'ai_reference';
  retrieval_text: string;
  core_principle: string;
  solver_steps: string[];
  common_mistakes: string[];
  ai_solver_instruction: string;
  representative_example: string;
  keywords: string[];
};
```

## RAG 검색 함수 요구

```ts
export function retrieveRelevantCards(problemText: string, cards: ConceptCard[], topK = 3): ConceptCard[] {
  // MVP: keywords/title/unit/retrieval_text 기반 점수화
  // 추후 embedding으로 교체 가능하게 함수 시그니처 유지
}
```

## OpenRouter 호출 주의

- API 키는 반드시 서버에서만 사용한다.
- 학생이 업로드한 이미지는 필요 이상으로 저장하지 않는다.
- 로그를 남길 경우 학생 이름, 반, 번호 등 개인정보는 저장하지 않는다.
- 에러 발생 시 학생에게는 “사진을 다시 찍어 주세요” 수준의 쉬운 메시지를 보여준다.

## 완료 기준

- 사진을 업로드할 수 있다.
- AI가 문제를 읽은 내용을 화면에 보여준다.
- 풀이 답변이 정해진 7개 섹션으로 나온다.
- RAG 카드 ID가 [사용 개념]에 표시된다.
- API 키가 프론트엔드에 노출되지 않는다.

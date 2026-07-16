import { Agent } from 'undici';

import { AIProviderError, classifyHttpStatus } from '@/lib/ai/errors';

/*
 * 제공업체 어댑터 공용 저수준 헬퍼.
 * - 개발용 사내 프록시 환경에서 TLS 우회가 필요할 때만 dispatcher를 붙인다.
 * - SSE 스트림을 delta 텍스트만 뽑아 plain text 스트림으로 변환한다.
 */

const insecureTlsAgent = new Agent({ connect: { rejectUnauthorized: false } });

function allowInsecureTls(): boolean {
  return (
    process.env.OPENROUTER_ALLOW_INSECURE_TLS === 'true' ||
    process.env.OPENROUTER_ALLOW_INSECURE_TLS === '1'
  );
}

type FetchInit = RequestInit & { dispatcher?: Agent };

export async function providerFetch(url: string, init: RequestInit): Promise<Response> {
  const requestInit: FetchInit = { ...init };
  if (allowInsecureTls()) {
    requestInit.dispatcher = insecureTlsAgent;
  }
  try {
    return await fetch(url, requestInit);
  } catch (cause) {
    throw new AIProviderError('UPSTREAM_UNAVAILABLE', 'network request failed');
  }
}

/** 오류 응답을 공통 오류로 변환. 응답 본문은 앞부분만 사용하고 로그에 남기지 않는다. */
export async function raiseForStatus(response: Response, label: string): Promise<void> {
  if (response.ok) return;
  const bodySnippet = (await response.text().catch(() => '')).slice(0, 500);
  const code = classifyHttpStatus(response.status, bodySnippet);
  throw new AIProviderError(code, `${label} failed: ${response.status}`, response.status);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * OpenAI 호환(OpenRouter/OpenAI) SSE → plain text 스트림.
 * `data: {json}` 라인에서 choices[0].delta.content 만 추출한다.
 */
export function openAiSseToTextStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let buffer = '';
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const piece = json.choices?.[0]?.delta?.content;
              if (piece) controller.enqueue(encoder.encode(piece));
            } catch {
              /* 파싱 불가한 조각 무시 */
            }
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      upstream.cancel().catch(() => {});
    },
  });
}

/** Anthropic Messages SSE → plain text 스트림 (content_block_delta.text_delta). */
export function anthropicSseToTextStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let buffer = '';
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            try {
              const json = JSON.parse(payload) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                const piece = json.delta.text;
                if (piece) controller.enqueue(encoder.encode(piece));
              }
            } catch {
              /* 무시 */
            }
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      upstream.cancel().catch(() => {});
    },
  });
}

/** Google streamGenerateContent(alt=sse) SSE → plain text 스트림. */
export function googleSseToTextStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let buffer = '';
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            try {
              const json = JSON.parse(payload) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              };
              const parts = json.candidates?.[0]?.content?.parts ?? [];
              for (const part of parts) {
                if (part.text) controller.enqueue(encoder.encode(part.text));
              }
            } catch {
              /* 무시 */
            }
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      upstream.cancel().catch(() => {});
    },
  });
}

export function stripMarkdownFence(text: string): string {
  return text
    .replace(/^```(?:text|markdown|latex)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/** data URL에서 base64 본문만 분리. */
export function splitDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!match) {
    throw new AIProviderError('UNSUPPORTED_IMAGE', 'invalid data url');
  }
  return { mimeType: match[1], base64: match[2] };
}

export const OCR_SYSTEM_PROMPT = [
  '너는 한국 고등학교 수학 문제 사진을 정확히 읽는 OCR 보조 AI다.',
  '풀이하지 말고, 사진 속 문제 문장과 수식만 정리한다.',
  '답변은 반드시 Markdown 형식으로 작성한다.',
  '인라인 수식은 반드시 $...$로 감싼다.',
  '중요하거나 긴 수식은 반드시 $$...$$로 감싼다.',
  'raw LaTeX 명령어를 수식 구분자 없이 출력하지 않는다.',
  '보이지 않거나 애매한 부분은 추측하지 말고 [판독 불가]라고 표시한다.',
  '해설, 풀이, 정답은 절대 쓰지 않는다.',
  '코드블록은 사용하지 않는다.',
].join('\n');

export const OCR_USER_PROMPT = [
  '사진 속 고등학교 수학 문제를 정확히 읽어 주세요.',
  '조건, 보기, 그래프 설명, 구하라는 값을 빠뜨리지 마세요.',
  '수식은 반드시 Markdown LaTeX로 작성하세요.',
  '예: $\\lim_{x \\to 2} \\frac{x^2-4}{x-2}$',
  '예: $$\\int_0^1 f(x)\\,dx$$',
  '풀이와 정답은 쓰지 마세요.',
].join('\n');

import { Agent } from 'undici';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_VISION_MODEL = 'google/gemini-2.5-flash';
const DEFAULT_SOLVER_MODEL = 'google/gemini-2.5-flash';
const DEFAULT_TUTOR_MODEL = 'google/gemini-2.5-flash';

const insecureTlsAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

type OpenRouterMessageContent =
  | string
  | Array<
      | string
      | {
          type?: string;
          text?: unknown;
          content?: unknown;
        }
    >
  | {
      text?: unknown;
      content?: unknown;
    }
  | null
  | undefined;

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: OpenRouterMessageContent;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
  };
};

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing. OpenRouter API 키를 서버 환경변수에 설정해 주세요.');
  }

  return apiKey;
}

function getModel(envName: string, fallbackModel: string): string {
  return process.env[envName]?.trim() || fallbackModel;
}

function getOpenRouterHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
    'X-Title': process.env.OPENROUTER_APP_TITLE || 'mijeokbun1-photo-solver-mvp',
  };
}

async function openRouterRequest(body: Record<string, unknown>, label = 'chat') {
  const allowInsecureTls =
    process.env.OPENROUTER_ALLOW_INSECURE_TLS === 'true' ||
    process.env.OPENROUTER_ALLOW_INSECURE_TLS === '1';

  const requestInit: RequestInit & { dispatcher?: Agent } = {
    method: 'POST',
    headers: getOpenRouterHeaders(),
    body: JSON.stringify(body),
  };

  if (allowInsecureTls) {
    requestInit.dispatcher = insecureTlsAgent;
  }

  const response = await fetch(OPENROUTER_URL, requestInit);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`OpenRouter ${label} request failed: ${response.status} ${responseText}`);
  }

  try {
    const parsed = JSON.parse(responseText) as OpenRouterResponse;

    if (parsed.error?.message) {
      throw new Error(`OpenRouter ${label} error: ${parsed.error.message}`);
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`OpenRouter ${label} returned non-JSON response: ${responseText.slice(0, 300)}`);
    }

    throw error;
  }
}

function extractMessageText(content: OpenRouterMessageContent): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (!item || typeof item !== 'object') {
          return '';
        }

        if (typeof item.text === 'string') {
          return item.text;
        }

        if (typeof item.content === 'string') {
          return item.content;
        }

        return '';
      })
      .join('\n')
      .trim();
  }

  if (content && typeof content === 'object') {
    if (typeof content.text === 'string') {
      return content.text.trim();
    }

    if (typeof content.content === 'string') {
      return content.content.trim();
    }
  }

  return '';
}

function stripMarkdownFence(text: string): string {
  return text
    .replace(/^```(?:text|markdown|latex)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export async function recognizeProblemFromImage(
  base64DataUrl: string,
  mimeType: string,
): Promise<string> {
  const model = getModel('OPENROUTER_VISION_MODEL', DEFAULT_VISION_MODEL);

  const result = await openRouterRequest(
    {
      model,
      temperature: 0,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: [
            '너는 한국 고등학교 수학 문제 사진을 정확히 읽는 OCR 보조 AI다.',
            '풀이하지 말고, 사진 속 문제 문장과 수식만 정리한다.',
            '답변은 반드시 Markdown 형식으로 작성한다.',
            '인라인 수식은 반드시 $...$로 감싼다.',
            '중요하거나 긴 수식은 반드시 $$...$$로 감싼다.',
            'raw LaTeX 명령어를 수식 구분자 없이 출력하지 않는다.',
            '보이지 않거나 애매한 부분은 추측하지 말고 [판독 불가]라고 표시한다.',
            '해설, 풀이, 정답은 절대 쓰지 않는다.',
            '코드블록은 사용하지 않는다.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                '사진 속 고등학교 수학 문제를 정확히 읽어 주세요.',
                '조건, 보기, 그래프 설명, 구하라는 값을 빠뜨리지 마세요.',
                '수식은 반드시 Markdown LaTeX로 작성하세요.',
                '예: $\\lim_{x \\to 2} \\frac{x^2-4}{x-2}$',
                '예: $$\\int_0^1 f(x)\\,dx$$',
                '풀이와 정답은 쓰지 마세요.',
                `이미지 형식: ${mimeType}`,
              ].join('\n'),
            },
            {
              type: 'image_url',
              image_url: {
                url: base64DataUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
    },
    'vision OCR',
  );

  const recognizedText = stripMarkdownFence(
    extractMessageText(result.choices?.[0]?.message?.content),
  );

  if (!recognizedText) {
    throw new Error(
      `OpenRouter vision OCR returned an empty response. 사용 모델(${model})이 이미지 입력을 지원하는지 확인해 주세요.`,
    );
  }

  return recognizedText;
}

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/*
 * 소크라 튜터용 스트리밍 호출.
 * OpenRouter SSE 응답에서 delta 텍스트만 뽑아 plain text 스트림으로 변환한다.
 * API 키는 이 서버 모듈 밖으로 나가지 않는다.
 */
export async function streamTutorReply(params: {
  systemPrompt: string;
  messages: ChatMessage[];
}): Promise<ReadableStream<Uint8Array>> {
  const model = getModel('OPENROUTER_TUTOR_MODEL', DEFAULT_TUTOR_MODEL);
  const allowInsecureTls =
    process.env.OPENROUTER_ALLOW_INSECURE_TLS === 'true' ||
    process.env.OPENROUTER_ALLOW_INSECURE_TLS === '1';

  const requestInit: RequestInit & { dispatcher?: Agent } = {
    method: 'POST',
    headers: getOpenRouterHeaders(),
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.5,
      max_tokens: 900,
      messages: [{ role: 'system', content: params.systemPrompt }, ...params.messages],
    }),
  };

  if (allowInsecureTls) {
    requestInit.dispatcher = insecureTlsAgent;
  }

  const response = await fetch(OPENROUTER_URL, requestInit);

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenRouter tutor request failed: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const upstream = response.body;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) {
              continue;
            }

            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') {
              continue;
            }

            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const piece = json.choices?.[0]?.delta?.content;
              if (piece) {
                controller.enqueue(encoder.encode(piece));
              }
            } catch {
              /* 파싱 불가한 SSE 조각은 무시 */
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

export async function generateSolution(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const model = getModel('OPENROUTER_SOLVER_MODEL', DEFAULT_SOLVER_MODEL);

  const result = await openRouterRequest(
    {
      model,
      temperature: 0.2,
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: params.systemPrompt,
        },
        {
          role: 'user',
          content: params.userPrompt,
        },
      ],
    },
    'solver',
  );

  return extractMessageText(result.choices?.[0]?.message?.content);
}

import { AIProviderError, toTeacherMessage } from '@/lib/ai/errors';
import type {
  AIProviderAdapter,
  ChatMessage,
  CredentialTestResult,
  GenerateSolutionParams,
  RecognizeParams,
  StreamTutorParams,
  TestCredentialParams,
} from '@/lib/ai/types';
import {
  anthropicSseToTextStream,
  OCR_SYSTEM_PROMPT,
  OCR_USER_PROMPT,
  providerFetch,
  raiseForStatus,
  splitDataUrl,
  stripMarkdownFence,
} from '@/lib/ai/providers/shared';

/*
 * Anthropic Messages API 어댑터.
 * OpenAI 호환과 형식이 다르다: system은 별도 필드, 이미지 base64는 source 블록.
 */

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'x-api-key': apiKey,
    'anthropic-version': API_VERSION,
    'Content-Type': 'application/json',
  };
}

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string; type?: string };
};

function extractText(json: AnthropicResponse): string {
  return (json.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n')
    .trim();
}

async function post(apiKey: string, body: Record<string, unknown>, label: string): Promise<AnthropicResponse> {
  const response = await providerFetch(MESSAGES_URL, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });
  await raiseForStatus(response, `anthropic ${label}`);
  const json = (await response.json().catch(() => null)) as AnthropicResponse | null;
  if (!json) {
    throw new AIProviderError('UPSTREAM_UNAVAILABLE', `anthropic ${label}: non-JSON response`);
  }
  if (json.error?.message) {
    throw new AIProviderError('UNKNOWN', `anthropic ${label}: upstream error`);
  }
  return json;
}

function toAnthropicMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: [{ type: 'text', text: message.content }],
  }));
}

export const anthropicAdapter: AIProviderAdapter = {
  id: 'anthropic',

  async testCredential({ apiKey, model }: TestCredentialParams): Promise<CredentialTestResult> {
    try {
      await post(
        apiKey,
        { model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] },
        'credential test',
      );
      return { ok: true, message: '연결에 성공했어요.' };
    } catch (error) {
      const code = error instanceof AIProviderError ? error.code : 'UNKNOWN';
      return { ok: false, code, message: toTeacherMessage(error) };
    }
  },

  async recognizeProblemFromImage({ apiKey, model, dataUrl, mimeType }: RecognizeParams): Promise<string> {
    const { base64 } = splitDataUrl(dataUrl);
    const json = await post(
      apiKey,
      {
        model,
        max_tokens: 1200,
        temperature: 0,
        system: OCR_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${OCR_USER_PROMPT}\n이미지 형식: ${mimeType}` },
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            ],
          },
        ],
      },
      'vision OCR',
    );
    const text = stripMarkdownFence(extractText(json));
    if (!text) {
      throw new AIProviderError('UNSUPPORTED_IMAGE', 'anthropic OCR returned empty');
    }
    return text;
  },

  async streamTutorReply({ apiKey, model, systemPrompt, messages }: StreamTutorParams) {
    const response = await providerFetch(MESSAGES_URL, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        model,
        max_tokens: 1400,
        temperature: 0.7,
        stream: true,
        system: systemPrompt,
        messages: toAnthropicMessages(messages),
      }),
    });
    await raiseForStatus(response, 'anthropic tutor');
    if (!response.body) {
      throw new AIProviderError('UPSTREAM_UNAVAILABLE', 'anthropic tutor: no stream body');
    }
    return anthropicSseToTextStream(response.body);
  },

  async generateSolution({ apiKey, model, systemPrompt, userPrompt }: GenerateSolutionParams) {
    const json = await post(
      apiKey,
      {
        model,
        max_tokens: 3000,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      },
      'solver',
    );
    return extractText(json);
  },
};

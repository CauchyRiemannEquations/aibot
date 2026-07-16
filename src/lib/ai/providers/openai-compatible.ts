import { AIProviderError } from '@/lib/ai/errors';
import type {
  AIProviderAdapter,
  CredentialTestResult,
  GenerateSolutionParams,
  ProviderId,
  RecognizeParams,
  StreamTutorParams,
  TestCredentialParams,
} from '@/lib/ai/types';
import {
  OCR_SYSTEM_PROMPT,
  OCR_USER_PROMPT,
  openAiSseToTextStream,
  providerFetch,
  raiseForStatus,
  stripMarkdownFence,
} from '@/lib/ai/providers/shared';
import { toTeacherMessage } from '@/lib/ai/errors';

/*
 * OpenAI Chat Completions 호환 어댑터 공통 구현.
 * OpenRouter와 OpenAI가 이 형식을 공유하므로 baseUrl/headers만 주입해 재사용한다.
 */

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: { message?: string; code?: string };
};

function extractText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) {
          const text = (item as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

export type OpenAiCompatibleConfig = {
  id: ProviderId;
  chatUrl: string;
  buildHeaders: (apiKey: string) => Record<string, string>;
};

export function createOpenAiCompatibleAdapter(config: OpenAiCompatibleConfig): AIProviderAdapter {
  async function chat(
    apiKey: string,
    body: Record<string, unknown>,
    label: string,
  ): Promise<OpenAiChatResponse> {
    const response = await providerFetch(config.chatUrl, {
      method: 'POST',
      headers: config.buildHeaders(apiKey),
      body: JSON.stringify(body),
    });
    await raiseForStatus(response, `${config.id} ${label}`);
    const json = (await response.json().catch(() => null)) as OpenAiChatResponse | null;
    if (!json) {
      throw new AIProviderError('UPSTREAM_UNAVAILABLE', `${config.id} ${label}: non-JSON response`);
    }
    if (json.error?.message) {
      throw new AIProviderError('UNKNOWN', `${config.id} ${label}: upstream error`);
    }
    return json;
  }

  return {
    id: config.id,

    async testCredential({ apiKey, model }: TestCredentialParams): Promise<CredentialTestResult> {
      try {
        await chat(
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
      const json = await chat(
        apiKey,
        {
          model,
          temperature: 0,
          max_tokens: 1200,
          messages: [
            { role: 'system', content: OCR_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: `${OCR_USER_PROMPT}\n이미지 형식: ${mimeType}` },
                { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
              ],
            },
          ],
        },
        'vision OCR',
      );
      const text = stripMarkdownFence(extractText(json.choices?.[0]?.message?.content));
      if (!text) {
        throw new AIProviderError('UNSUPPORTED_IMAGE', `${config.id} OCR returned empty`);
      }
      return text;
    },

    async streamTutorReply({ apiKey, model, systemPrompt, messages }: StreamTutorParams) {
      const response = await providerFetch(config.chatUrl, {
        method: 'POST',
        headers: config.buildHeaders(apiKey),
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0.7,
          max_tokens: 1400,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
      });
      await raiseForStatus(response, `${config.id} tutor`);
      if (!response.body) {
        throw new AIProviderError('UPSTREAM_UNAVAILABLE', `${config.id} tutor: no stream body`);
      }
      return openAiSseToTextStream(response.body);
    },

    async generateSolution({ apiKey, model, systemPrompt, userPrompt }: GenerateSolutionParams) {
      const json = await chat(
        apiKey,
        {
          model,
          temperature: 0.2,
          max_tokens: 3000,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        },
        'solver',
      );
      return extractText(json.choices?.[0]?.message?.content);
    },
  };
}

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
  googleSseToTextStream,
  OCR_SYSTEM_PROMPT,
  OCR_USER_PROMPT,
  providerFetch,
  raiseForStatus,
  splitDataUrl,
  stripMarkdownFence,
} from '@/lib/ai/providers/shared';

/*
 * Google Gemini (Generative Language API) 어댑터.
 * API 키는 쿼리스트링(?key=)이 아니라 x-goog-api-key 헤더로 전달해 URL 로그 노출을 피한다.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json',
  };
}

type GooglePart = { text?: string; inlineData?: { mimeType: string; data: string } };
type GoogleResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string; status?: string };
};

function extractText(json: GoogleResponse): string {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

async function generateContent(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  label: string,
): Promise<GoogleResponse> {
  const url = `${BASE}/${encodeURIComponent(model)}:generateContent`;
  const response = await providerFetch(url, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });
  await raiseForStatus(response, `google ${label}`);
  const json = (await response.json().catch(() => null)) as GoogleResponse | null;
  if (!json) {
    throw new AIProviderError('UPSTREAM_UNAVAILABLE', `google ${label}: non-JSON response`);
  }
  if (json.error?.message) {
    throw new AIProviderError('UNKNOWN', `google ${label}: upstream error`);
  }
  return json;
}

function toGoogleContents(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));
}

export const googleAdapter: AIProviderAdapter = {
  id: 'google',

  async testCredential({ apiKey, model }: TestCredentialParams): Promise<CredentialTestResult> {
    try {
      await generateContent(
        apiKey,
        model,
        {
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 1 },
        },
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
    const parts: GooglePart[] = [
      { text: `${OCR_USER_PROMPT}\n이미지 형식: ${mimeType}` },
      { inlineData: { mimeType, data: base64 } },
    ];
    const json = await generateContent(
      apiKey,
      model,
      {
        systemInstruction: { parts: [{ text: OCR_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0, maxOutputTokens: 1200 },
      },
      'vision OCR',
    );
    const text = stripMarkdownFence(extractText(json));
    if (!text) {
      throw new AIProviderError('UNSUPPORTED_IMAGE', 'google OCR returned empty');
    }
    return text;
  },

  async streamTutorReply({ apiKey, model, systemPrompt, messages }: StreamTutorParams) {
    const url = `${BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
    const response = await providerFetch(url, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: toGoogleContents(messages),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1400 },
      }),
    });
    await raiseForStatus(response, 'google tutor');
    if (!response.body) {
      throw new AIProviderError('UPSTREAM_UNAVAILABLE', 'google tutor: no stream body');
    }
    return googleSseToTextStream(response.body);
  },

  async generateSolution({ apiKey, model, systemPrompt, userPrompt }: GenerateSolutionParams) {
    const json = await generateContent(
      apiKey,
      model,
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 3000 },
      },
      'solver',
    );
    return extractText(json);
  },
};

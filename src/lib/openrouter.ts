const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing');
  }

  return apiKey;
}

async function openRouterRequest(body: Record<string, unknown>) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'mijeokbun1-photo-solver-mvp',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function recognizeProblemFromImage(
  base64DataUrl: string,
  mimeType: string,
): Promise<string> {
  const model = process.env.OPENROUTER_VISION_MODEL;

  if (!model) {
    throw new Error('OPENROUTER_VISION_MODEL is missing');
  }

  const result = await openRouterRequest({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You read a Korean high-school calculus problem image. Return only the recognized problem statement in Korean with readable math notation and LaTeX where helpful. Do not solve it.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '사진 속 문제를 정확히 읽어서 문제 문장만 정리해 주세요. 풀이와 설명은 쓰지 마세요.',
          },
          {
            type: 'image_url',
            image_url: {
              url: base64DataUrl,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: `이미지 형식: ${mimeType}`,
          },
        ],
      },
    ],
  });

  return result.choices?.[0]?.message?.content?.trim() || '';
}

export async function generateSolution(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const model = process.env.OPENROUTER_SOLVER_MODEL;

  if (!model) {
    throw new Error('OPENROUTER_SOLVER_MODEL is missing');
  }

  const result = await openRouterRequest({
    model,
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
  });

  return result.choices?.[0]?.message?.content?.trim() || '';
}

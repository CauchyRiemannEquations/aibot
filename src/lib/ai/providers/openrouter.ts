import { createOpenAiCompatibleAdapter } from '@/lib/ai/providers/openai-compatible';

const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const openRouterAdapter = createOpenAiCompatibleAdapter({
  id: 'openrouter',
  chatUrl: CHAT_URL,
  buildHeaders: (apiKey) => ({
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'PULLI Math Tutor',
  }),
});

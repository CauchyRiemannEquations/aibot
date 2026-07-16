import { createOpenAiCompatibleAdapter } from '@/lib/ai/providers/openai-compatible';

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export const openAiAdapter = createOpenAiCompatibleAdapter({
  id: 'openai',
  chatUrl: CHAT_URL,
  buildHeaders: (apiKey) => ({
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }),
});

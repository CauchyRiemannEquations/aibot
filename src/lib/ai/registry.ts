import { anthropicAdapter } from '@/lib/ai/providers/anthropic';
import { googleAdapter } from '@/lib/ai/providers/google';
import { openAiAdapter } from '@/lib/ai/providers/openai';
import { openRouterAdapter } from '@/lib/ai/providers/openrouter';
import type { AIProviderAdapter, ProviderId } from '@/lib/ai/types';

const ADAPTERS: Record<ProviderId, AIProviderAdapter> = {
  google: googleAdapter,
  openai: openAiAdapter,
  anthropic: anthropicAdapter,
  openrouter: openRouterAdapter,
};

export function getProviderAdapter(providerId: ProviderId): AIProviderAdapter {
  const adapter = ADAPTERS[providerId];
  if (!adapter) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return adapter;
}

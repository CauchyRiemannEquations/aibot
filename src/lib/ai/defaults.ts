import type { ProviderId, ProviderModels } from '@/lib/ai/types';

/*
 * 중앙 제공업체 설정.
 * 모델 ID는 시간이 지나면 바뀔 수 있으므로 기본값만 여기서 관리하고,
 * 교사는 고급 설정에서 직접 모델 ID를 덮어쓸 수 있다.
 */

export const SUPPORTED_PROVIDERS: ProviderId[] = ['google', 'openai', 'anthropic', 'openrouter'];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  google: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  openrouter: 'OpenRouter',
};

export const DEFAULT_PROVIDER_MODELS: Record<ProviderId, ProviderModels> = {
  google: {
    visionModel: 'gemini-2.5-flash',
    tutorModel: 'gemini-2.5-flash',
    solverModel: 'gemini-2.5-flash',
  },
  openai: {
    visionModel: 'gpt-4o-mini',
    tutorModel: 'gpt-4o-mini',
    solverModel: 'gpt-4o-mini',
  },
  anthropic: {
    visionModel: 'claude-3-5-haiku-latest',
    tutorModel: 'claude-3-5-haiku-latest',
    solverModel: 'claude-3-5-haiku-latest',
  },
  openrouter: {
    visionModel: 'google/gemini-2.5-flash',
    tutorModel: 'google/gemini-2.5-flash',
    solverModel: 'google/gemini-2.5-flash',
  },
};

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && (SUPPORTED_PROVIDERS as string[]).includes(value);
}

export function getDefaultModels(provider: ProviderId): ProviderModels {
  return DEFAULT_PROVIDER_MODELS[provider];
}

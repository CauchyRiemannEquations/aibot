import { NextResponse } from 'next/server';

import { getDefaultModels, isProviderId } from '@/lib/ai/defaults';
import { getProviderAdapter } from '@/lib/ai/registry';
import type { ProviderId } from '@/lib/ai/types';
import { jsonError, withTeacher } from '@/lib/platform/http';
import { providerTestSchema } from '@/lib/platform/schemas';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await withTeacher();
  if ('error' in auth) return auth.error;

  const parsed = providerTestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError('입력값을 확인해 주세요.', 400);
  }

  const { provider, apiKey, model } = parsed.data;
  if (!isProviderId(provider)) {
    return jsonError('지원하지 않는 제공업체예요.', 400);
  }

  const adapter = getProviderAdapter(provider as ProviderId);
  const testModel = model || getDefaultModels(provider as ProviderId).tutorModel;

  const result = await adapter.testCredential({ apiKey, model: testModel });
  // 결과 문구에는 제공업체 원문 오류/키가 포함되지 않는다 (정규화된 교사용 메시지).
  return NextResponse.json({ ok: result.ok, code: result.code, message: result.message });
}

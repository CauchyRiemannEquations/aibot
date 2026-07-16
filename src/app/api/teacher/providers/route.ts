import { NextResponse } from 'next/server';

import { getDefaultModels, isProviderId } from '@/lib/ai/defaults';
import { getProviderAdapter } from '@/lib/ai/registry';
import type { ProviderId } from '@/lib/ai/types';
import { CURRENT_KEY_VERSION, encryptCredential, maskCredential } from '@/lib/crypto/credential-crypto';
import { jsonError, withTeacher } from '@/lib/platform/http';
import { providerSaveSchema } from '@/lib/platform/schemas';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type SafeCredential = {
  id: string;
  provider: string;
  apiKeyLast4: string;
  status: string;
  lastTestedAt: string | null;
};

export async function GET() {
  const auth = await withTeacher();
  if ('error' in auth) return auth.error;

  const admin = getAdminClient();
  const { data } = await admin
    .from('provider_credentials')
    .select('id, provider, api_key_last4, status, last_tested_at')
    .eq('teacher_id', auth.ctx.userId)
    .order('created_at', { ascending: true });

  const credentials: SafeCredential[] = (data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    apiKeyLast4: row.api_key_last4,
    status: row.status,
    lastTestedAt: row.last_tested_at,
  }));

  return NextResponse.json({ credentials });
}

export async function POST(request: Request) {
  const auth = await withTeacher();
  if ('error' in auth) return auth.error;

  const parsed = providerSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError('입력값을 확인해 주세요.', 400);
  }
  const { provider, apiKey, tutorModel } = parsed.data;
  if (!isProviderId(provider)) {
    return jsonError('지원하지 않는 제공업체예요.', 400);
  }

  // 저장 전에 반드시 연결 테스트를 통과해야 한다.
  const adapter = getProviderAdapter(provider as ProviderId);
  const testModel = tutorModel || getDefaultModels(provider as ProviderId).tutorModel;
  const test = await adapter.testCredential({ apiKey, model: testModel });
  if (!test.ok) {
    return NextResponse.json({ ok: false, message: test.message }, { status: 400 });
  }

  const encrypted = encryptCredential(apiKey);
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('provider_credentials')
    .upsert(
      {
        teacher_id: auth.ctx.userId,
        provider,
        encrypted_api_key: encrypted.ciphertext,
        encryption_iv: encrypted.iv,
        encryption_auth_tag: encrypted.authTag,
        encryption_key_version: CURRENT_KEY_VERSION,
        api_key_last4: maskCredential(apiKey),
        status: 'active',
        last_tested_at: new Date().toISOString(),
      },
      { onConflict: 'teacher_id,provider' },
    )
    .select('id, provider, api_key_last4, status, last_tested_at')
    .single();

  if (error || !data) {
    return jsonError('자격 증명을 저장하지 못했어요.', 500);
  }

  return NextResponse.json({
    ok: true,
    credential: {
      id: data.id,
      provider: data.provider,
      apiKeyLast4: data.api_key_last4,
      status: data.status,
      lastTestedAt: data.last_tested_at,
    },
  });
}

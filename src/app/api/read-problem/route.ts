import { NextResponse } from 'next/server';

import { resolveSingleModeProvider } from '@/lib/ai/credential-resolver';
import { toStudentMessage } from '@/lib/ai/errors';
import { validateImageFile } from '@/lib/image';

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE_MB = Number(process.env.MAX_IMAGE_SIZE_MB ?? 8);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json({ error: '문제 사진을 먼저 올려 주세요.' }, { status: 400 });
    }

    const validated = await validateImageFile(image, MAX_IMAGE_SIZE_MB * 1024 * 1024);
    if (!validated.ok) {
      const message =
        validated.error === 'too_large'
          ? `사진 용량은 ${MAX_IMAGE_SIZE_MB}MB 이하로 올려 주세요.`
          : '사진 파일만 올릴 수 있어요.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const resolved = resolveSingleModeProvider();
    const recognizedProblem = await resolved.adapter.recognizeProblemFromImage({
      apiKey: resolved.apiKey,
      model: resolved.models.visionModel,
      dataUrl: validated.dataUrl,
      mimeType: validated.mimeType,
    });

    if (!recognizedProblem) {
      return NextResponse.json(
        { error: '사진에서 문제를 잘 읽지 못했어요. 조금 더 선명한 사진으로 다시 시도해 주세요.' },
        { status: 422 },
      );
    }

    return NextResponse.json({ recognizedProblem });
  } catch (error) {
    console.error('[read-problem] failed');
    return NextResponse.json({ error: toStudentMessage(error, 'ocr') }, { status: 500 });
  }
}

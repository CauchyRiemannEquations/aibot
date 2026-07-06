import { NextResponse } from 'next/server';

import { fileToDataUrl } from '@/lib/image';
import { recognizeProblemFromImage } from '@/lib/openrouter';

const MAX_IMAGE_SIZE_MB = Number(process.env.MAX_IMAGE_SIZE_MB ?? 8);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: '문제 사진을 먼저 올려 주세요.' },
        { status: 400 },
      );
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '사진 파일만 올릴 수 있어요.' },
        { status: 400 },
      );
    }

    if (image.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `사진 용량은 ${MAX_IMAGE_SIZE_MB}MB 이하로 올려 주세요.` },
        { status: 400 },
      );
    }

    const dataUrl = await fileToDataUrl(image);
    const recognizedProblem = await recognizeProblemFromImage(dataUrl, image.type);

    if (!recognizedProblem) {
      return NextResponse.json(
        { error: '사진에서 문제를 잘 읽지 못했어요. 조금 더 선명한 사진으로 다시 시도해 주세요.' },
        { status: 422 },
      );
    }

    return NextResponse.json({ recognizedProblem });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: '문제를 읽는 중에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
}

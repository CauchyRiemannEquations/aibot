export async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${file.type};base64,${base64}`;
}

const SUPPORTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** 매직 바이트로 실제 이미지 형식을 확인한다. 선언된 MIME만으로 신뢰하지 않는다. */
function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif';
  }
  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export type ImageValidationError = 'too_large' | 'unsupported_type' | 'not_an_image';

export type ImageValidationResult =
  | { ok: true; dataUrl: string; mimeType: string }
  | { ok: false; error: ImageValidationError };

/**
 * 학생 업로드 이미지를 검증하고 data URL로 변환한다.
 * - 크기 제한
 * - 선언 MIME 화이트리스트
 * - 실제 파일 시그니처(매직 바이트) 확인
 * base64 전체를 로그에 남기지 않는다.
 */
export async function validateImageFile(
  file: File,
  maxBytes: number,
): Promise<ImageValidationResult> {
  if (file.size > maxBytes) {
    return { ok: false, error: 'too_large' };
  }
  if (!SUPPORTED_MIME.has(file.type)) {
    return { ok: false, error: 'unsupported_type' };
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const sniffed = sniffImageMime(bytes);
  if (!sniffed) {
    return { ok: false, error: 'not_an_image' };
  }

  const base64 = Buffer.from(arrayBuffer).toString('base64');
  // 실제 시그니처로 확인된 MIME을 사용한다.
  return { ok: true, dataUrl: `data:${sniffed};base64,${base64}`, mimeType: sniffed };
}

'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/*
 * 학생 링크 QR 코드. data URL(PNG)로 렌더링하며 다운로드도 지원한다.
 */
export function QrCode({ value, downloadName }: { value: string; downloadName?: string }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: 320, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => setDataUrl(''));
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!dataUrl) {
    return <div className="qr-placeholder">QR 생성 중…</div>;
  }

  return (
    <div className="qr-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="학생 접속 QR 코드" className="qr-image" width={200} height={200} />
      <a href={dataUrl} download={`${downloadName ?? 'socra-qr'}.png`} className="ghost-button qr-download">
        QR 다운로드
      </a>
    </div>
  );
}

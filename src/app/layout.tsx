import type { Metadata } from 'next';

import './globals.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: '풀리 | 수학 문제 풀이 봇',
  description: '문제 사진을 올리면 수학 문제를 읽고 단계별 풀이를 보여주는 AI 수학 풀이 서비스',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

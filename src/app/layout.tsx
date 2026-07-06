import type { Metadata } from 'next';

import './globals.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: '미적분Ⅰ 사진 문제풀이봇',
  description: '문제 사진을 올리면 단계별 풀이를 제공하는 MVP입니다.',
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

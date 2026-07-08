import type { Metadata } from 'next';

import './globals.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: 'AI 수학문제 풀이 봇 풀리',
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

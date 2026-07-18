import type { Metadata } from 'next';

import './globals.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: 'PULLI | 정답을 말하지 않는 수학 튜터',
  description:
    '문제 사진을 올리면 정답 대신 좋은 질문을 하나씩 던져서 스스로 답에 도달하게 돕는 소크라테스식 AI 수학 튜터',
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

import Link from 'next/link';

import { SingleTutor } from '@/components/single-tutor';
import { isPlatformMode } from '@/lib/platform/config';

// 운영 모드(APP_MODE)는 런타임 환경변수로 결정되므로 정적 프리렌더를 비활성화한다.
export const dynamic = 'force-dynamic';

/*
 * 루트 페이지.
 * - single 모드: 기존 SOCRA 튜터를 그대로 노출 (현재 배포와 동일).
 * - platform 모드: 플랫폼 소개 + 교사 로그인 진입.
 */
export default function HomePage() {
  if (!isPlatformMode()) {
    return <SingleTutor />;
  }

  return (
    <div className="app-shell">
      <main className="platform-landing">
        <section className="platform-hero">
          <p className="platform-eyebrow">SOCRATIC MATH TUTOR PLATFORM</p>
          <h1 className="platform-title">
            SOCRA<span className="tutor-q">?</span>
          </h1>
          <p className="platform-lede">
            정답을 바로 알려주지 않고 <b>질문으로 생각하게 하는 수학 AI 튜터</b>를 우리 반 학생들에게.
            선생님이 AI를 연결하면, 학생들은 링크 하나로 계정 없이 바로 사용할 수 있어요.
          </p>
          <div className="platform-cta-row">
            <Link href="/teacher/login" className="primary-button platform-cta">
              선생님으로 시작하기
            </Link>
          </div>
        </section>

        <section className="platform-steps">
          <ol>
            <li>
              <span className="platform-step-n">1</span>
              이메일로 로그인해요. 별도 가입이나 외부 계정이 필요 없어요.
            </li>
            <li>
              <span className="platform-step-n">2</span>
              사용할 AI를 연결하고 반을 만들어요.
            </li>
            <li>
              <span className="platform-step-n">3</span>
              학생용 링크와 QR 코드를 나눠 주면 끝이에요.
            </li>
          </ol>
        </section>

        <p className="platform-foot">
          이미 계정이 있으신가요? <Link href="/teacher/login">로그인</Link>
        </p>
      </main>
    </div>
  );
}

import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';
import { authEnabled } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DECHIRE · Sign in',
  robots: { index: false, follow: false },
};

/**
 * The login mask for the workspace. Only exists when `HQ_PASSWORD` is set –
 * without it the page redirects straight into the HQ.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; out?: string }> }) {
  if (!authEnabled()) redirect('/');

  const params = await searchParams;
  const requested = typeof params.next === 'string' ? params.next : '';
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';

  return (
    <main className="login">
      <div className="login-card">
        <span className="login-mark" aria-hidden="true">
          D
        </span>
        <span className="login-eyebrow">private /// band only</span>
        <h1 className="login-title">Band HQ</h1>
        <p className="login-hint">
          Planning, media, notes, the paperwork – everything the band keeps to itself. One password, then the
          door is open.
        </p>

        <LoginForm next={next} />

        <div className="login-foot">
          <a href="/site">the public page ↗</a>
          <span className="mono">2026</span>
        </div>
      </div>
    </main>
  );
}

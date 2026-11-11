import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authEnabled, verifySession } from './lib/auth';

/**
 * Login gate for the workspace.
 *
 * A real login mask instead of HTTP Basic Auth: `/login` posts the password to
 * `/api/auth/login`, which sets a signed, httpOnly session cookie. The gate only
 * exists when `HQ_PASSWORD` is set, so local development stays open.
 *
 * Public without a session: the one-pager (`/site`), the login itself, uploaded
 * files (Instagram has to fetch them), and the assets those pages need.
 */
const PUBLIC_PATHS: RegExp[] = [
  /^\/site(\/|$)/,
  /^\/share(\/|$)/,
  /^\/login(\/|$)/,
  /^\/api\/auth\//,
  /^\/api\/share\//,
  /^\/api\/files\//,
  /^\/_next\//,
  /^\/icon\.svg$/,
  /^\/favicon\.ico$/,
];

export async function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((pattern) => pattern.test(pathname))) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) return NextResponse.next();

  /* API calls get JSON, browsers get the mask – with the way back. */
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  /**
   * Everything except the public one-pager and Next's own assets. The list above
   * additionally opens the login route and the uploaded files.
   */
  matcher: ['/((?!site|share|_next/static|_next/image|api/files|api/share|icon\\.svg|favicon\\.ico).*)'],
};

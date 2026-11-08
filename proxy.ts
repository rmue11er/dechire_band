import { NextResponse, type NextRequest } from 'next/server';

/**
 * HTTP Basic Auth for the internal workspace.
 *
 * The app has no login of its own – and it holds the Instagram token, the
 * backups and every draft. As soon as `HQ_PASSWORD` is set, everything is
 * protected except the public one-pager and the files it needs.
 *
 *   HQ_USER=dechire
 *   HQ_PASSWORD=<something long>
 *
 * Without `HQ_PASSWORD` nothing happens, so local development stays open.
 */
const REALM = 'DECHIRE Band HQ';

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** Length-safe comparison so timing does not leak credentials. */
function sameSecret(given: string, expected: string) {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.HQ_PASSWORD ?? '';
  if (!password) return NextResponse.next();

  const header = request.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    let decoded = '';
    try {
      decoded = atob(header.slice(6));
    } catch {
      return unauthorized();
    }
    const separator = decoded.indexOf(':');
    if (separator > 0) {
      const user = decoded.slice(0, separator);
      const pass = decoded.slice(separator + 1);
      if (sameSecret(user, process.env.HQ_USER || 'dechire') && sameSecret(pass, password)) {
        return NextResponse.next();
      }
    }
  }

  return unauthorized();
}

export const config = {
  /**
   * Public: /site (the one-pager), its assets, the uploaded files Instagram has
   * to reach, and the icon. Everything else – planner, settings, API – is locked.
   */
  matcher: ['/((?!site|_next|api/files|icon.svg).*)'],
};

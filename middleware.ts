import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/signup', '/api/auth/login', '/api/auth/signup'];
const cronPaths = ['/api/cron/'];
const adminPaths = ['/admin', '/api/admin/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname === path)) {
    return NextResponse.next();
  }

  // Allow cron paths with secret validation
  if (cronPaths.some(path => pathname.startsWith(path))) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return NextResponse.next();
    }

    const vercelCronSecret = request.headers.get('x-vercel-cron-secret');
    if (cronSecret && vercelCronSecret === cronSecret) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin paths: page is public (has its own PIN gate), API checks admin PIN header
  if (adminPaths.some(path => pathname === path || pathname.startsWith(path))) {
    if (pathname.startsWith('/api/admin/')) {
      const adminPin = request.headers.get('x-admin-pin');
      const expectedPin = process.env.ADMIN_PIN;
      if (!expectedPin || adminPin !== expectedPin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check auth cookie exists (actual JWT verification happens in API routes)
  const token = request.cookies.get('pronoliga_token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

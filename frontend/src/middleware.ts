import { NextResponse, type NextRequest } from 'next/server';

// Gate /dashboard, /assets, /compliance, /workflow, /brand, /admin behind the access cookie.
// The (app) route group checks the token again in the client layout; this just redirects
// unauthenticated navigation faster so the loading flash is shorter.
const PROTECTED = [
  '/dashboard',
  '/assets',
  '/compliance',
  '/workflow',
  '/brand',
  '/admin',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPath = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!protectedPath) return NextResponse.next();

  const access = req.cookies.get('al_access')?.value;
  if (!access) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/assets/:path*',
    '/compliance/:path*',
    '/workflow/:path*',
    '/brand/:path*',
    '/admin/:path*',
  ],
};

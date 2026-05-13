import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PREFIXES = ['/dashboard', '/sessions/'];

// NextAuth v5 renomme le cookie : __Secure- en prod (HTTPS), authjs. en dev
const COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

function isProtectedPath(pathname: string): boolean {
  const localePattern = routing.locales.join('|');
  const stripped = pathname.replace(new RegExp(`^/(${localePattern})`), '') || '/';
  return PROTECTED_PREFIXES.some(
    (prefix) => stripped === prefix.replace(/\/$/, '') || stripped.startsWith(prefix)
  );
}

function isLoginPath(pathname: string): boolean {
  const localePattern = routing.locales.join('|');
  const stripped = pathname.replace(new RegExp(`^/(${localePattern})`), '') || '/';
  return stripped === '/login';
}

function getLocaleFromPath(pathname: string): string {
  const localePattern = routing.locales.join('|');
  const match = pathname.match(new RegExp(`^/(${localePattern})(/|$)`));
  return match ? match[1] : routing.defaultLocale;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: COOKIE_NAME,
  });

  if (isProtectedPath(pathname) && !token) {
    const locale = getLocaleFromPath(pathname);
    const loginPath = locale !== routing.defaultLocale ? `/${locale}/login` : '/login';
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (isLoginPath(pathname) && token) {
    const locale = getLocaleFromPath(pathname);
    const dashboardPath = locale !== routing.defaultLocale ? `/${locale}/dashboard` : '/dashboard';
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};

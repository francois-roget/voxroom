import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PREFIXES = ['/dashboard', '/sessions/'];

function isProtectedPath(pathname: string): boolean {
  const localePattern = routing.locales.join('|');
  const stripped = pathname.replace(new RegExp(`^/(${localePattern})`), '') || '/';
  return PROTECTED_PREFIXES.some(
    (prefix) => stripped === prefix.replace(/\/$/, '') || stripped.startsWith(prefix)
  );
}

function getLocaleFromPath(pathname: string): string {
  const localePattern = routing.locales.join('|');
  const match = pathname.match(new RegExp(`^/(${localePattern})(/|$)`));
  return match ? match[1] : routing.defaultLocale;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isProtectedPath(pathname)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      const locale = getLocaleFromPath(pathname);
      const loginPath = locale !== routing.defaultLocale ? `/${locale}/login` : '/login';
      return NextResponse.redirect(new URL(loginPath, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};

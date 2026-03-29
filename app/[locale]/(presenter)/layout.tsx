import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export default async function PresenterLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session) {
    const loginPath = locale === routing.defaultLocale ? '/login' : `/${locale}/login`;
    redirect(loginPath);
  }
  return <>{children}</>;
}

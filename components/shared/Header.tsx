'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import type { Session } from 'next-auth';
import LanguageSwitcher from './LanguageSwitcher';

const HIDDEN_PREFIXES = ['/present/', '/session/'];

type HeaderProps = {
  user: Session['user'] | null;
  signOutAction: (formData: FormData) => Promise<void>;
};

export default function Header({ user, signOutAction }: HeaderProps) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Left — Logo */}
      <Link
        href="/"
        className="text-xl font-bold tracking-tight"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
      >
        VoxRoom
      </Link>

      {/* Center — Navigation */}
      <nav className="flex items-center gap-4">
        <NavLink href="/join" currentPath={pathname}>
          {t('join')}
        </NavLink>
        {user && (
          <NavLink href="/dashboard" currentPath={pathname}>
            {t('dashboard')}
          </NavLink>
        )}
      </nav>

      {/* Right — Language + Auth */}
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        {user ? (
          <div className="flex items-center gap-3">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name ?? ''}
                width={28}
                height={28}
                className="rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t('logout')}
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg-base)',
            }}
          >
            {t('login')}
          </Link>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  currentPath,
  children,
}: {
  href: string;
  currentPath: string;
  children: React.ReactNode;
}) {
  const isActive = currentPath === href;

  return (
    <Link
      href={href}
      className="text-sm font-medium transition-colors"
      style={{
        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
      }}
    >
      {children}
    </Link>
  );
}

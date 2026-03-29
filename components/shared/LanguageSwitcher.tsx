'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Hide on presenter/projector view
  if (pathname.includes('/present/')) return null;

  const otherLocale = locale === 'en' ? 'fr' : 'en';

  function handleSwitch() {
    startTransition(() => {
      router.replace(pathname, { locale: otherLocale });
    });
  }

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      className="fixed bottom-4 right-4 z-50 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {otherLocale.toUpperCase()}
    </button>
  );
}

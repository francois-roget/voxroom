'use client';

import { useTranslations } from 'next-intl';

export default function LoadingScreen() {
  const t = useTranslations('common');

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <p style={{ color: 'var(--color-text-secondary)' }}>{t('loading')}</p>
    </main>
  );
}

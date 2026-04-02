import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { auth } from '@/auth';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import JoinForm from '@/components/participant/JoinForm';
import LandingQR from '@/components/landing/LandingQR';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  let session = null;
  try {
    session = await auth();
  } catch {
    // Auth may fail if env vars are missing — render as unauthenticated
  }

  const t = await getTranslations('landing');

  return (
    <main
      className="min-h-screen flex flex-col items-center"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <div className="w-full max-w-4xl flex flex-col gap-20 py-20 px-6">

        {/* Hero */}
        <div className="text-center flex flex-col items-center gap-6">
          <Image
            src="/logo-hd.webp"
            alt="VoxRoom logo"
            width={160}
            height={160}
            priority
          />
          <h1
            className="text-6xl font-black tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            Vox<span style={{ color: 'var(--color-accent)' }}>Room</span>
          </h1>
          <p
            className="text-xl max-w-xl mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('heroDescription')}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: '⚡',
              title: t('featureLiveTitle'),
              desc: t('featureLiveDesc'),
            },
            {
              icon: '📱',
              title: t('featureNoSignupTitle'),
              desc: t('featureNoSignupDesc'),
            },
            {
              icon: '📊',
              title: t('featureRealtimeTitle'),
              desc: t('featureRealtimeDesc'),
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl p-6 flex flex-col gap-3"
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span className="text-2xl">{icon}</span>
              <p
                className="font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {title}
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Join section */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-10">
          <div
            className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-5"
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('joinSession')}
            </p>
            <JoinForm compact />
          </div>

          <div className="hidden md:block">
            <LandingQR />
          </div>
        </div>

        {/* Trainer CTA */}
        <div
          className="flex flex-col items-center gap-5 rounded-xl p-10 text-center"
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            className="text-lg font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('trainerQuestion')}
          </p>
          <p
            className="text-sm max-w-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('trainerDescription')}
          </p>
          {session ? (
            <Link
              href="/dashboard"
              className="inline-block rounded-lg px-8 py-3 text-base font-bold"
              style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
            >
              {t('goToDashboard')}
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-block rounded-lg px-8 py-3 text-base font-bold"
              style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
            >
              {t('signInWithGoogle')}
            </Link>
          )}
        </div>

      </div>
    </main>
  );
}

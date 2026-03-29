import { setRequestLocale } from 'next-intl/server';
import JoinForm from '@/components/participant/JoinForm';

export default async function JoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <JoinForm />
    </main>
  );
}

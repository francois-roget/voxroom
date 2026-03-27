import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import JoinForm from '@/components/participant/JoinForm';
import LandingQR from '@/components/landing/LandingQR';

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <div className="w-full max-w-4xl flex flex-col gap-20 py-20 px-6">

        {/* Hero */}
        <div className="text-center flex flex-col items-center gap-6">
          <div
            className="rounded-3xl p-4"
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 0 40px var(--color-accent-glow)',
            }}
          >
            <Image
              src="/logo.png"
              alt="VoxRoom logo"
              width={96}
              height={96}
              priority
            />
          </div>
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
            Le live polling simple et instantané pour vos formations.
            Posez des questions, récoltez des réponses en temps réel.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: '⚡',
              title: 'Questions en direct',
              desc: 'QCM et nuages de mots, lancés en un clic depuis votre panneau de contrôle.',
            },
            {
              icon: '📱',
              title: 'Sans inscription',
              desc: 'Vos participants rejoignent avec un simple code à 4 caractères. Aucun compte requis.',
            },
            {
              icon: '📊',
              title: 'Résultats en temps réel',
              desc: 'Graphiques et nuages de mots s\'affichent instantanément sur le vidéoprojecteur.',
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
              Rejoindre une session
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
            Vous êtes formateur ?
          </p>
          <p
            className="text-sm max-w-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Créez vos sessions, gérez vos questions et pilotez vos présentations depuis un tableau de bord dédié.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg px-8 py-3 text-base font-bold"
            style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
          >
            Se connecter avec Google
          </Link>
        </div>

      </div>
    </main>
  );
}

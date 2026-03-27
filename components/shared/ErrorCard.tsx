import Link from 'next/link';

type ErrorCardProps = {
  message?: string;
  href: string;
  linkText: string;
};

export default function ErrorCard({ message = 'Session introuvable.', href, linkText }: ErrorCardProps) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8 flex flex-col items-center gap-4 text-center"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-error)',
        }}
      >
        <span className="text-3xl">⚠️</span>
        <p className="font-medium" style={{ color: 'var(--color-error)' }}>
          {message}
        </p>
        <Link
          href={href}
          className="rounded-lg px-4 py-2 text-sm font-medium mt-2"
          style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
        >
          {linkText}
        </Link>
      </div>
    </main>
  );
}

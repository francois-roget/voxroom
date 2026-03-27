export default function LoadingScreen() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <p style={{ color: 'var(--color-text-secondary)' }}>Chargement…</p>
    </main>
  );
}

'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: '#0a0a0f', color: '#f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', fontFamily: 'sans-serif' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Une erreur est survenue</h2>
        <p style={{ fontSize: '0.875rem', color: '#8888aa' }}>{error.message}</p>
        <button onClick={reset} style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Réessayer
        </button>
      </body>
    </html>
  )
}

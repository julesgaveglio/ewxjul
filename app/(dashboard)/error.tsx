'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
      <p className="text-sm text-text-secondary">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-accent text-white rounded-md text-sm hover:bg-accent-hover"
      >
        Réessayer
      </button>
    </div>
  )
}

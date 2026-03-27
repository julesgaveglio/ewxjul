export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Page introuvable</h2>
      <p className="text-sm text-gray-500">La page que vous cherchez n&apos;existe pas.</p>
      <a
        href="/"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        Retour à l&apos;accueil
      </a>
    </div>
  )
}

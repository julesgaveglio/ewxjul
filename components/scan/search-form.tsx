'use client'

interface SearchFormProps {
  onSubmit: (city: string, sector: string) => void
  disabled: boolean
}

const SECTORS = [
  'restaurant', 'boulangerie', 'coiffeur', 'hôtel', 'bar', 'café',
  'plombier', 'électricien', 'menuisier', 'garage', 'fleuriste',
  'boucherie', 'traiteur', 'peintre', 'maçon', 'artisan',
  'commerce', 'boutique', 'institut de beauté', 'dentiste',
  'avocat', 'comptable', 'architecte', 'photographe',
]

export function SearchForm({ onSubmit, disabled }: SearchFormProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData.get('city') as string, formData.get('sector') as string)
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <label htmlFor="city" className="block text-sm text-text-secondary mb-1">Ville</label>
        <input id="city" name="city" type="text" required placeholder="Bayonne, Biarritz, Anglet..." className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <div className="flex-1">
        <label htmlFor="sector" className="block text-sm text-text-secondary mb-1">Secteur</label>
        <select id="sector" name="sector" required className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="">Choisir un secteur</option>
          {SECTORS.map(s => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={disabled} className="w-full sm:w-auto px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-md font-medium transition-colors disabled:opacity-50">
          {disabled ? 'Scan en cours...' : 'Lancer le scan'}
        </button>
      </div>
    </form>
  )
}

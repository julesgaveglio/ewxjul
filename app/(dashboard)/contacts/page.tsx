'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact, ContactCategory, AssignedTo } from '@/lib/types/database'
import { Plus, Phone, Mail, Pencil, Trash2, Check, X, Search } from 'lucide-react'

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: Record<ContactCategory, { label: string; color: string; bg: string }> = {
  reseau:      { label: 'Réseau',      color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  client:      { label: 'Client',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  partenaire:  { label: 'Partenaire',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  fournisseur: { label: 'Fournisseur', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  referent:    { label: 'Référent',    color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  investisseur:{ label: 'Investisseur',color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
}

const ASSIGNEES = [
  { key: 'jules' as AssignedTo, initials: 'J', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  { key: 'ewan'  as AssignedTo, initials: 'E', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
]

function CategoryBadge({ category }: { category: ContactCategory }) {
  const cfg = CATEGORIES[category]
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Empty row form ───────────────────────────────────────────────────────────

interface ContactForm {
  name: string
  company: string
  phone: string
  email: string
  category: ContactCategory
  notes: string
  assigned_to: AssignedTo | null
}

const EMPTY_FORM: ContactForm = {
  name: '', company: '', phone: '', email: '',
  category: 'reseau', notes: '', assigned_to: null,
}

function InlineForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: ContactForm
  onSave: (f: ContactForm) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState(initial)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  function set(field: keyof ContactForm, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  return (
    <tr className="border-b border-border bg-bg-hover/30">
      {/* Nom */}
      <td className="px-3 py-2">
        <input
          ref={nameRef}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Nom *"
          className="w-full bg-bg border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
        />
      </td>
      {/* Entreprise */}
      <td className="px-3 py-2 hidden sm:table-cell">
        <input
          value={form.company}
          onChange={e => set('company', e.target.value)}
          placeholder="Entreprise"
          className="w-full bg-bg border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
        />
      </td>
      {/* Téléphone */}
      <td className="px-3 py-2 hidden md:table-cell">
        <input
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="Téléphone"
          className="w-full bg-bg border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
        />
      </td>
      {/* Email */}
      <td className="px-3 py-2 hidden lg:table-cell">
        <input
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="Email"
          className="w-full bg-bg border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
        />
      </td>
      {/* Catégorie */}
      <td className="px-3 py-2 hidden md:table-cell">
        <select
          value={form.category}
          onChange={e => set('category', e.target.value as ContactCategory)}
          className="bg-bg border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
        >
          {(Object.keys(CATEGORIES) as ContactCategory[]).map(k => (
            <option key={k} value={k}>{CATEGORIES[k].label}</option>
          ))}
        </select>
      </td>
      {/* Notes */}
      <td className="px-3 py-2 hidden xl:table-cell">
        <input
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Notes..."
          className="w-full bg-bg border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
        />
      </td>
      {/* Assigné */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 justify-center">
          {ASSIGNEES.map(({ key, initials, color, bg }) => {
            const isActive = form.assigned_to === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setForm(f => ({ ...f, assigned_to: f.assigned_to === key ? null : key }))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  backgroundColor: isActive ? bg : 'transparent',
                  color: isActive ? color : 'var(--color-text-secondary)',
                  border: `1.5px solid ${isActive ? color : 'var(--color-border)'}`,
                }}
              >
                {initials}
              </button>
            )
          })}
        </div>
      </td>
      {/* Actions */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="p-1.5 rounded bg-accent hover:bg-accent-hover text-white disabled:opacity-40 transition-colors"
          >
            <Check size={13} />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<ContactCategory | ''>('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchContacts()
    const channel = supabase
      .channel('contacts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, fetchContacts)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchContacts() {
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
    if (data) setContacts(data)
  }

  async function handleAdd(form: ContactForm) {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('contacts').insert({
      name: form.name.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      category: form.category,
      notes: form.notes.trim() || null,
      assigned_to: form.assigned_to,
    })
    setSaving(false)
    setAdding(false)
    fetchContacts()
  }

  async function handleEdit(id: string, form: ContactForm) {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('contacts').update({
      name: form.name.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      category: form.category,
      notes: form.notes.trim() || null,
      assigned_to: form.assigned_to,
    }).eq('id', id)
    setSaving(false)
    setEditingId(null)
    fetchContacts()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('contacts').delete().eq('id', id)
    setDeletingId(null)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const filtered = contacts.filter(c => {
    if (filterCategory && c.category !== filterCategory) return false
    if (search) {
      const s = search.toLowerCase()
      return c.name.toLowerCase().includes(s) ||
        c.company?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.includes(s)
    }
    return true
  })

  // Count per category
  const counts = contacts.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + 1
    return acc
  }, {} as Record<ContactCategory, number>)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-text-secondary mt-0.5">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditingId(null) }}
          disabled={adding}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Plus size={16} /> Ajouter un contact
        </button>
      </div>

      {/* Category pills + search */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-8 pr-3 py-1.5 bg-bg-surface border border-border rounded-md text-sm focus:outline-none focus:border-accent"
          />
        </div>

        {/* Category filter */}
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filterCategory === '' ? 'bg-accent text-white' : 'bg-bg-hover text-text-secondary hover:text-text-primary'
          }`}
        >
          Tous ({contacts.length})
        </button>
        {(Object.keys(CATEGORIES) as ContactCategory[]).map(k => {
          const cfg = CATEGORIES[k]
          const count = counts[k] ?? 0
          if (count === 0) return null
          const isActive = filterCategory === k
          return (
            <button
              key={k}
              onClick={() => setFilterCategory(isActive ? '' : k)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? cfg.bg : 'transparent',
                color: isActive ? cfg.color : 'var(--color-text-secondary)',
                border: `1px solid ${isActive ? cfg.color : 'var(--color-border)'}`,
              }}
            >
              {cfg.label} {count}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary bg-bg-hover/50 text-xs">
                <th className="px-3 py-3 font-medium min-w-[140px]">Nom</th>
                <th className="px-3 py-3 font-medium hidden sm:table-cell w-36">Entreprise</th>
                <th className="px-3 py-3 font-medium hidden md:table-cell w-36">Téléphone</th>
                <th className="px-3 py-3 font-medium hidden lg:table-cell w-44">Email</th>
                <th className="px-3 py-3 font-medium hidden md:table-cell w-32">Catégorie</th>
                <th className="px-3 py-3 font-medium hidden xl:table-cell">Notes</th>
                <th className="px-3 py-3 font-medium w-24 text-center">Assigné</th>
                <th className="px-3 py-3 font-medium w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>

              {/* Add row */}
              {adding && (
                <InlineForm
                  initial={EMPTY_FORM}
                  onSave={handleAdd}
                  onCancel={() => setAdding(false)}
                  saving={saving}
                />
              )}

              {filtered.length === 0 && !adding && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-text-secondary">
                    {contacts.length === 0
                      ? 'Aucun contact. Cliquez sur "Ajouter un contact" pour commencer.'
                      : 'Aucun résultat pour cette recherche.'}
                  </td>
                </tr>
              )}

              {filtered.map(contact => {
                const isEditing = editingId === contact.id
                const isDeleting = deletingId === contact.id

                if (isEditing) {
                  return (
                    <InlineForm
                      key={contact.id}
                      initial={{
                        name: contact.name,
                        company: contact.company ?? '',
                        phone: contact.phone ?? '',
                        email: contact.email ?? '',
                        category: contact.category,
                        notes: contact.notes ?? '',
                        assigned_to: contact.assigned_to,
                      }}
                      onSave={form => handleEdit(contact.id, form)}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                    />
                  )
                }

                const assignee = ASSIGNEES.find(a => a.key === contact.assigned_to)

                return (
                  <tr
                    key={contact.id}
                    className={`border-b border-border/40 transition-colors group ${isDeleting ? 'opacity-40' : 'hover:bg-bg-hover/50'}`}
                  >
                    {/* Nom */}
                    <td className="px-3 py-3">
                      <p className="font-medium">{contact.name}</p>
                      {/* Mobile: company sous le nom */}
                      {contact.company && (
                        <p className="text-xs text-text-secondary mt-0.5 sm:hidden">{contact.company}</p>
                      )}
                    </td>

                    {/* Entreprise */}
                    <td className="px-3 py-3 hidden sm:table-cell text-text-secondary text-xs">
                      {contact.company ?? '—'}
                    </td>

                    {/* Téléphone */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-accent hover:underline text-xs">
                          <Phone size={11} /> {contact.phone}
                        </a>
                      ) : <span className="text-text-secondary text-xs">—</span>}
                    </td>

                    {/* Email */}
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-accent hover:underline text-xs truncate max-w-[160px]">
                          <Mail size={11} /> {contact.email}
                        </a>
                      ) : <span className="text-text-secondary text-xs">—</span>}
                    </td>

                    {/* Catégorie */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      <CategoryBadge category={contact.category} />
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-3 hidden xl:table-cell max-w-[200px]">
                      {contact.notes ? (
                        <p className="text-xs text-text-secondary line-clamp-2">{contact.notes}</p>
                      ) : <span className="text-text-secondary text-xs">—</span>}
                    </td>

                    {/* Assigné */}
                    <td className="px-3 py-3 text-center">
                      {assignee ? (
                        <span
                          className="inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold mx-auto"
                          style={{ backgroundColor: assignee.bg, color: assignee.color, border: `1.5px solid ${assignee.color}` }}
                        >
                          {assignee.initials}
                        </span>
                      ) : <span className="text-text-secondary text-xs">—</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(contact.id); setAdding(false) }}
                          className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          disabled={isDeleting}
                          className="p-1.5 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

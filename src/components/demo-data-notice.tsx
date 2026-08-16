import { FlaskConical } from 'lucide-react'

export function DemoDataNotice() {
  return (
    <aside className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
      <FlaskConical className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p>
        <strong>Données de démonstration.</strong> Les noms, lieux, horaires et liens affichés ne
        décrivent pas de véritables activités.
      </p>
    </aside>
  )
}

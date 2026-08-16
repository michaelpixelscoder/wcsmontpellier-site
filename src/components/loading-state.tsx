export function LoadingState({ label = 'Chargement des données…' }: { label?: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
      <span className="animate-pulse">{label}</span>
    </div>
  )
}

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { ExternalLink, Heart, ShieldCheck, Trash2 } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { PageIntro } from '@/components/page-intro'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { routes } from '@/routing/routes'

function PageFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  useDocumentTitle(title)
  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-14 sm:px-6">
      <PageIntro eyebrow="Espace personnel" title={title} description={description} />
      {children}
    </section>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const location = useLocation()
  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Vérification de la session…</p>
  if (!isAuthenticated) return <Navigate replace to={`${routes.signIn}?redirect=${encodeURIComponent(location.pathname)}`} />
  return children
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.replace(/^.*?Uncaught Error: /, '') : 'Une erreur est survenue.'
}

function toLocalDateTime(value: number | undefined) {
  if (value === undefined) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(value - offset).toISOString().slice(0, 16)
}

type OwnedListing = FunctionReturnType<typeof api.contributions.listMine>[number]
type EditorOptions = FunctionReturnType<typeof api.contributions.editorOptions>

function OwnedListingEditor({ item, options }: { item: OwnedListing; options: EditorOptions }) {
  const update = useMutation(api.contributions.updateOwn)
  const archive = useMutation(api.contributions.archiveOwn)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fieldId = (name: string) => `${name}-${item.id}`

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaved(false)
    const form = new FormData(event.currentTarget)
    try {
      await update({
        listingId: item.id,
        expectedVersion: item.version,
        title: String(form.get('title')),
        summary: String(form.get('summary')),
        description: String(form.get('description')),
        sourceUrl: String(form.get('sourceUrl')),
        status: String(form.get('status')) as OwnedListing['status'],
        details: item.details.kind === 'class' ? {
          kind: 'class',
          seasonId: String(form.get('seasonId')) as typeof item.details.seasonId,
          levelId: String(form.get('levelId')) as typeof item.details.levelId,
          trialAvailable: form.get('trialAvailable') === 'on',
          registrationStatus: String(form.get('registrationStatus')) as typeof item.details.registrationStatus,
          priceSummary: String(form.get('priceSummary') || ''),
          teacherIds: [String(form.get('teacherId')) as EditorOptions['actors'][number]['id']],
          schedule: {
            placeId: String(form.get('placeId')) as EditorOptions['places'][number]['id'],
            weekdays: [String(form.get('weekday')) as NonNullable<typeof item.details.schedule>['weekdays'][number]],
            localStartTime: String(form.get('localStartTime')),
            localEndTime: String(form.get('localEndTime')),
            startsOn: String(form.get('startsOn')),
            endsOn: String(form.get('endsOn')),
          },
        } : {
          kind: 'event',
          eventType: String(form.get('eventType')) as typeof item.details.eventType,
          beginnerFriendly: form.get('beginnerFriendly') === 'on',
          registrationRequired: form.get('registrationRequired') === 'on',
          organizerIds: [String(form.get('organizerId')) as EditorOptions['actors'][number]['id']],
          occurrence: {
            placeId: String(form.get('placeId')) as EditorOptions['places'][number]['id'],
            startsAt: new Date(String(form.get('startsAt'))).getTime(),
            endsAt: new Date(String(form.get('endsAt'))).getTime(),
            status: String(form.get('occurrenceStatus')) as NonNullable<typeof item.details.occurrence>['status'],
          },
        },
      })
      setSaved(true)
    } catch (caught) { setError(errorMessage(caught)) }
  }

  return (
    <Card>
      <CardHeader><div className="flex justify-between gap-4"><div><CardTitle>{item.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{item.kind === 'class' ? 'Cours' : 'Événement'} · {item.status} · v{item.version}</p></div><Button size="icon-sm" variant="ghost" aria-label="Archiver" onClick={() => void archive({ listingId: item.id, expectedVersion: item.version })}><Trash2 /></Button></div></CardHeader>
      <CardContent>
        <details><summary className="cursor-pointer font-medium">Modifier la fiche et ses détails</summary>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" key={item.version} onSubmit={save}>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor={fieldId('title')}>Titre</Label><Input id={fieldId('title')} name="title" defaultValue={item.title} required /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor={fieldId('summary')}>Résumé</Label><Input id={fieldId('summary')} name="summary" defaultValue={item.summary} required /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor={fieldId('description')}>Description</Label><textarea id={fieldId('description')} name="description" defaultValue={item.description} required className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm" /></div>
            <div className="space-y-2"><Label htmlFor={fieldId('source')}>Source</Label><Input id={fieldId('source')} name="sourceUrl" type="url" defaultValue={item.sourceUrl} required /></div>
            <div className="space-y-2"><Label htmlFor={fieldId('status')}>Publication</Label><select id={fieldId('status')} name="status" defaultValue={item.status} className="h-9 w-full rounded-lg border bg-background px-3"><option value="draft">Brouillon</option><option value="published">Publié</option><option value="cancelled">Annulé</option><option value="archived">Archivé</option></select></div>
            {item.details.kind === 'class' ? <>
              <div className="space-y-2"><Label htmlFor={fieldId('season')}>Saison</Label><select id={fieldId('season')} name="seasonId" defaultValue={item.details.seasonId} className="h-9 w-full rounded-lg border bg-background px-3">{options.seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor={fieldId('level')}>Niveau</Label><select id={fieldId('level')} name="levelId" defaultValue={item.details.levelId} className="h-9 w-full rounded-lg border bg-background px-3">{options.levels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor={fieldId('registration')}>Inscriptions</Label><select id={fieldId('registration')} name="registrationStatus" defaultValue={item.details.registrationStatus} className="h-9 w-full rounded-lg border bg-background px-3"><option value="unknown">Inconnu</option><option value="open">Ouvertes</option><option value="waitlist">Liste d’attente</option><option value="closed">Fermées</option></select></div>
              <div className="space-y-2"><Label htmlFor={fieldId('price')}>Tarif résumé</Label><Input id={fieldId('price')} name="priceSummary" defaultValue={item.details.priceSummary} /></div>
              <div className="space-y-2"><Label htmlFor={fieldId('teacher')}>Enseignant</Label><select id={fieldId('teacher')} name="teacherId" defaultValue={item.details.teacherIds?.[0]} required className="h-9 w-full rounded-lg border bg-background px-3">{(options.actors ?? []).map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor={fieldId('place')}>Lieu</Label><select id={fieldId('place')} name="placeId" defaultValue={item.details.schedule?.placeId} required className="h-9 w-full rounded-lg border bg-background px-3">{(options.places ?? []).map((place) => <option key={place.id} value={place.id}>{place.name} · {place.city}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor={fieldId('weekday')}>Jour</Label><select id={fieldId('weekday')} name="weekday" defaultValue={item.details.schedule?.weekdays[0] ?? 'monday'} className="h-9 w-full rounded-lg border bg-background px-3"><option value="monday">Lundi</option><option value="tuesday">Mardi</option><option value="wednesday">Mercredi</option><option value="thursday">Jeudi</option><option value="friday">Vendredi</option><option value="saturday">Samedi</option><option value="sunday">Dimanche</option></select></div>
              <div className="space-y-2"><Label htmlFor={fieldId('start-time')}>Début du cours</Label><Input id={fieldId('start-time')} name="localStartTime" type="time" defaultValue={item.details.schedule?.localStartTime ?? '19:00'} required /></div>
              <div className="space-y-2"><Label htmlFor={fieldId('end-time')}>Fin du cours</Label><Input id={fieldId('end-time')} name="localEndTime" type="time" defaultValue={item.details.schedule?.localEndTime ?? '20:00'} required /></div>
              <div className="space-y-2"><Label htmlFor={fieldId('starts-on')}>Début de période</Label><Input id={fieldId('starts-on')} name="startsOn" type="date" defaultValue={item.details.schedule?.startsOn ?? '2026-09-01'} required /></div>
              <div className="space-y-2"><Label htmlFor={fieldId('ends-on')}>Fin de période</Label><Input id={fieldId('ends-on')} name="endsOn" type="date" defaultValue={item.details.schedule?.endsOn ?? '2027-06-30'} required /></div>
              <label className="flex items-center gap-2"><input name="trialAvailable" type="checkbox" defaultChecked={item.details.trialAvailable} /> Essai possible</label>
            </> : <>
              <div className="space-y-2"><Label htmlFor={fieldId('event-type')}>Type d’événement</Label><select id={fieldId('event-type')} name="eventType" defaultValue={item.details.eventType} className="h-9 w-full rounded-lg border bg-background px-3"><option value="social">Soirée</option><option value="practice">Pratique</option><option value="workshop">Stage</option><option value="festival">Festival</option><option value="competition">Compétition</option><option value="open_day">Portes ouvertes</option><option value="other">Autre</option></select></div>
              <div className="space-y-2"><Label htmlFor={fieldId('organizer')}>Organisateur</Label><select id={fieldId('organizer')} name="organizerId" defaultValue={item.details.organizerIds?.[0]} required className="h-9 w-full rounded-lg border bg-background px-3">{(options.actors ?? []).map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor={fieldId('place')}>Lieu</Label><select id={fieldId('place')} name="placeId" defaultValue={item.details.occurrence?.placeId} required className="h-9 w-full rounded-lg border bg-background px-3">{(options.places ?? []).map((place) => <option key={place.id} value={place.id}>{place.name} · {place.city}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor={fieldId('starts-at')}>Début</Label><Input id={fieldId('starts-at')} name="startsAt" type="datetime-local" defaultValue={toLocalDateTime(item.details.occurrence?.startsAt)} required /></div>
              <div className="space-y-2"><Label htmlFor={fieldId('ends-at')}>Fin</Label><Input id={fieldId('ends-at')} name="endsAt" type="datetime-local" defaultValue={toLocalDateTime(item.details.occurrence?.endsAt)} required /></div>
              <div className="space-y-2"><Label htmlFor={fieldId('occurrence-status')}>État de la date</Label><select id={fieldId('occurrence-status')} name="occurrenceStatus" defaultValue={item.details.occurrence?.status ?? 'scheduled'} className="h-9 w-full rounded-lg border bg-background px-3"><option value="scheduled">Confirmé</option><option value="confirmation_pending">À confirmer</option><option value="cancelled">Annulé</option><option value="completed">Terminé</option></select></div>
              <label className="flex items-center gap-2"><input name="beginnerFriendly" type="checkbox" defaultChecked={item.details.beginnerFriendly} /> Débutants bienvenus</label>
              <label className="flex items-center gap-2"><input name="registrationRequired" type="checkbox" defaultChecked={item.details.registrationRequired} /> Inscription requise</label>
            </>}
            {error ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p> : null}{saved ? <p role="status" className="text-sm text-primary">Modifications enregistrées.</p> : null}
            <Button className="sm:col-span-2" type="submit">Enregistrer</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  )
}

export function SignInPage() {
  useDocumentTitle('Se connecter')
  const { isAuthenticated } = useConvexAuth()
  const { signIn } = useAuthActions()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (isAuthenticated) return <Navigate replace to={searchParams.get('redirect') || routes.favorites} />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    const form = new FormData(event.currentTarget)
    try {
      await signIn('password', {
        flow: mode,
        email: String(form.get('email')),
        password: String(form.get('password')),
        ...(mode === 'signUp' ? { name: String(form.get('name')) } : {}),
      })
      navigate(searchParams.get('redirect') || routes.favorites, { replace: true })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <PageFrame title={mode === 'signIn' ? 'Se connecter' : 'Créer un compte'} description="Enregistrez vos favoris et accédez aux espaces autorisés pour votre rôle.">
      <form className="mx-auto grid max-w-md gap-5 rounded-xl border bg-card p-6" onSubmit={submit}>
        {mode === 'signUp' ? <div className="space-y-2"><Label htmlFor="name">Nom affiché</Label><Input id="name" name="name" required minLength={2} autoComplete="name" /></div> : null}
        <div className="space-y-2"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} /></div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button disabled={pending} type="submit">{pending ? 'Veuillez patienter…' : mode === 'signIn' ? 'Se connecter' : 'Créer mon compte'}</Button>
        <Button type="button" variant="ghost" onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
          {mode === 'signIn' ? 'Pas encore de compte ? S’inscrire' : 'Déjà un compte ? Se connecter'}
        </Button>
      </form>
    </PageFrame>
  )
}

export function FavoritesPage() {
  const { isAuthenticated } = useConvexAuth()
  const favorites = useQuery(api.favorites.listMine, isAuthenticated ? {} : 'skip')
  const toggle = useMutation(api.favorites.toggle)
  return (
    <Protected>
      <PageFrame title="Mes favoris" description="Vos cours et événements enregistrés sont synchronisés avec votre compte.">
        {favorites === undefined ? <p>Chargement…</p> : favorites.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground"><Heart className="mx-auto mb-3" /><p>Aucun favori pour le moment.</p><Button className="mt-4" render={<Link to={routes.classes} />}>Explorer les cours</Button></div>
        ) : <div className="grid gap-4 md:grid-cols-2">{favorites.map((item) => (
          <Card key={item.listingId}><CardHeader><CardTitle>{item.title}</CardTitle><p className="text-sm text-muted-foreground">{item.summary}</p></CardHeader><CardFooter className="justify-between"><Button size="sm" variant="ghost" onClick={() => void toggle({ listingId: item.listingId })}>Retirer</Button><Button size="sm" variant="outline" render={<a href={item.sourceUrl} target="_blank" rel="noreferrer" />}>Source <ExternalLink /></Button></CardFooter></Card>
        ))}</div>}
      </PageFrame>
    </Protected>
  )
}

export function ContributionPage() {
  const { isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip')
  const listings = useQuery(api.contributions.listMine, me?.role === 'contributor' || me?.role === 'administrator' ? {} : 'skip')
  const options = useQuery(api.contributions.editorOptions, me?.role === 'contributor' || me?.role === 'administrator' ? {} : 'skip')
  const createDraft = useMutation(api.contributions.createDraft)
  const [error, setError] = useState('')
  const [newKind, setNewKind] = useState<'class' | 'event'>('class')

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await createDraft({
        kind: newKind,
        title: String(form.get('title')),
        summary: String(form.get('summary')),
        description: String(form.get('description')),
        sourceUrl: String(form.get('sourceUrl')),
        details: newKind === 'class' ? {
          kind: 'class',
          seasonId: String(form.get('seasonId')) as NonNullable<typeof options>['seasons'][number]['id'],
          levelId: String(form.get('levelId')) as NonNullable<typeof options>['levels'][number]['id'],
          trialAvailable: form.get('trialAvailable') === 'on',
          registrationStatus: String(form.get('registrationStatus')) as 'unknown' | 'open' | 'waitlist' | 'closed',
          priceSummary: String(form.get('priceSummary') || ''),
          teacherIds: [String(form.get('teacherId')) as NonNullable<typeof options>['actors'][number]['id']],
          schedule: {
            placeId: String(form.get('placeId')) as NonNullable<typeof options>['places'][number]['id'],
            weekdays: [String(form.get('weekday')) as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'],
            localStartTime: String(form.get('localStartTime')),
            localEndTime: String(form.get('localEndTime')),
            startsOn: String(form.get('startsOn')),
            endsOn: String(form.get('endsOn')),
          },
        } : {
          kind: 'event',
          eventType: String(form.get('eventType')) as 'social' | 'practice' | 'workshop' | 'festival' | 'competition' | 'open_day' | 'other',
          beginnerFriendly: form.get('beginnerFriendly') === 'on',
          registrationRequired: form.get('registrationRequired') === 'on',
          organizerIds: [String(form.get('organizerId')) as NonNullable<typeof options>['actors'][number]['id']],
          occurrence: {
            placeId: String(form.get('placeId')) as NonNullable<typeof options>['places'][number]['id'],
            startsAt: new Date(String(form.get('startsAt'))).getTime(),
            endsAt: new Date(String(form.get('endsAt'))).getTime(),
            status: String(form.get('occurrenceStatus')) as 'scheduled' | 'confirmation_pending' | 'cancelled' | 'completed',
          },
        },
      })
      formElement.reset()
    } catch (caught) { setError(errorMessage(caught)) }
  }

  return (
    <Protected>
      <PageFrame title="Contribution" description="Créez et maintenez uniquement les fiches placées sous votre responsabilité.">
        {me && me.role === 'user' ? <div className="rounded-xl border border-dashed p-8 text-center"><p>Votre compte n’a pas encore le rôle contributeur.</p><p className="mt-2 text-sm text-muted-foreground">Un administrateur peut vous l’attribuer après validation.</p></div> : (
          <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
            <form className="grid h-fit gap-4 rounded-xl border bg-card p-5" onSubmit={create}>
              <h2 className="font-semibold">Nouvelle fiche brouillon</h2>
              <div className="space-y-2"><Label htmlFor="kind">Type</Label><select id="kind" name="kind" className="h-9 rounded-lg border bg-background px-3" value={newKind} onChange={(event) => setNewKind(event.target.value as 'class' | 'event')}><option value="class">Cours</option><option value="event">Événement</option></select></div>
              <div className="space-y-2"><Label htmlFor="title">Titre</Label><Input id="title" name="title" required minLength={3} /></div>
              <div className="space-y-2"><Label htmlFor="summary">Résumé</Label><Input id="summary" name="summary" required /></div>
              <div className="space-y-2"><Label htmlFor="description">Description</Label><textarea id="description" name="description" required className="min-h-24 rounded-lg border bg-background p-3 text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="sourceUrl">Source</Label><Input id="sourceUrl" name="sourceUrl" type="url" required /></div>
              {newKind === 'class' ? <>
                <div className="space-y-2"><Label htmlFor="new-season">Saison</Label><select id="new-season" name="seasonId" required className="h-9 rounded-lg border bg-background px-3">{options?.seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="new-level">Niveau</Label><select id="new-level" name="levelId" required className="h-9 rounded-lg border bg-background px-3">{options?.levels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="new-registration">Inscriptions</Label><select id="new-registration" name="registrationStatus" className="h-9 rounded-lg border bg-background px-3"><option value="unknown">Inconnu</option><option value="open">Ouvertes</option><option value="waitlist">Liste d’attente</option><option value="closed">Fermées</option></select></div>
                <div className="space-y-2"><Label htmlFor="new-price">Tarif résumé</Label><Input id="new-price" name="priceSummary" /></div>
                <div className="space-y-2"><Label htmlFor="new-teacher">Enseignant</Label><select id="new-teacher" name="teacherId" required className="h-9 rounded-lg border bg-background px-3">{(options?.actors ?? []).map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="new-class-place">Lieu</Label><select id="new-class-place" name="placeId" required className="h-9 rounded-lg border bg-background px-3">{(options?.places ?? []).map((place) => <option key={place.id} value={place.id}>{place.name} · {place.city}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="new-weekday">Jour</Label><select id="new-weekday" name="weekday" className="h-9 rounded-lg border bg-background px-3"><option value="monday">Lundi</option><option value="tuesday">Mardi</option><option value="wednesday">Mercredi</option><option value="thursday">Jeudi</option><option value="friday">Vendredi</option><option value="saturday">Samedi</option><option value="sunday">Dimanche</option></select></div>
                <div className="space-y-2"><Label htmlFor="new-start-time">Début du cours</Label><Input id="new-start-time" name="localStartTime" type="time" defaultValue="19:00" required /></div>
                <div className="space-y-2"><Label htmlFor="new-end-time">Fin du cours</Label><Input id="new-end-time" name="localEndTime" type="time" defaultValue="20:00" required /></div>
                <div className="space-y-2"><Label htmlFor="new-starts-on">Début de période</Label><Input id="new-starts-on" name="startsOn" type="date" defaultValue="2026-09-01" required /></div>
                <div className="space-y-2"><Label htmlFor="new-ends-on">Fin de période</Label><Input id="new-ends-on" name="endsOn" type="date" defaultValue="2027-06-30" required /></div>
                <label className="flex items-center gap-2"><input name="trialAvailable" type="checkbox" /> Essai possible</label>
              </> : <>
                <div className="space-y-2"><Label htmlFor="new-event-type">Type d’événement</Label><select id="new-event-type" name="eventType" className="h-9 rounded-lg border bg-background px-3"><option value="social">Soirée</option><option value="practice">Pratique</option><option value="workshop">Stage</option><option value="festival">Festival</option><option value="competition">Compétition</option><option value="open_day">Portes ouvertes</option><option value="other">Autre</option></select></div>
                <div className="space-y-2"><Label htmlFor="new-organizer">Organisateur</Label><select id="new-organizer" name="organizerId" required className="h-9 rounded-lg border bg-background px-3">{(options?.actors ?? []).map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="new-event-place">Lieu</Label><select id="new-event-place" name="placeId" required className="h-9 rounded-lg border bg-background px-3">{(options?.places ?? []).map((place) => <option key={place.id} value={place.id}>{place.name} · {place.city}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="new-starts-at">Début</Label><Input id="new-starts-at" name="startsAt" type="datetime-local" required /></div>
                <div className="space-y-2"><Label htmlFor="new-ends-at">Fin</Label><Input id="new-ends-at" name="endsAt" type="datetime-local" required /></div>
                <div className="space-y-2"><Label htmlFor="new-occurrence-status">État de la date</Label><select id="new-occurrence-status" name="occurrenceStatus" className="h-9 rounded-lg border bg-background px-3"><option value="scheduled">Confirmé</option><option value="confirmation_pending">À confirmer</option><option value="cancelled">Annulé</option></select></div>
                <label className="flex items-center gap-2"><input name="beginnerFriendly" type="checkbox" /> Débutants bienvenus</label>
                <label className="flex items-center gap-2"><input name="registrationRequired" type="checkbox" /> Inscription requise</label>
              </>}
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<Button type="submit">Créer le brouillon</Button>
            </form>
            <div className="space-y-4"><h2 className="text-lg font-semibold">Mes fiches</h2>{listings === undefined || options === undefined ? <p>Chargement…</p> : listings.length === 0 ? <p className="text-muted-foreground">Aucune fiche.</p> : listings.map((item) => <OwnedListingEditor item={item} options={options} key={item.id} />)}</div>
          </div>
        )}
      </PageFrame>
    </Protected>
  )
}

export function AdministrationPage() {
  const { isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip')
  const users = useQuery(api.administration.listUsers, me?.role === 'administrator' ? {} : 'skip')
  const listings = useQuery(api.administration.listListings, me?.role === 'administrator' ? {} : 'skip')
  const setRole = useMutation(api.administration.setRole)
  const setStatus = useMutation(api.administration.setStatus)
  return (
    <Protected>
      <PageFrame title="Administration" description="Attribuez les rôles et contrôlez l’état des comptes depuis une vue globale protégée.">
        {me && me.role !== 'administrator' ? <div className="rounded-xl border border-dashed p-8 text-center"><ShieldCheck className="mx-auto mb-3" /><p>Accès réservé aux administrateurs.</p></div> : users === undefined ? <p>Chargement…</p> : (
          <div className="space-y-8"><div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Compte</th><th className="p-3">Rôle</th><th className="p-3">État</th></tr></thead><tbody>{users.map((user) => <tr className="border-t" key={user.id}><td className="p-3"><p className="font-medium">{user.displayName || 'Sans nom'}</p><p className="text-muted-foreground">{user.email}</p></td><td className="p-3"><select aria-label={`Rôle de ${user.displayName}`} className="h-9 rounded-lg border bg-background px-2" value={user.role} disabled={user.id === me?.id} onChange={(event) => void setRole({ userId: user.id, role: event.target.value as typeof user.role })}><option value="user">Membre</option><option value="contributor">Contributeur</option><option value="administrator">Administrateur</option></select></td><td className="p-3"><select aria-label={`État de ${user.displayName}`} className="h-9 rounded-lg border bg-background px-2" value={user.status} disabled={user.id === me?.id} onChange={(event) => void setStatus({ userId: user.id, status: event.target.value as typeof user.status })}><option value="active">Actif</option><option value="suspended">Suspendu</option><option value="deleted">Supprimé</option></select></td></tr>)}</tbody></table></div><div><h2 className="mb-3 text-lg font-semibold">Toutes les fiches ({listings?.length ?? 0})</h2><div className="grid gap-2">{listings?.map((listing) => <div className="flex justify-between rounded-lg border p-3 text-sm" key={listing.id}><span>{listing.title}</span><span className="text-muted-foreground">{listing.kind} · {listing.status} · v{listing.version}</span></div>)}</div></div></div>
        )}
      </PageFrame>
    </Protected>
  )
}

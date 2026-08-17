import { useState } from 'react'
import type { FormEvent } from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { CalendarDays, GraduationCap, MapPin, Pencil, Plus, UserRound } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageIntro } from '@/components/page-intro'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { routes } from '@/routing/routes'

type Listing = FunctionReturnType<typeof api.contributions.listMine>[number]
type Options = FunctionReturnType<typeof api.contributions.editorOptions>
type References = FunctionReturnType<typeof api.references.listMine>
type Place = References['places'][number]
type Actor = References['actors'][number]
type ItemType = 'class' | 'event' | 'place' | 'actor'
type ModalState = { mode: 'create'; type: ItemType } | { mode: 'edit'; type: ItemType; id: string }

const tabMeta = {
  class: { label: 'Cours', singular: 'cours', createLabel: 'Créer le cours', deleteLabel: 'ce cours', icon: GraduationCap },
  event: { label: 'Événements', singular: 'événement', createLabel: 'Créer l’événement', deleteLabel: 'cet événement', icon: CalendarDays },
  place: { label: 'Lieux', singular: 'lieu', createLabel: 'Créer le lieu', deleteLabel: 'ce lieu', icon: MapPin },
  actor: { label: 'Intervenants', singular: 'intervenant', createLabel: 'Créer l’intervenant', deleteLabel: 'cet intervenant', icon: UserRound },
} as const

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.replace(/^.*?Uncaught Error: /, '') : 'Une erreur est survenue.'
}

function toLocalDateTime(value: number | undefined) {
  if (value === undefined) return ''
  const date = new Date(value)
  return new Date(value - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function Field({ id, label, children, className = '' }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label htmlFor={id}>{label}</Label>{children}</div>
}

function DeleteSection({ label, onDelete }: { label: string; onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  return <div className="mt-7 border-t pt-5">{confirming ? <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4"><p className="font-medium">Supprimer {label} ?</p><p className="mt-1 text-sm text-muted-foreground">Cette action l’archive et le retire des listes. Elle est refusée si une fiche active l’utilise.</p><div className="mt-4 flex gap-2"><Button variant="destructive" onClick={() => void onDelete().catch((caught) => setError(errorMessage(caught)))}>Confirmer la suppression</Button><Button variant="outline" onClick={() => setConfirming(false)}>Annuler</Button></div>{error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}</div> : <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>Supprimer</Button>}</div>
}

function ListingForm({ type, item, options, onDone }: { type: 'class' | 'event'; item?: Listing; options: Options; onDone: () => void }) {
  const create = useMutation(api.contributions.createDraft)
  const update = useMutation(api.contributions.updateOwn)
  const archive = useMutation(api.contributions.archiveOwn)
  const [error, setError] = useState('')
  const details = item?.details.kind === type ? item.details : undefined
  const prefix = `${type}-${item?.id ?? 'new'}`

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    const form = new FormData(event.currentTarget)
    const common = { title: String(form.get('title')), summary: String(form.get('summary')), description: String(form.get('description')), sourceUrl: String(form.get('sourceUrl')) }
    const typedDetails = type === 'class' ? {
      kind: 'class' as const,
      seasonId: String(form.get('seasonId')) as Options['seasons'][number]['id'],
      levelId: String(form.get('levelId')) as Options['levels'][number]['id'],
      trialAvailable: form.get('trialAvailable') === 'on',
      registrationStatus: String(form.get('registrationStatus')) as 'unknown' | 'open' | 'waitlist' | 'closed',
      priceSummary: String(form.get('priceSummary') || ''),
      teacherIds: [String(form.get('teacherId')) as Options['actors'][number]['id']],
      schedule: { placeId: String(form.get('placeId')) as Options['places'][number]['id'], weekdays: [String(form.get('weekday')) as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'], localStartTime: String(form.get('localStartTime')), localEndTime: String(form.get('localEndTime')), startsOn: String(form.get('startsOn')), endsOn: String(form.get('endsOn')) },
    } : {
      kind: 'event' as const,
      eventType: String(form.get('eventType')) as 'social' | 'practice' | 'workshop' | 'festival' | 'competition' | 'open_day' | 'other',
      beginnerFriendly: form.get('beginnerFriendly') === 'on',
      registrationRequired: form.get('registrationRequired') === 'on',
      organizerIds: [String(form.get('organizerId')) as Options['actors'][number]['id']],
      occurrence: { placeId: String(form.get('placeId')) as Options['places'][number]['id'], startsAt: new Date(String(form.get('startsAt'))).getTime(), endsAt: new Date(String(form.get('endsAt'))).getTime(), status: String(form.get('occurrenceStatus')) as 'scheduled' | 'confirmation_pending' | 'cancelled' | 'completed' },
    }
    try {
      if (item === undefined) await create({ kind: type, ...common, details: typedDetails })
      else await update({ listingId: item.id, expectedVersion: item.version, ...common, status: String(form.get('status')) as Listing['status'], details: typedDetails })
      onDone()
    } catch (caught) { setError(errorMessage(caught)) }
  }

  return <form className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2" onSubmit={submit}>
    <Field id={`${prefix}-title`} label="Titre" className="sm:col-span-2"><Input id={`${prefix}-title`} name="title" defaultValue={item?.title} required /></Field>
    <Field id={`${prefix}-summary`} label="Résumé" className="sm:col-span-2"><Input id={`${prefix}-summary`} name="summary" defaultValue={item?.summary} required /></Field>
    <Field id={`${prefix}-description`} label="Description" className="sm:col-span-2"><textarea id={`${prefix}-description`} name="description" defaultValue={item?.description} required className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm" /></Field>
    <Field id={`${prefix}-source`} label="Source"><Input id={`${prefix}-source`} name="sourceUrl" type="url" defaultValue={item?.sourceUrl} required /></Field>
    {item ? <Field id={`${prefix}-status`} label="Publication"><select id={`${prefix}-status`} name="status" defaultValue={item.status} className="h-9 w-full rounded-lg border bg-background px-3"><option value="draft">Brouillon</option><option value="published">Publié</option><option value="cancelled">Annulé</option><option value="archived">Archivé</option></select></Field> : null}
    {type === 'class' ? <>
      <Field id={`${prefix}-season`} label="Saison"><select id={`${prefix}-season`} name="seasonId" defaultValue={details?.kind === 'class' ? details.seasonId : undefined} className="h-9 w-full rounded-lg border bg-background px-3">{options.seasons.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}</select></Field>
      <Field id={`${prefix}-level`} label="Niveau"><select id={`${prefix}-level`} name="levelId" defaultValue={details?.kind === 'class' ? details.levelId : undefined} className="h-9 w-full rounded-lg border bg-background px-3">{options.levels.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}</select></Field>
      <Field id={`${prefix}-teacher`} label="Enseignant"><select id={`${prefix}-teacher`} name="teacherId" defaultValue={details?.kind === 'class' ? details.teacherIds[0] : undefined} className="h-9 w-full rounded-lg border bg-background px-3">{options.actors.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></Field>
      <Field id={`${prefix}-place`} label="Lieu"><select id={`${prefix}-place`} name="placeId" defaultValue={details?.kind === 'class' ? details.schedule?.placeId : undefined} className="h-9 w-full rounded-lg border bg-background px-3">{options.places.map((value) => <option key={value.id} value={value.id}>{value.name} · {value.city}</option>)}</select></Field>
      <Field id={`${prefix}-weekday`} label="Jour"><select id={`${prefix}-weekday`} name="weekday" defaultValue={details?.kind === 'class' ? details.schedule?.weekdays[0] : 'monday'} className="h-9 w-full rounded-lg border bg-background px-3"><option value="monday">Lundi</option><option value="tuesday">Mardi</option><option value="wednesday">Mercredi</option><option value="thursday">Jeudi</option><option value="friday">Vendredi</option><option value="saturday">Samedi</option><option value="sunday">Dimanche</option></select></Field>
      <Field id={`${prefix}-registration`} label="Inscriptions"><select id={`${prefix}-registration`} name="registrationStatus" defaultValue={details?.kind === 'class' ? details.registrationStatus : 'unknown'} className="h-9 w-full rounded-lg border bg-background px-3"><option value="unknown">Inconnu</option><option value="open">Ouvertes</option><option value="waitlist">Liste d’attente</option><option value="closed">Fermées</option></select></Field>
      <Field id={`${prefix}-start-time`} label="Début"><Input id={`${prefix}-start-time`} name="localStartTime" type="time" defaultValue={details?.kind === 'class' ? details.schedule?.localStartTime : '19:00'} required /></Field>
      <Field id={`${prefix}-end-time`} label="Fin"><Input id={`${prefix}-end-time`} name="localEndTime" type="time" defaultValue={details?.kind === 'class' ? details.schedule?.localEndTime : '20:00'} required /></Field>
      <Field id={`${prefix}-starts-on`} label="Début de période"><Input id={`${prefix}-starts-on`} name="startsOn" type="date" defaultValue={details?.kind === 'class' ? details.schedule?.startsOn : '2026-09-01'} required /></Field>
      <Field id={`${prefix}-ends-on`} label="Fin de période"><Input id={`${prefix}-ends-on`} name="endsOn" type="date" defaultValue={details?.kind === 'class' ? details.schedule?.endsOn : '2027-06-30'} required /></Field>
      <Field id={`${prefix}-price`} label="Tarif résumé"><Input id={`${prefix}-price`} name="priceSummary" defaultValue={details?.kind === 'class' ? details.priceSummary : ''} /></Field>
      <label className="flex items-center gap-2 self-end py-2"><input name="trialAvailable" type="checkbox" defaultChecked={details?.kind === 'class' ? details.trialAvailable : false} /> Essai possible</label>
    </> : <>
      <Field id={`${prefix}-event-type`} label="Type d’événement"><select id={`${prefix}-event-type`} name="eventType" defaultValue={details?.kind === 'event' ? details.eventType : 'social'} className="h-9 w-full rounded-lg border bg-background px-3"><option value="social">Soirée</option><option value="practice">Pratique</option><option value="workshop">Stage</option><option value="festival">Festival</option><option value="competition">Compétition</option><option value="open_day">Portes ouvertes</option><option value="other">Autre</option></select></Field>
      <Field id={`${prefix}-organizer`} label="Organisateur"><select id={`${prefix}-organizer`} name="organizerId" defaultValue={details?.kind === 'event' ? details.organizerIds[0] : undefined} className="h-9 w-full rounded-lg border bg-background px-3">{options.actors.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></Field>
      <Field id={`${prefix}-place`} label="Lieu"><select id={`${prefix}-place`} name="placeId" defaultValue={details?.kind === 'event' ? details.occurrence?.placeId : undefined} className="h-9 w-full rounded-lg border bg-background px-3">{options.places.map((value) => <option key={value.id} value={value.id}>{value.name} · {value.city}</option>)}</select></Field>
      <Field id={`${prefix}-occurrence-status`} label="État de la date"><select id={`${prefix}-occurrence-status`} name="occurrenceStatus" defaultValue={details?.kind === 'event' ? details.occurrence?.status : 'scheduled'} className="h-9 w-full rounded-lg border bg-background px-3"><option value="scheduled">Confirmé</option><option value="confirmation_pending">À confirmer</option><option value="cancelled">Annulé</option><option value="completed">Terminé</option></select></Field>
      <Field id={`${prefix}-starts-at`} label="Début"><Input id={`${prefix}-starts-at`} name="startsAt" type="datetime-local" defaultValue={details?.kind === 'event' ? toLocalDateTime(details.occurrence?.startsAt) : ''} required /></Field>
      <Field id={`${prefix}-ends-at`} label="Fin"><Input id={`${prefix}-ends-at`} name="endsAt" type="datetime-local" defaultValue={details?.kind === 'event' ? toLocalDateTime(details.occurrence?.endsAt) : ''} required /></Field>
      <label className="flex items-center gap-2"><input name="beginnerFriendly" type="checkbox" defaultChecked={details?.kind === 'event' ? details.beginnerFriendly : false} /> Débutants bienvenus</label>
      <label className="flex items-center gap-2"><input name="registrationRequired" type="checkbox" defaultChecked={details?.kind === 'event' ? details.registrationRequired : false} /> Inscription requise</label>
    </>}
    {error ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
    <div className="sm:col-span-2"><Button type="submit">{item ? 'Enregistrer les modifications' : tabMeta[type].createLabel}</Button>{item ? <DeleteSection label={tabMeta[type].deleteLabel} onDelete={async () => { await archive({ listingId: item.id, expectedVersion: item.version }); onDone() }} /> : null}</div>
  </form>
}

function PlaceForm({ item, onDone }: { item?: Place; onDone: () => void }) {
  const create = useMutation(api.references.createPlace); const update = useMutation(api.references.updatePlace); const archive = useMutation(api.references.archivePlace)
  const [error, setError] = useState(''); const prefix = `place-${item?.id ?? 'new'}`
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const value = { name: String(form.get('name')), addressLine1: String(form.get('addressLine1')), addressLine2: String(form.get('addressLine2') || '') || undefined, postalCode: String(form.get('postalCode')), city: String(form.get('city')), countryCode: String(form.get('countryCode')), latitude: Number(form.get('latitude')), longitude: Number(form.get('longitude')), transportNotes: String(form.get('transportNotes') || '') || undefined, accessibilityNotes: String(form.get('accessibilityNotes') || '') || undefined }; try { if (item) await update({ placeId: item.id, ...value }); else await create(value); onDone() } catch (caught) { setError(errorMessage(caught)) } }
  return <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}><Field id={`${prefix}-name`} label="Nom" className="sm:col-span-2"><Input id={`${prefix}-name`} name="name" defaultValue={item?.name} required /></Field><Field id={`${prefix}-address`} label="Adresse"><Input id={`${prefix}-address`} name="addressLine1" defaultValue={item?.addressLine1} required /></Field><Field id={`${prefix}-address2`} label="Complément"><Input id={`${prefix}-address2`} name="addressLine2" defaultValue={item?.addressLine2} /></Field><Field id={`${prefix}-postal`} label="Code postal"><Input id={`${prefix}-postal`} name="postalCode" defaultValue={item?.postalCode ?? '34000'} required /></Field><Field id={`${prefix}-city`} label="Ville"><Input id={`${prefix}-city`} name="city" defaultValue={item?.city ?? 'Montpellier'} required /></Field><Field id={`${prefix}-country`} label="Pays"><Input id={`${prefix}-country`} name="countryCode" defaultValue={item?.countryCode ?? 'FR'} required maxLength={2} /></Field><Field id={`${prefix}-lat`} label="Latitude"><Input id={`${prefix}-lat`} name="latitude" type="number" step="any" defaultValue={item?.latitude ?? 43.6108} required /></Field><Field id={`${prefix}-lng`} label="Longitude"><Input id={`${prefix}-lng`} name="longitude" type="number" step="any" defaultValue={item?.longitude ?? 3.8767} required /></Field><Field id={`${prefix}-transport`} label="Accès / transports" className="sm:col-span-2"><Input id={`${prefix}-transport`} name="transportNotes" defaultValue={item?.transportNotes} /></Field><Field id={`${prefix}-accessibility`} label="Accessibilité" className="sm:col-span-2"><Input id={`${prefix}-accessibility`} name="accessibilityNotes" defaultValue={item?.accessibilityNotes} /></Field>{error ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p> : null}<div className="sm:col-span-2"><Button type="submit">{item ? 'Enregistrer les modifications' : 'Créer le lieu'}</Button>{item ? <DeleteSection label="ce lieu" onDelete={async () => { await archive({ placeId: item.id }); onDone() }} /> : null}</div></form>
}

function ActorForm({ item, onDone }: { item?: Actor; onDone: () => void }) {
  const create = useMutation(api.references.createActor); const update = useMutation(api.references.updateActor); const archive = useMutation(api.references.archiveActor)
  const [error, setError] = useState(''); const prefix = `actor-${item?.id ?? 'new'}`
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const value = { name: String(form.get('name')), summary: String(form.get('summary')), websiteUrl: String(form.get('websiteUrl') || '') || undefined, contactUrl: String(form.get('contactUrl') || '') || undefined }; try { if (item) await update({ actorId: item.id, ...value }); else await create(value); onDone() } catch (caught) { setError(errorMessage(caught)) } }
  return <form className="grid gap-4" onSubmit={submit}><Field id={`${prefix}-name`} label="Nom"><Input id={`${prefix}-name`} name="name" defaultValue={item?.name} required /></Field><Field id={`${prefix}-summary`} label="Présentation"><textarea id={`${prefix}-summary`} name="summary" defaultValue={item?.summary} required className="min-h-28 w-full rounded-lg border bg-background p-3 text-sm" /></Field><Field id={`${prefix}-website`} label="Site web"><Input id={`${prefix}-website`} name="websiteUrl" type="url" defaultValue={item?.websiteUrl} /></Field><Field id={`${prefix}-contact`} label="Lien de contact"><Input id={`${prefix}-contact`} name="contactUrl" type="url" defaultValue={item?.contactUrl} /></Field>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<div><Button type="submit">{item ? 'Enregistrer les modifications' : 'Créer l’intervenant'}</Button>{item ? <DeleteSection label="cet intervenant" onDelete={async () => { await archive({ actorId: item.id }); onDone() }} /> : null}</div></form>
}

function ItemCard({ title, meta, summary, onEdit }: { title: string; meta: string; summary?: string; onEdit: () => void }) {
  return <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{title}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{meta}</p></div><Button size="sm" variant="outline" onClick={onEdit}><Pencil /> Modifier</Button></div></CardHeader>{summary ? <CardContent><p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p></CardContent> : null}</Card>
}

export function ContributionPage() {
  useDocumentTitle('Contribution')
  const { isAuthenticated, isLoading } = useConvexAuth(); const location = useLocation()
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip')
  const allowed = me?.role === 'contributor' || me?.role === 'administrator'
  const listings = useQuery(api.contributions.listMine, allowed ? {} : 'skip')
  const options = useQuery(api.contributions.editorOptions, allowed ? {} : 'skip')
  const references = useQuery(api.references.listMine, allowed ? {} : 'skip')
  const [activeType, setActiveType] = useState<ItemType>('class'); const [modal, setModal] = useState<ModalState | null>(null)
  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Vérification de la session…</p>
  if (!isAuthenticated) return <Navigate replace to={`${routes.signIn}?redirect=${encodeURIComponent(location.pathname)}`} />
  const close = () => setModal(null)
  const modalKey = modal === null ? 'closed' : `${modal.mode}-${modal.mode === 'edit' ? modal.id : 'new'}`
  const selectedListing = modal?.mode === 'edit' && (modal.type === 'class' || modal.type === 'event') ? listings?.find((item) => item.id === modal.id) : undefined
  const selectedPlace = modal?.mode === 'edit' && modal.type === 'place' ? references?.places.find((item) => item.id === modal.id) : undefined
  const selectedActor = modal?.mode === 'edit' && modal.type === 'actor' ? references?.actors.find((item) => item.id === modal.id) : undefined
  const currentItems = activeType === 'class' || activeType === 'event' ? listings?.filter((item) => item.kind === activeType) : activeType === 'place' ? references?.places : references?.actors
  return <section className="mx-auto max-w-7xl space-y-8 px-4 py-14 sm:px-6"><PageIntro eyebrow="Espace personnel" title="Contribution" description="Gérez vos cours, événements et références partagées depuis un espace unique." />
    {me?.role === 'user' ? <div className="rounded-xl border border-dashed p-8 text-center">Votre compte n’a pas encore le rôle contributeur.</div> : <Tabs value={activeType} onValueChange={(value) => setActiveType(value as ItemType)}><TabsList className="max-w-full overflow-x-auto" variant="line">{(Object.keys(tabMeta) as ItemType[]).map((type) => { const Icon = tabMeta[type].icon; return <TabsTrigger key={type} value={type}><Icon /> {tabMeta[type].label}</TabsTrigger> })}</TabsList>
      <div className="mt-6"><div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">{tabMeta[activeType].label}</h2><p className="text-sm text-muted-foreground">{currentItems?.length ?? 0} élément(s) sous votre gestion</p></div><Button onClick={() => setModal({ mode: 'create', type: activeType })}><Plus /> Créer</Button></div>
        {currentItems === undefined ? <p>Chargement…</p> : currentItems.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Aucun élément. Utilisez « Créer » pour commencer.</div> : <div className="grid gap-4 md:grid-cols-2">{activeType === 'class' || activeType === 'event' ? (currentItems as Listing[]).map((item) => <ItemCard key={item.id} title={item.title} meta={`${item.status} · version ${item.version}`} summary={item.summary} onEdit={() => setModal({ mode: 'edit', type: activeType, id: item.id })} />) : activeType === 'place' ? (currentItems as Place[]).map((item) => <ItemCard key={item.id} title={item.name} meta={`${item.postalCode} ${item.city} · ${item.status}`} summary={item.addressLine1} onEdit={() => setModal({ mode: 'edit', type: 'place', id: item.id })} />) : (currentItems as Actor[]).map((item) => <ItemCard key={item.id} title={item.name} meta={item.status} summary={item.summary} onEdit={() => setModal({ mode: 'edit', type: 'actor', id: item.id })} />)}</div>}
      </div></Tabs>}
    {modal && options && references ? <Dialog open title={`${modal.mode === 'create' ? 'Créer' : 'Modifier'} ${tabMeta[modal.type].singular}`} description="Les modifications sont enregistrées dans la référence communautaire." onOpenChange={(open) => { if (!open) close() }}>{modal.type === 'class' || modal.type === 'event' ? <ListingForm key={modalKey} type={modal.type} item={selectedListing} options={options} onDone={close} /> : modal.type === 'place' ? <PlaceForm key={modalKey} item={selectedPlace} onDone={close} /> : <ActorForm key={modalKey} item={selectedActor} onDone={close} />}</Dialog> : null}
  </section>
}

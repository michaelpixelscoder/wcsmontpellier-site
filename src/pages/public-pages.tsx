import { lazy, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { CalendarDays, ListFilter, Search } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { CourseCard } from '@/components/course-card'
import { DemoDataNotice } from '@/components/demo-data-notice'
import { EventCard } from '@/components/event-card'
import { LoadingState } from '@/components/loading-state'
import type { MapLocation } from '@/components/maps/listing-map'
import { PageIntro } from '@/components/page-intro'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate } from '@/lib/format'

const ListingMap = lazy(() =>
  import('@/components/maps/listing-map').then((module) => ({ default: module.ListingMap })),
)

type PublicPageProps = {
  title: string
  description: string
  eyebrow: string
  children?: React.ReactNode
}

type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type EventType = 'social' | 'practice' | 'workshop' | 'festival' | 'competition' | 'open_day' | 'other'

const weekdayOptions: Array<{ value: Weekday; label: string }> = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
]

const eventTypeOptions: Array<{ value: EventType; label: string }> = [
  { value: 'social', label: 'Soirée' },
  { value: 'practice', label: 'Pratique' },
  { value: 'workshop', label: 'Stage' },
  { value: 'festival', label: 'Festival' },
  { value: 'open_day', label: 'Portes ouvertes' },
]

function PublicPage({ title, description, eyebrow, children }: PublicPageProps) {
  useDocumentTitle(title)
  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6">
      <PageIntro eyebrow={eyebrow} title={title} description={description} />
      {children}
    </section>
  )
}

export function DiscoverPage() {
  return <PublicPage eyebrow="Découvrir" title="Qu’est-ce que le West Coast Swing ?" description="Une présentation accessible de la danse, de la musique et d’une première soirée." />
}

export function StartPage() {
  return <PublicPage eyebrow="Débuter" title="Votre première étape" description="Initiation, cours d’essai ou cursus annuel : trouvez le format qui vous correspond." />
}

export function ClassesPage() {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [weekday, setWeekday] = useState<Weekday | ''>('')
  const deferredSearch = useDeferredValue(search.trim())
  const queryArgs = {
    ...(deferredSearch ? { search: deferredSearch } : {}),
    ...(level ? { level } : {}),
    ...(weekday ? { weekday } : {}),
  }
  const courses = useQuery(api.classes.listPublished, queryArgs)
  const mapLocations = useMemo(() => {
    const locations = new Map<string, MapLocation>()
    for (const course of courses ?? []) {
      for (const schedule of course.schedules) {
        locations.set(`${course.id}:${schedule.place.id}`, {
          id: `${course.id}:${schedule.place.id}`,
          latitude: schedule.place.latitude,
          longitude: schedule.place.longitude,
          title: course.title,
          detail: `${schedule.place.name} · ${schedule.startTime}`,
        })
      }
    }
    return [...locations.values()]
  }, [courses])

  return (
    <PublicPage eyebrow="Cours" title="Planifier ses cours" description="Comparez les niveaux, créneaux, enseignants et lieux à partir de données sourcées.">
      <DemoDataNotice />
      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-3 lg:col-span-1">
          <Label htmlFor="course-search">Rechercher</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="course-search" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cours, enseignant, lieu…" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="course-level">Niveau</Label>
          <select id="course-level" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="">Tous les niveaux</option>
            <option value="initiation">Initiation</option>
            <option value="fondamentaux">Fondamentaux</option>
            <option value="intermediaire">Intermédiaire</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="course-weekday">Jour</Label>
          <select id="course-weekday" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" value={weekday} onChange={(event) => setWeekday(event.target.value as Weekday | '')}>
            <option value="">Tous les jours</option>
            {weekdayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      {courses === undefined ? (
        <LoadingState label="Chargement des cours…" />
      ) : courses.length === 0 ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-dashed text-center text-muted-foreground">
          <div><ListFilter className="mx-auto mb-3 size-6" /><p>Aucun cours ne correspond à ces filtres.</p></div>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            {courses.map((course) => <CourseCard course={course} key={course.id} />)}
          </div>
          <div className="xl:sticky xl:top-24 xl:self-start">
            <Suspense fallback={<LoadingState label="Chargement de la carte…" />}>
              <ListingMap locations={mapLocations} />
            </Suspense>
          </div>
        </div>
      )}
    </PublicPage>
  )
}

export function AgendaPage() {
  const [now] = useState(() => Date.now())
  const [eventType, setEventType] = useState<EventType | ''>('')
  const [beginnerOnly, setBeginnerOnly] = useState(false)
  const events = useQuery(api.agenda.listPublished, {
    from: now - 12 * 60 * 60 * 1000,
    to: now + 45 * 24 * 60 * 60 * 1000,
    ...(eventType ? { eventType } : {}),
    ...(beginnerOnly ? { beginnerOnly: true } : {}),
  })

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof events>>()
    for (const event of events ?? []) {
      const key = formatDate(event.startsAt)
      groups.set(key, [...(groups.get(key) ?? []), event])
    }
    return [...groups.entries()]
  }, [events])

  return (
    <PublicPage eyebrow="Agenda" title="Danser prochainement" description="Les soirées, pratiques, stages et événements autour de Montpellier.">
      <DemoDataNotice />
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-end">
        <div className="min-w-52 space-y-2">
          <Label htmlFor="event-type">Type d’événement</Label>
          <select id="event-type" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" value={eventType} onChange={(event) => setEventType(event.target.value as EventType | '')}>
            <option value="">Tous les formats</option>
            {eventTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm">
          <input type="checkbox" checked={beginnerOnly} onChange={(event) => setBeginnerOnly(event.target.checked)} />
          Débutants bienvenus
        </label>
      </div>

      {events === undefined ? (
        <LoadingState label="Chargement de l’agenda…" />
      ) : groupedEvents.length === 0 ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-dashed text-center text-muted-foreground">
          <div><CalendarDays className="mx-auto mb-3 size-6" /><p>Aucun événement vérifié sur cette période.</p></div>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedEvents.map(([date, dateEvents]) => (
            <section className="space-y-4" key={date}>
              <h2 className="border-b pb-3 text-xl font-semibold capitalize">{date}</h2>
              <div className="grid gap-5 lg:grid-cols-2">
                {dateEvents.map((event) => <EventCard event={event} key={event.occurrenceId} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </PublicPage>
  )
}

export function VisitPage() {
  return <PublicPage eyebrow="Visiter" title="Préparer une visite dansante" description="Choisissez vos dates, repérez les lieux et retrouvez les informations de transport utiles." />
}

export function CommunityPage() {
  return <PublicPage eyebrow="Communauté" title="Une référence neutre et maintenable" description="Découvrez les règles d’inclusion, de vérification, de correction et de contribution." />
}

import { lazy, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  Footprints,
  HeartHandshake,
  ListFilter,
  Music2,
  Search,
  Shirt,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { CourseCard } from '@/components/course-card'
import { DemoDataNotice } from '@/components/demo-data-notice'
import { EditorialHero } from '@/components/editorial-hero'
import { EventCard } from '@/components/event-card'
import { LoadingState } from '@/components/loading-state'
import type { MapLocation } from '@/components/maps/listing-map'
import { PageIntro } from '@/components/page-intro'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate } from '@/lib/format'
import { routes } from '@/routing/routes'

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
  useDocumentTitle('Découvrir le West Coast Swing')

  const qualities = [
    {
      icon: HeartHandshake,
      title: 'Une conversation à deux',
      description: 'Une personne propose une direction, l’autre l’interprète. Les rôles se complètent, sans chorégraphie à réciter.',
    },
    {
      icon: Music2,
      title: 'Une danse très musicale',
      description: 'Blues, soul, pop, R&B ou acoustique : le West Coast Swing s’adapte à des tempos et des univers très différents.',
    },
    {
      icon: Sparkles,
      title: 'Un style qui reste le vôtre',
      description: 'La technique donne un langage commun. Ensuite, chacun·e apporte sa personnalité, son écoute et sa façon de bouger.',
    },
  ]

  return (
    <>
      <EditorialHero
        eyebrow="Découvrir"
        title="Le West Coast Swing, une danse à deux qui s’invente sur le moment."
        description="Fluide, joueur et connecté à la musique, il se danse sur des morceaux actuels comme sur ses racines blues. Pas besoin d’avoir déjà dansé pour entrer dans la conversation."
        image="/images/discover-hero.webp"
        imageAlt="Un couple danse le West Coast Swing sur la promenade du Peyrou, devant l’Arc de Triomphe de Montpellier."
        imagePosition="center"
        actions={
          <>
            <Button size="lg" render={<Link to={routes.start} />}>
              Faire ses premiers pas <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" render={<Link to={routes.agenda} />}>
              Voir une soirée
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 sm:py-20">
        <section className="space-y-8" aria-labelledby="discover-feeling">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Ce qui fait la différence</p>
            <h2 id="discover-feeling" className="text-3xl font-semibold tracking-tight">Plus une conversation qu’une démonstration</h2>
            <p className="text-lg leading-8 text-muted-foreground">
              Le West Coast Swing se danse principalement dans un couloir imaginaire. La connexion entre les partenaires crée une sensation élastique et laisse de la place à l’improvisation.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {qualities.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="leading-7 text-muted-foreground">{description}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start" aria-labelledby="first-social">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Une soirée, concrètement</p>
            <h2 id="first-social" className="text-3xl font-semibold tracking-tight">On observe, on essaie, on recommence</h2>
            <p className="leading-7 text-muted-foreground">
              Vous pouvez venir uniquement pour regarder. Si vous avez envie d’essayer, les événements signalés « débutants bienvenus » sont le point d’entrée le plus simple.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              ['01', 'L’initiation', 'Les bases sont expliquées avant la soirée, souvent sans inscription ni partenaire obligatoire.'],
              ['02', 'La danse sociale', 'On change régulièrement de partenaire et chaque morceau devient une nouvelle conversation.'],
              ['03', 'À votre rythme', 'Vous pouvez dire oui ou non à une danse, faire une pause et simplement profiter de la musique.'],
            ].map(([number, title, description]) => (
              <li className="rounded-xl border bg-card p-5" key={number}>
                <span className="text-sm font-semibold text-primary">{number}</span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl bg-secondary px-6 py-10 sm:px-10" aria-labelledby="discover-reassurance">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Bon à savoir</p>
              <h2 id="discover-reassurance" className="mt-2 text-3xl font-semibold tracking-tight">Vous avez déjà votre place sur la piste</h2>
            </div>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {[
                'Venir seul·e est tout à fait normal.',
                'Aucun sens du rythme préalable n’est demandé.',
                'Les rôles ne dépendent pas du genre.',
                'Une tenue confortable suffit pour commencer.',
              ].map((item) => (
                <p className="flex gap-3 leading-7" key={item}><Check className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />{item}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between gap-6 border-t pt-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Envie de tenter l’expérience ?</h2>
            <p className="mt-2 text-muted-foreground">Choisissez le premier format qui vous met à l’aise.</p>
          </div>
          <Button size="lg" render={<Link to={routes.start} />}>Découvrir comment débuter <ArrowRight /></Button>
        </section>
      </div>
    </>
  )
}

export function StartPage() {
  useDocumentTitle('Débuter le West Coast Swing')

  const entryPoints = [
    {
      icon: CalendarCheck,
      title: 'Une initiation en soirée',
      description: 'Pour découvrir l’ambiance et quelques bases avant de danser librement. Idéal pour essayer sans engagement.',
      action: 'Trouver une initiation',
      to: routes.agenda,
    },
    {
      icon: Footprints,
      title: 'Un cours d’essai',
      description: 'Pour apprendre dans un cadre guidé, rencontrer une école et vérifier que son approche vous convient.',
      action: 'Comparer les cours',
      to: routes.classes,
    },
    {
      icon: Users,
      title: 'Un cursus débutant',
      description: 'Pour progresser régulièrement avec le même groupe et construire des bases solides sur plusieurs semaines.',
      action: 'Voir les cursus',
      to: routes.classes,
    },
  ]

  return (
    <>
      <EditorialHero
        eyebrow="Débuter"
        title="Votre première danse commence sans prérequis."
        description="Venez seul·e ou accompagné·e, choisissez un format débutant et laissez-vous guider. L’objectif du premier cours n’est pas de tout réussir : c’est d’avoir envie de revenir."
        image="/images/start-hero.webp"
        imageAlt="Un petit groupe découvre le West Coast Swing sous les arches du quartier Antigone à Montpellier."
        imagePosition="center"
        actions={
          <>
            <Button size="lg" render={<Link to={routes.classes} />}>
              Trouver un cours débutant <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" render={<Link to={routes.agenda} />}>
              Voir les initiations
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 sm:py-20">
        <section className="space-y-8" aria-labelledby="choose-first-step">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Choisir son point de départ</p>
            <h2 id="choose-first-step" className="text-3xl font-semibold tracking-tight">Trois façons simples de se lancer</h2>
            <p className="text-lg leading-8 text-muted-foreground">Il n’y a pas de mauvais choix. Prenez celui qui correspond à votre disponibilité et au niveau d’engagement dont vous avez envie aujourd’hui.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {entryPoints.map(({ icon: Icon, title, description, action, to }) => (
              <Card className="flex flex-col" key={title}>
                <CardHeader>
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <p className="flex-1 leading-7 text-muted-foreground">{description}</p>
                  <Button className="w-fit px-0" variant="link" render={<Link to={to} />}>{action} <ArrowRight /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid overflow-hidden rounded-2xl border bg-card lg:grid-cols-2" aria-labelledby="first-class">
          <div className="bg-secondary p-7 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Avant de partir</p>
            <h2 id="first-class" className="mt-2 text-3xl font-semibold tracking-tight">Le nécessaire tient dans un petit sac</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Le confort compte plus que le style. Vérifiez simplement les informations de l’organisateur avant de vous déplacer.</p>
          </div>
          <div className="grid gap-6 p-7 sm:grid-cols-2 sm:p-10">
            {[
              { icon: Shirt, title: 'Une tenue confortable', text: 'Des vêtements dans lesquels vous bougez facilement, sans code particulier.' },
              { icon: Footprints, title: 'Des chaussures propres', text: 'Une semelle qui tient le pied et ne colle pas trop au sol.' },
              { icon: CalendarCheck, title: 'Les horaires vérifiés', text: 'Consultez la source officielle, le tarif et les conditions d’inscription.' },
              { icon: Users, title: 'Pas de partenaire requis', text: 'La rotation est habituelle. Si elle est facultative, cela sera précisé sur place.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8" aria-labelledby="beginner-expectations">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Le premier cours</p>
            <h2 id="beginner-expectations" className="mt-2 text-3xl font-semibold tracking-tight">À quoi vous attendre</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['On apprend un langage commun', 'Quelques pas, une connexion confortable et des repères pour évoluer ensemble.'],
              ['On change souvent de partenaire', 'La rotation aide à progresser et à rencontrer le groupe. Vous pouvez toujours signaler vos limites.'],
              ['On ne compare pas les débuts', 'Chacun·e avance différemment. Une bonne séance laisse de la curiosité, pas une obligation de performance.'],
            ].map(([title, text]) => (
              <div className="border-t-2 border-primary pt-5" key={title}>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 leading-7 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-foreground px-6 py-10 text-background sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-10">
          <div>
            <h2 className="text-2xl font-semibold">Prêt·e à choisir votre premier rendez-vous ?</h2>
            <p className="mt-2 text-background/70">Comparez les jours, les lieux et les niveaux débutants autour de Montpellier.</p>
          </div>
          <Button className="mt-6 shrink-0 sm:mt-0" size="lg" variant="secondary" render={<Link to={routes.classes} />}>Voir les cours <ArrowRight /></Button>
        </section>
      </div>
    </>
  )
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

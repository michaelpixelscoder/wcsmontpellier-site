import { useState } from 'react'
import { useQuery } from 'convex/react'
import { ArrowRight, CalendarDays, GraduationCap, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DemoDataNotice } from '@/components/demo-data-notice'
import { CourseCard } from '@/components/course-card'
import { EventCard } from '@/components/event-card'
import { LoadingState } from '@/components/loading-state'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { routes } from '@/routing/routes'

const paths = [
  {
    title: 'Je veux commencer',
    description: 'Comprendre la danse et choisir une première soirée ou un cours adapté.',
    to: routes.start,
    icon: GraduationCap,
  },
  {
    title: 'Voir les cours',
    description: 'Comparer les niveaux, horaires, lieux et sources officielles.',
    to: routes.classes,
    icon: MapPinned,
  },
  {
    title: 'Danser cette semaine',
    description: 'Trouver les soirées, pratiques et stages dont la date a été vérifiée.',
    to: routes.agenda,
    icon: CalendarDays,
  },
]

export function HomePage() {
  useDocumentTitle('Accueil')
  const [now] = useState(() => Date.now())
  const overview = useQuery(api.homepage.overview, { now })

  return (
    <>
      <section className="border-b bg-[radial-gradient(circle_at_top_left,var(--accent),transparent_55%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-28">
          <div className="max-w-3xl space-y-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">West Coast Swing · Montpellier</p>
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
              Trouvez où apprendre et danser, sans chercher partout.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Cours, soirées et informations pratiques réunis avec leurs sources et leur date de vérification.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" render={<Link to={routes.agenda} />}>
                Voir où danser cette semaine <ArrowRight />
              </Button>
              <Button size="lg" variant="outline" render={<Link to={routes.start} />}>
                Je veux commencer
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6">
        <DemoDataNotice />
        <div className="grid gap-5 md:grid-cols-3">
          {paths.map(({ title, description, to, icon: Icon }) => (
            <Card key={to}>
              <CardHeader>
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{description}</p>
                <Button variant="link" className="h-auto p-0" render={<Link to={to} />}>
                  Explorer <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/25">
        <div className="mx-auto max-w-7xl space-y-7 px-4 py-14 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Prochainement</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Les prochaines occasions de danser</h2>
            </div>
            <Button variant="outline" render={<Link to={routes.agenda} />}>
              Tout l’agenda <ArrowRight />
            </Button>
          </div>
          {overview === undefined ? (
            <LoadingState />
          ) : overview.upcomingEvents.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-muted-foreground">Aucun événement vérifié dans les trois prochaines semaines.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {overview.upcomingEvents.slice(0, 3).map((event) => (
                <EventCard compact event={event} key={event.occurrenceId} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-7 px-4 py-14 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cours réguliers</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Préparer sa semaine</h2>
          </div>
          <Button variant="outline" render={<Link to={routes.classes} />}>
            Comparer tous les cours <ArrowRight />
          </Button>
        </div>
        {overview === undefined ? (
          <LoadingState label="Chargement des cours…" />
        ) : overview.featuredClasses.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-muted-foreground">Aucun cours publié actuellement.</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {overview.featuredClasses.map((course) => (
              <CourseCard course={course} key={course.id} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

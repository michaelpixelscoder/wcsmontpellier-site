import { ListingMap } from '@/components/maps/listing-map'
import { PageIntro } from '@/components/page-intro'
import { useDocumentTitle } from '@/hooks/use-document-title'

type PublicPageProps = {
  title: string
  description: string
  eyebrow: string
  children?: React.ReactNode
}

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
  return (
    <PublicPage eyebrow="Cours" title="Planifier ses cours" description="Comparez les niveaux, créneaux, enseignants et lieux à partir de données sourcées.">
      <ListingMap />
    </PublicPage>
  )
}

export function AgendaPage() {
  return <PublicPage eyebrow="Agenda" title="Danser prochainement" description="Les soirées, pratiques, stages et événements autour de Montpellier." />
}

export function VisitPage() {
  return <PublicPage eyebrow="Visiter" title="Préparer une visite dansante" description="Choisissez vos dates, repérez les lieux et retrouvez les informations de transport utiles." />
}

export function CommunityPage() {
  return <PublicPage eyebrow="Communauté" title="Une référence neutre et maintenable" description="Découvrez les règles d’inclusion, de vérification, de correction et de contribution." />
}

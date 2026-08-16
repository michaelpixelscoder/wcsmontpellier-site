import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PageIntro } from '@/components/page-intro'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { routes } from '@/routing/routes'

export function NotFoundPage() {
  useDocumentTitle('Page introuvable')
  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-14 sm:px-6">
      <PageIntro title="Page introuvable" description="Cette adresse ne correspond à aucune page publiée." />
      <Button render={<Link to={routes.home} />}>Revenir à l’accueil</Button>
    </section>
  )
}

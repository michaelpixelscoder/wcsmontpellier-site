import { PageIntro } from '@/components/page-intro'
import { useDocumentTitle } from '@/hooks/use-document-title'

function AccountPage({ title, description }: { title: string; description: string }) {
  useDocumentTitle(title)
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <PageIntro eyebrow="Espace personnel" title={title} description={description} />
    </section>
  )
}

export function SignInPage() {
  return <AccountPage title="Se connecter" description="Accédez à vos favoris et, selon votre rôle, aux espaces de contribution." />
}

export function FavoritesPage() {
  return <AccountPage title="Mes favoris" description="Retrouvez les cours et événements que vous avez enregistrés." />
}

export function ContributionPage() {
  return <AccountPage title="Contribution" description="Créez et mettez à jour les fiches dont vous êtes responsable." />
}

export function AdministrationPage() {
  return <AccountPage title="Administration" description="Gérez les références partagées, les rôles, les demandes et les litiges." />
}

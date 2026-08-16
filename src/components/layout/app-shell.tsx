import { Menu } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { routes } from '@/routing/routes'

const primaryNavigation = [
  { label: 'Découvrir', to: routes.discover },
  { label: 'Débuter', to: routes.start },
  { label: 'Cours', to: routes.classes },
  { label: 'Agenda', to: routes.agenda },
  { label: 'Visiter', to: routes.visit },
]

export function AppShell() {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link className="font-semibold tracking-tight" to={routes.home}>
            WCS Montpellier
          </Link>
          <nav className="hidden flex-1 items-center gap-5 md:flex" aria-label="Navigation principale">
            {primaryNavigation.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  isActive
                    ? 'text-sm font-medium text-foreground'
                    : 'text-sm text-muted-foreground hover:text-foreground'
                }
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button className="ml-auto hidden sm:inline-flex" render={<Link to={routes.signIn} />}>
            Se connecter
          </Button>
          <Button className="md:hidden" size="icon" variant="ghost" aria-label="Ouvrir le menu">
            <Menu />
          </Button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <p>Une référence communautaire neutre pour danser le West Coast Swing à Montpellier.</p>
          <Link className="w-fit hover:text-foreground" to={routes.community}>
            Communauté et règles de publication
          </Link>
        </div>
      </footer>
    </div>
  )
}

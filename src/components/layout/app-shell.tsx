import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { Heart, LogOut, Menu, Settings, SquarePen } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip')
  const accountNavigation = isAuthenticated ? [
    { label: 'Favoris', to: routes.favorites, icon: Heart },
    ...(me?.role === 'contributor' || me?.role === 'administrator' ? [{ label: 'Contribution', to: routes.contribution, icon: SquarePen }] : []),
    ...(me?.role === 'administrator' ? [{ label: 'Administration', to: routes.administration, icon: Settings }] : []),
  ] : []

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
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            {accountNavigation.map((item) => <Button key={item.to} size="sm" variant="ghost" render={<Link to={item.to} />}><item.icon />{item.label}</Button>)}
            {isAuthenticated ? <Button size="sm" variant="outline" onClick={() => void signOut()}><LogOut />Déconnexion</Button> : <Button render={<Link to={routes.signIn} />}>Se connecter</Button>}
          </div>
          <Button
            className="md:hidden"
            size="icon"
            variant="ghost"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <Menu />
          </Button>
        </div>
        {mobileMenuOpen ? (
          <nav id="mobile-navigation" className="border-t px-4 py-3 md:hidden" aria-label="Navigation mobile">
            <div className="mx-auto grid max-w-7xl gap-1">
              {primaryNavigation.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    isActive
                      ? 'rounded-lg bg-muted px-3 py-2 text-sm font-medium'
                      : 'rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                  key={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
              {accountNavigation.map((item) => <NavLink className="rounded-lg px-3 py-2 text-sm font-medium text-primary" key={item.to} onClick={() => setMobileMenuOpen(false)} to={item.to}>{item.label}</NavLink>)}
              {isAuthenticated ? <button className="rounded-lg px-3 py-2 text-left text-sm font-medium text-primary" onClick={() => { setMobileMenuOpen(false); void signOut() }}>Déconnexion</button> : <NavLink className="rounded-lg px-3 py-2 text-sm font-medium text-primary" onClick={() => setMobileMenuOpen(false)} to={routes.signIn}>Se connecter</NavLink>}
            </div>
          </nav>
        ) : null}
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

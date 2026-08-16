import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { HomePage } from '@/pages/home-page'
import {
  AgendaPage,
  ClassesPage,
  CommunityPage,
  DiscoverPage,
  StartPage,
  VisitPage,
} from '@/pages/public-pages'
import {
  AdministrationPage,
  ContributionPage,
  FavoritesPage,
  SignInPage,
} from '@/pages/account-pages'
import { NotFoundPage } from '@/pages/not-found-page'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'decouvrir', element: <DiscoverPage /> },
      { path: 'debuter', element: <StartPage /> },
      { path: 'cours', element: <ClassesPage /> },
      { path: 'agenda', element: <AgendaPage /> },
      { path: 'visiter', element: <VisitPage /> },
      { path: 'communaute', element: <CommunityPage /> },
      { path: 'connexion', element: <SignInPage /> },
      { path: 'compte/favoris', element: <FavoritesPage /> },
      { path: 'contribution', element: <ContributionPage /> },
      { path: 'administration', element: <AdministrationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

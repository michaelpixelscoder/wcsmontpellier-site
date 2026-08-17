import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { ExternalLink, Heart, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { PageIntro } from '@/components/page-intro'
import { Button } from '@/components/ui/button'
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { routes } from '@/routing/routes'

export { ContributionPage } from '@/pages/contribution-page'

function PageFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  useDocumentTitle(title)
  return <section className="mx-auto max-w-7xl space-y-8 px-4 py-14 sm:px-6"><PageIntro eyebrow="Espace personnel" title={title} description={description} />{children}</section>
}

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth(); const location = useLocation()
  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Vérification de la session…</p>
  if (!isAuthenticated) return <Navigate replace to={`${routes.signIn}?redirect=${encodeURIComponent(location.pathname)}`} />
  return children
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.replace(/^.*?Uncaught Error: /, '') : 'Une erreur est survenue.'
}

export function SignInPage() {
  useDocumentTitle('Se connecter')
  const { isAuthenticated } = useConvexAuth(); const { signIn } = useAuthActions(); const navigate = useNavigate(); const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn'); const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  if (isAuthenticated) return <Navigate replace to={searchParams.get('redirect') || routes.favorites} />
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); setPending(true); const form = new FormData(event.currentTarget); try { await signIn('password', { flow: mode, email: String(form.get('email')), password: String(form.get('password')), ...(mode === 'signUp' ? { name: String(form.get('name')) } : {}) }); navigate(searchParams.get('redirect') || routes.favorites, { replace: true }) } catch (caught) { setError(errorMessage(caught)) } finally { setPending(false) } }
  return <PageFrame title={mode === 'signIn' ? 'Se connecter' : 'Créer un compte'} description="Enregistrez vos favoris et accédez aux espaces autorisés pour votre rôle."><form className="mx-auto grid max-w-md gap-5 rounded-xl border bg-card p-6" onSubmit={submit}>{mode === 'signUp' ? <div className="space-y-2"><Label htmlFor="name">Nom affiché</Label><Input id="name" name="name" required minLength={2} autoComplete="name" /></div> : null}<div className="space-y-2"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div><div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} /></div>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<Button disabled={pending} type="submit">{pending ? 'Veuillez patienter…' : mode === 'signIn' ? 'Se connecter' : 'Créer mon compte'}</Button><Button type="button" variant="ghost" onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>{mode === 'signIn' ? 'Pas encore de compte ? S’inscrire' : 'Déjà un compte ? Se connecter'}</Button></form></PageFrame>
}

export function FavoritesPage() {
  const { isAuthenticated } = useConvexAuth(); const favorites = useQuery(api.favorites.listMine, isAuthenticated ? {} : 'skip'); const toggle = useMutation(api.favorites.toggle)
  return <Protected><PageFrame title="Mes favoris" description="Vos cours et événements enregistrés sont synchronisés avec votre compte.">{favorites === undefined ? <p>Chargement…</p> : favorites.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground"><Heart className="mx-auto mb-3" /><p>Aucun favori pour le moment.</p><Button className="mt-4" render={<Link to={routes.classes} />}>Explorer les cours</Button></div> : <div className="grid gap-4 md:grid-cols-2">{favorites.map((item) => <Card key={item.listingId}><CardHeader><CardTitle>{item.title}</CardTitle><p className="text-sm text-muted-foreground">{item.summary}</p></CardHeader><CardFooter className="justify-between"><Button size="sm" variant="ghost" onClick={() => void toggle({ listingId: item.listingId })}>Retirer</Button><Button size="sm" variant="outline" render={<a href={item.sourceUrl} target="_blank" rel="noreferrer" />}>Source <ExternalLink /></Button></CardFooter></Card>)}</div>}</PageFrame></Protected>
}

export function AdministrationPage() {
  const { isAuthenticated } = useConvexAuth(); const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip'); const users = useQuery(api.administration.listUsers, me?.role === 'administrator' ? {} : 'skip'); const listings = useQuery(api.administration.listListings, me?.role === 'administrator' ? {} : 'skip'); const setRole = useMutation(api.administration.setRole); const setStatus = useMutation(api.administration.setStatus)
  return <Protected><PageFrame title="Administration" description="Attribuez les rôles et contrôlez l’état des comptes depuis une vue globale protégée.">{me && me.role !== 'administrator' ? <div className="rounded-xl border border-dashed p-8 text-center"><ShieldCheck className="mx-auto mb-3" /><p>Accès réservé aux administrateurs.</p></div> : users === undefined ? <p>Chargement…</p> : <div className="space-y-8"><div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Compte</th><th className="p-3">Rôle</th><th className="p-3">État</th></tr></thead><tbody>{users.map((user) => <tr className="border-t" key={user.id}><td className="p-3"><p className="font-medium">{user.displayName || 'Sans nom'}</p><p className="text-muted-foreground">{user.email}</p></td><td className="p-3"><select aria-label={`Rôle de ${user.displayName}`} className="h-9 rounded-lg border bg-background px-2" value={user.role} disabled={user.id === me?.id} onChange={(event) => void setRole({ userId: user.id, role: event.target.value as typeof user.role })}><option value="user">Membre</option><option value="contributor">Contributeur</option><option value="administrator">Administrateur</option></select></td><td className="p-3"><select aria-label={`État de ${user.displayName}`} className="h-9 rounded-lg border bg-background px-2" value={user.status} disabled={user.id === me?.id} onChange={(event) => void setStatus({ userId: user.id, status: event.target.value as typeof user.status })}><option value="active">Actif</option><option value="suspended">Suspendu</option><option value="deleted">Supprimé</option></select></td></tr>)}</tbody></table></div><div><h2 className="mb-3 text-lg font-semibold">Toutes les fiches ({listings?.length ?? 0})</h2><div className="grid gap-2">{listings?.map((listing) => <div className="flex justify-between rounded-lg border p-3 text-sm" key={listing.id}><span>{listing.title}</span><span className="text-muted-foreground">{listing.kind} · {listing.status} · v{listing.version}</span></div>)}</div></div></div>}</PageFrame></Protected>
}

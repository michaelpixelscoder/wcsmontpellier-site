import { useMutation, useQuery } from 'convex/react'
import { Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { useConvexAuth } from 'convex/react'

export function FavoriteButton({ listingId }: { listingId: Id<'listings'> }) {
  const { isAuthenticated } = useConvexAuth()
  const favoriteIds = useQuery(api.favorites.ids, isAuthenticated ? {} : 'skip')
  const toggle = useMutation(api.favorites.toggle)
  const location = useLocation()
  const navigate = useNavigate()
  const active = favoriteIds?.includes(listingId) ?? false

  return (
    <Button
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-pressed={active}
      size="icon-sm"
      variant={active ? 'default' : 'outline'}
      onClick={() => {
        if (!isAuthenticated) {
          navigate(`/connexion?redirect=${encodeURIComponent(location.pathname)}`)
          return
        }
        void toggle({ listingId })
      }}
    >
      <Heart className={active ? 'fill-current' : ''} />
    </Button>
  )
}

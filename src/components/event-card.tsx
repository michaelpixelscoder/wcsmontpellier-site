import { Clock3, ExternalLink, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEventType, formatShortDate, formatTime, formatVerifiedDate } from '@/lib/format'
import type { EventCardData } from '@/types/public-data'
import { FavoriteButton } from '@/components/favorite-button'

const statusLabels = {
  scheduled: 'Confirmé',
  confirmation_pending: 'À confirmer',
  cancelled: 'Annulé',
  completed: 'Terminé',
} as const

export function EventCard({ event, compact = false }: { event: EventCardData; compact?: boolean }) {
  const cancelled = event.status === 'cancelled'

  return (
    <Card className={cancelled ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={cancelled ? 'destructive' : 'secondary'}>{statusLabels[event.status]}</Badge>
          <Badge variant="outline">{formatEventType(event.eventType)}</Badge>
          {event.beginnerFriendly ? <Badge>Débutants bienvenus</Badge> : null}
        </div>
        <CardTitle className={compact ? 'text-lg' : 'text-xl'}>{event.title}</CardTitle>
        {!compact ? <p className="text-sm leading-6 text-muted-foreground">{event.summary}</p> : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Clock3 className="size-4 text-primary" aria-hidden="true" />
          <span>{formatShortDate(event.startsAt)} · {formatTime(event.startsAt)}–{formatTime(event.endsAt)}</span>
        </p>
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{event.place.name} · {event.place.city}</span>
        </p>
        {event.exceptionNote ? <p className="rounded-lg bg-muted p-3 text-muted-foreground">{event.exceptionNote}</p> : null}
      </CardContent>
      {!compact ? (
        <CardFooter className="flex items-center justify-between gap-3 border-t pt-4">
          <span className="text-xs text-muted-foreground">{formatVerifiedDate(event.lastVerifiedAt)}</span>
          <div className="flex gap-2">
            <FavoriteButton listingId={event.listingId} />
            <Button size="sm" variant="outline" render={<a href={event.sourceUrl} target="_blank" rel="noreferrer" />}>
              Source <ExternalLink />
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  )
}

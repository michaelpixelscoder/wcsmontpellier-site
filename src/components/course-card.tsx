import { Clock3, ExternalLink, MapPin, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatVerifiedDate, formatWeekday } from '@/lib/format'
import type { CourseCardData } from '@/types/public-data'
import { FavoriteButton } from '@/components/favorite-button'

export function CourseCard({ course }: { course: CourseCardData }) {
  const schedule = course.schedules[0]

  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge>{course.level.label}</Badge>
          {course.trialAvailable ? <Badge variant="secondary">Essai possible</Badge> : null}
        </div>
        <CardTitle className="text-xl">{course.title}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{course.summary}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {schedule ? (
          <>
            <p className="flex items-center gap-2">
              <Clock3 className="size-4 text-primary" aria-hidden="true" />
              <span>{formatWeekday(schedule.weekday)}, {schedule.startTime}–{schedule.endTime}</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{schedule.place.name} · {schedule.place.city}</span>
            </p>
          </>
        ) : null}
        <p className="flex items-start gap-2">
          <Users className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{course.teachers.join(', ') || 'Enseignant à confirmer'}</span>
        </p>
        {course.priceSummary ? <p className="font-medium">{course.priceSummary}</p> : null}
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
        <span className="text-xs text-muted-foreground">{formatVerifiedDate(course.lastVerifiedAt)}</span>
        <div className="flex gap-2">
          <FavoriteButton listingId={course.id} />
          <Button size="sm" variant="outline" render={<a href={course.sourceUrl} target="_blank" rel="noreferrer" />}>
            Source <ExternalLink />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

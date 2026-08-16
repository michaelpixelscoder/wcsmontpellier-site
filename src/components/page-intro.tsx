import { Badge } from '@/components/ui/badge'

type PageIntroProps = {
  eyebrow?: string
  title: string
  description: string
}

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="max-w-3xl space-y-4">
      {eyebrow ? <Badge variant="secondary">{eyebrow}</Badge> : null}
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="text-lg leading-8 text-muted-foreground">{description}</p>
    </header>
  )
}

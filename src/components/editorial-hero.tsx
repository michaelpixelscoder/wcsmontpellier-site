import type { ReactNode } from 'react'

type EditorialHeroProps = {
  eyebrow: string
  title: string
  description: string
  image: string
  imageAlt: string
  actions?: ReactNode
  imagePosition?: string
}

export function EditorialHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  actions,
  imagePosition = 'center',
}: EditorialHeroProps) {
  return (
    <section className="overflow-hidden border-b bg-[radial-gradient(circle_at_top_left,var(--accent),transparent_58%)]">
      <div className="mx-auto grid max-w-7xl lg:min-h-[34rem] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex items-center px-4 py-14 sm:px-6 sm:py-20 lg:py-24 lg:pr-12">
          <div className="max-w-2xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">{description}</p>
            {actions ? <div className="flex flex-wrap gap-3 pt-1">{actions}</div> : null}
          </div>
        </div>
        <div className="relative min-h-80 lg:min-h-full">
          <img
            src={image}
            alt={imageAlt}
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: imagePosition }}
            width="1672"
            height="941"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent lg:bg-gradient-to-r lg:from-background/25 lg:via-transparent lg:to-transparent" />
        </div>
      </div>
    </section>
  )
}

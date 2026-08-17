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
    <section className="relative isolate overflow-hidden border-b">
      <img
        src={image}
        alt={imageAlt}
        className="absolute inset-0 -z-20 size-full object-cover"
        style={{ objectPosition: imagePosition }}
        width="1672"
        height="941"
        fetchPriority="high"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/15" />
      <div className="mx-auto flex min-h-[36rem] max-w-7xl items-center px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[42rem] lg:py-20">
        <div className="max-w-2xl rounded-2xl border border-white/25 bg-background/85 p-6 shadow-2xl backdrop-blur-md sm:p-8 lg:p-10">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">{description}</p>
            {actions ? <div className="flex flex-wrap gap-3 pt-1">{actions}</div> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

import { BookOpen, Headphones, Sprout } from 'lucide-react'

/* What an account opens, in the SOW's own terms (§3.2 #5 and the learning
   stages). Plain facts about the product, no claims or numbers. */
const ITEMS = [
  { icon: BookOpen, label: 'Explorations to read' },
  { icon: Headphones, label: 'Guided meditations' },
  { icon: Sprout, label: 'A path, stage by stage' },
] as const

export function AuthHighlights({ heading }: { heading: string }) {
  return (
    <section aria-label={heading} className="flex flex-col items-center gap-4">
      <h2 className="nff-label-lg text-foreground">{heading}</h2>
      <ul className="grid w-full grid-cols-3 gap-2">
        {ITEMS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex flex-col items-center gap-2 text-center">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-full bg-[var(--nff-clay-50)] text-[var(--nff-clay-600)] ring-1 ring-[var(--nff-clay-100)]"
            >
              <Icon className="size-6" strokeWidth={1.6} />
            </span>
            <span className="nff-body-sm text-muted-foreground">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

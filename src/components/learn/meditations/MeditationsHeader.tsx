import { LibrarySearch } from '@/components/learn/library/LibrarySearch'
import type { MeditationEntry } from '@/services/learning/meditations'

/**
 * Introduction: a calm sage panel with one natural photograph taken from a
 * real featured meditation (decorative), not a promotional banner. The photo
 * is left out when nothing is featured.
 */
export function MeditationsHeader({
  query,
  onSearch,
  image,
}: {
  query: string
  onSearch: (value: string) => void
  image?: MeditationEntry['item']['image']
}) {
  return (
    <header className="flex overflow-hidden rounded-md border border-nff-border-default bg-[var(--nff-sage-50)]">
      <div className="flex min-w-0 flex-1 flex-col gap-5 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-2">
          <h1 className="nff-heading-h1 text-foreground">Meditations</h1>
          <p className="max-w-xl nff-body-lg text-nff-text-secondary">
            Find a little space to pause, listen and return to your practice.
          </p>
        </div>
        <LibrarySearch
          value={query}
          onSearch={onSearch}
          label="Search meditations"
          placeholder="Search meditations"
        />
      </div>
      {image && (
        <img
          src={image.src}
          alt=""
          decoding="async"
          className="hidden w-1/3 max-w-sm object-cover md:block"
        />
      )}
    </header>
  )
}

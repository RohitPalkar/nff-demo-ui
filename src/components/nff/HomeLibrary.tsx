import { ArrowRight, Sparkles } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ButtonGroup } from '@/components/nff/ButtonGroup'
import { EmptyState } from '@/components/nff/EmptyState'
import { LibraryContentCard } from '@/components/nff/LibraryContentCard'
import { Button } from '@/components/ui/button'
import { useLibraryPlayback } from '@/features/player/useLibraryPlayback'
import { useRevealOnce } from '@/lib/useRevealOnce'
import { cn } from '@/lib/utils'
import { getStageNumber } from '@/services/content'
import { getContentVideo } from '@/services/learning/video'
import type { ContentItem, HomeTab } from '@/types'

const delay = (ms: number) => ({ '--nff-delay': `${ms}ms` }) as CSSProperties

const ALL_TOPICS = 'all'

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** Real counts for the tab's descriptor line, e.g. "2 explorations · 2 meditations". */
function mixLabel(items: ContentItem[]) {
  const reading = items.filter((item) => item.type === 'exploration').length
  const audio = items.length - reading
  const parts = [
    reading > 0 ? plural(reading, 'exploration') : undefined,
    audio > 0 ? plural(audio, 'meditation') : undefined,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Coming soon'
}

interface HomeLibraryProps {
  tabs: HomeTab[]
  activeTab: string
  onTabChange: (value: string) => void
}

/**
 * Home library (S-WEB-01, "#learn"): four doors into the practice. The four
 * categories are the section's main navigation; every item renders through
 * LibraryContentCard so all cards share one layout.
 */
function cardsFor(tab: HomeTab, topic: string) {
  if (topic === ALL_TOPICS || !tab.subTabs) return tab.items
  return tab.subTabs.find((sub) => sub.key === topic)?.items ?? tab.items
}

export function HomeLibrary({ tabs, activeTab, onTabChange }: HomeLibraryProps) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.1)
  const playback = useLibraryPlayback()
  const [topic, setTopic] = useState<string>(ALL_TOPICS)
  const [switched, setSwitched] = useState(false)
  const tab = tabs.find((entry) => entry.key === activeTab) ?? tabs[0]
  const items = tab ? cardsFor(tab, topic) : []

  function handleTabChange(value: string) {
    playback.stopPreview()
    setTopic(ALL_TOPICS)
    setSwitched(true)
    onTabChange(value)
  }


  return (
    <section
      ref={ref}
      id="learn"
      aria-labelledby="learn-heading"
      data-reveal={shown ? 'shown' : 'pending'}
      className="px-2 sm:px-3"
    >
      <div className="rounded-[28px] bg-nff-bg-surface-sunken md:rounded-[36px]">
        <div className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 md:py-24 lg:px-14 lg:py-28">
          {/* 1-4. Introduction */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <div className="flex max-w-[44rem] flex-col items-start gap-5">
              <p
                className="nff-reveal-fade inline-flex items-center gap-2 rounded-full border border-nff-border-default bg-nff-bg-surface px-3.5 py-1.5 nff-overline text-nff-text-secondary"
                style={delay(0)}
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--nff-sage-500)]" />
                The library
              </p>
              <h2
                id="learn-heading"
                className="nff-reveal-fade nff-heading-h1 text-balance text-foreground"
                style={delay(100)}
              >
                Where would you like to begin?
              </h2>
              <p
                className="nff-reveal-fade max-w-[34rem] nff-body-lg text-pretty text-nff-text-secondary"
                style={delay(200)}
              >
                Four doors into the same practice. Start anywhere, then follow
                the stages when you are ready.
              </p>
            </div>
            <Link
              to="/explorations"
              className="nff-reveal-fade group inline-flex h-12 w-fit shrink-0 items-center gap-2 rounded-full border border-nff-border-strong bg-nff-bg-surface px-6 nff-label-lg text-foreground transition-colors duration-[var(--nff-duration-fast)] hover:bg-nff-bg-tonal nff-focus-ring"
              style={delay(300)}
            >
              Browse everything
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          {/* 5. Four-category navigation: the shared pill ButtonGroup. */}
          <div className="nff-reveal-fade mt-12 md:mt-16" style={delay(380)}>
            <ButtonGroup
              label="Library categories"
              items={tabs.map((tab) => ({ value: tab.key, label: tab.label }))}
              value={tab?.key ?? ''}
              onValueChange={handleTabChange}
            />
          </div>

          {tab && (
            <div role="region" aria-label={tab.label} className="mt-6">
              {/* 6. Selected category description (+ Understand topics) */}
              <div
                className="nff-reveal-fade flex flex-col gap-4 pb-8 md:flex-row md:items-center md:justify-between"
                style={delay(460)}
              >
                <p className="max-w-[40rem] nff-body-lg text-pretty text-nff-text-secondary">
                  {tab.description}
                  <span className="mt-1 block nff-caption text-nff-text-tertiary">{mixLabel(tab.items)}</span>
                </p>
                {tab.subTabs && tab.subTabs.length > 0 && (
                  <ButtonGroup
                    size="sm"
                    label={`Filter ${tab.label} by topic`}
                    className="shrink-0"
                    items={[{ value: ALL_TOPICS, label: 'All' }, ...tab.subTabs.map((sub) => ({ value: sub.key, label: sub.label }))]}
                    value={topic}
                    onValueChange={(next) => {
                      playback.stopPreview()
                      setSwitched(true)
                      setTopic(next)
                    }}
                  />
                )}
              </div>

              {/* 7. Cards */}
              {items.length > 0 ? (
                <ul
                  key={`${tab.key}-${topic}`}
                  className="nff-reveal-fade -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 py-1.5 [scrollbar-width:none] sm:-mx-10 sm:scroll-px-10 sm:px-10 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:py-0 [&::-webkit-scrollbar]:hidden"
                  style={delay(540)}
                >
                  {items.map((item, index) => (
                    <li key={item.id} className="flex w-[86%] max-w-[22rem] shrink-0 snap-start sm:w-[46%] sm:max-w-none lg:w-auto">
                      <LibraryContentCard
                        className={cn('w-full', switched && 'nff-card-in')}
                        style={delay(index * 60)}
                        kind={item.type}
                        title={item.title}
                        description={item.excerpt}
                        href={
                          item.type === 'exploration'
                            ? `/explorations/${item.slug}`
                            : `/meditations/${item.slug}`
                        }
                        image={item.image}
                        video={getContentVideo(item.id)}
                        category={tab.label}
                        stage={getStageNumber(item.stageId)}
                        readingTimeMin={
                          item.type === 'exploration' ? item.readingTimeMin : undefined
                        }
                        durationSec={
                          item.type === 'meditation' ? item.durationSec : undefined
                        }
                        freePreview={
                          item.type === 'meditation' && item.preview && playback.isPreview
                        }
                        playback={
                          playback.canPlay(item)
                            ? {
                                state: playback.state(item.id),
                                progress: playback.progress(item.id),
                                preview: playback.isPreview,
                                onToggle: () => playback.toggle(item),
                              }
                            : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="Nothing here just yet"
                  description="New content is on its way. Try another category, or begin with a free preview."
                  action={
                    <Button asChild className="h-11">
                      <Link to="/meditations">Browse meditations</Link>
                    </Button>
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

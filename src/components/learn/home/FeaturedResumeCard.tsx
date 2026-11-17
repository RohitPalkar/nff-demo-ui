'use client'

import { Link } from 'react-router-dom'
import type { ContinueLearning } from '@/services/learning/home'
import { PRIMARY_ACTION } from './homeStyles'
import { GrowthPlant } from './BotanicalIllustrations'

/**
 * Featured resume card - compact, editorial-style featured card.
 * Displays: learning stage, content title, content type, estimated duration, completion percentage, clear Resume CTA.
 * Subtle horizontal progress indicator.
 * Retains thumbnail but with more restrained proportions.
 */
export function FeaturedResumeCard({
  entry,
  nowPlaying = false,
}: {
  entry: ContinueLearning
  nowPlaying?: boolean
}) {
  const { item, path, moduleLabel, progress, href } = entry
  const isAudio = item.type === 'meditation'

  return (
    <article className="relative overflow-hidden rounded-xl border border-[var(--nff-border-default)] bg-white transition-all duration-300 hover:border-[var(--nff-sage-300)] hover:shadow-soft">
      {/* Subtle botanical accent on the left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--nff-forest-500)] to-[var(--nff-sage-400)]" aria-hidden="true" />

      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail - restrained proportions */}
        <Link to={href} className="relative shrink-0 w-full sm:w-48 aspect-[4/3] sm:aspect-auto overflow-hidden" aria-label={`View ${item.title}`}>
          <img
            src={item.image?.src ?? '/images/placeholder.jpg'}
            alt=""
            loading="lazy"
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          />
          {/* Content type badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-[var(--nff-forest-800)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3" aria-hidden="true">
              <g>
                {isAudio ? (
                  <>
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </>
                ) : (
                  <>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </>
                )}
              </g>
            </svg>
            <span>{isAudio ? 'Audio' : 'Article'}</span>
          </div>
          {/* Duration badge */}
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-[var(--nff-forest-800)] flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3" aria-hidden="true">
              <g>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </g>
            </svg>
            {isAudio ? `${Math.round(item.durationSec / 60)} min` : `${item.readingTimeMin} min read`}
          </div>
        </Link>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          {/* Stage/Module label */}
          <p className="nff-caption text-[var(--nff-forest-700)] font-medium tracking-wide uppercase tracking-wider">
            {path.title} · {moduleLabel}
          </p>

          {/* Title */}
          <Link to={href} className="group mt-1 block">
            <h2 className="nff-heading-h4 text-foreground group-hover:text-[var(--nff-forest-900)] transition-colors line-clamp-2">
              {entry.item.title}
            </h2>
          </Link>

          {/* Meta: type, duration, progress */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--nff-text-secondary)]">
            <span className="flex items-center gap-1.5 text-[var(--nff-text-tertiary)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{isAudio ? `${Math.round(item.durationSec / 60)} min listen` : `${item.readingTimeMin} min read`}</span>
            </span>
            {progress && (
              <span className="flex items-center gap-1.5 text-[var(--nff-forest-700)] font-medium">
                <GrowthPlant stage={Math.max(1, Math.round(progress.percent / 33.3))} size="sm" />
                <span>{progress.percent}% complete</span>
              </span>
            )}
          </div>

          {/* Progress bar */}
          {progress && (
            <div className="mt-4" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${entry.item.title} progress`}>
              <div className="h-1.5 rounded-full bg-[var(--nff-sage-100)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--nff-forest-500)] to-[var(--nff-forest-700)] transition-all duration-500 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="mt-1.5 nff-caption text-[var(--nff-text-tertiary)] text-right">{progress.label}</p>
            </div>
          )}

          {/* Resume CTA */}
          <Link
            to={href}
            className={`${PRIMARY_ACTION} mt-5 w-full sm:w-auto justify-center group`}
            aria-label={`Resume ${entry.item.title}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
              <path d="M8 5v14l11-7-11-7z" />
            </svg>
            <span>Resume</span>
            {nowPlaying && <span className="ml-2 text-xs text-[var(--nff-ivory-50)]/80">Now playing</span>}
          </Link>
        </div>
      </div>
    </article>
  )
}
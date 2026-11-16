import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/config/brand'
import { HERO_IMAGE } from '@/config/heroImage'

/** Entrance delay for each staggered element (ms). */
const delay = (ms: number) => ({ '--nff-delay': `${ms}ms` }) as CSSProperties

/** Fine film grain, inline so it never makes a request. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")"

/**
 * Ridge silhouettes, far to near, on a 1600 x 900 canvas. Only the nearest
 * ridge reaches the bottom edge, so anti-aliasing there never shows a seam.
 */
const RIDGES = [
  { fill: '#74826A', d: 'M0 548C140 520 260 532 380 512S620 470 760 498 1000 540 1130 512 1390 470 1600 500V860H0Z' },
  { fill: '#5D6E53', d:'M0 612C120 590 250 600 360 578S560 548 700 572 930 618 1080 596 1340 556 1600 584V860H0Z' },
  { fill: '#465840', d:'M0 676C160 650 300 664 430 640S690 612 830 640 1080 690 1240 664 1480 628 1600 646V860H0Z' },
  { fill: '#354634', d: 'M0 742C180 716 320 734 470 712S760 690 900 718 1160 760 1330 734 1520 706 1600 716V860H0Z' },
  { fill: '#202B20', d: 'M0 818C200 792 380 806 560 788S860 772 1020 796 1300 830 1460 808 1580 796 1600 798V900H0Z' },
] as const

/** Mist bands that sit between ridges and drift very slowly (right side). */
const MIST = [
  { cx: 1120, cy: 560, rx: 420, ry: 20, opacity: 0.2, delay: '0s' },
  { cx: 1240, cy: 626, rx: 360, ry: 18, opacity: 0.12, delay: '-14s' },
] as const

/**
 * Designed backdrop used until a photograph is approved: an original dawn
 * landscape drawn in SVG. Layered ridges in the brand greens, a low sun and
 * slow mist give depth without stock imagery or any network request. The
 * darkest ridges sit at the bottom, where the text is.
 */
function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 bg-[#202B20]">
      {/* Phones and tablets: a band across the top, so the sun clears the text; its
          last few pixels fade into the matching foreground green, so there is
          no visible edge. From lg up the scene covers the whole card. */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMax slice"
        className="absolute top-0 -left-1/4 h-[44%] w-[125%] [mask-image:linear-gradient(to_bottom,#000_92%,transparent)] lg:left-0 lg:h-full lg:w-full lg:[mask-image:none]"
      >
        <defs>
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1C261D" />
            <stop offset="0.42" stopColor="#2F4030" />
            <stop offset="0.62" stopColor="#5E6C55" />
          </linearGradient>
          <radialGradient id="hero-glow" cx="1180" cy="520" r="620" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F1DFD5" stopOpacity="0.62" />
            <stop offset="0.35" stopColor="#E3C3B2" stopOpacity="0.26" />
            <stop offset="1" stopColor="#E3C3B2" stopOpacity="0" />
          </radialGradient>
          <filter id="hero-blur" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        <rect width="1600" height="860" fill="url(#hero-sky)" />
        <rect width="1600" height="860" fill="url(#hero-glow)" className="nff-hero-sun" />
        {/* Low sun, half behind the far ridge. */}
        <circle cx="1180" cy="512" r="58" fill="#F7EEE4" opacity="0.95" />

        {RIDGES.map((ridge, index) => (
          <g key={ridge.fill}>
            <path d={ridge.d} fill={ridge.fill} />
            {MIST[index] && (
              <ellipse
                className="nff-hero-mist"
                style={{ animationDelay: MIST[index].delay }}
                cx={MIST[index].cx}
                cy={MIST[index].cy}
                rx={MIST[index].rx}
                ry={MIST[index].ry}
                fill="#F7F5EF"
                opacity={MIST[index].opacity}
                filter="url(#hero-blur)"
              />
            )}
          </g>
        ))}
      </svg>
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  )
}

/** Approved photograph with separate desktop and mobile crops. */
function HeroPhoto() {
  if (!HERO_IMAGE) return null
  const { desktop, mobile, alt, focus } = HERO_IMAGE
  return (
    <picture className="absolute inset-0">
      {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
      <img
        src={desktop}
        alt={alt}
        fetchPriority="high"
        decoding="async"
        className="size-full object-cover object-[var(--focus-mobile)] md:object-[var(--focus-desktop)]"
        style={
          {
            '--focus-mobile': focus?.mobile ?? '50% 25%',
            '--focus-desktop': focus?.desktop ?? '70% 40%',
          } as CSSProperties
        }
      />
    </picture>
  )
}

/**
 * Home hero (S-WEB-01): headline, one-line mission, "Start a free meditation"
 * and "How it works". Text sits lower-left on an immersive inset card. All
 * motion is CSS, so the hero is complete without JavaScript animation.
 */
export function HomeHero() {
  return (
    <section aria-labelledby="hero-heading" className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div
        data-surface="inverse"
        className="relative isolate flex min-h-[32rem] overflow-hidden rounded-[28px] bg-nff-bg-inverse text-foreground sm:min-h-[38rem] md:rounded-[36px] lg:min-h-[min(calc(100svh-var(--nff-layout-header-height)-1.5rem),54rem)]"
      >
        <div className="nff-hero-media absolute inset-0 -z-10">
          {HERO_IMAGE ? <HeroPhoto /> : <HeroBackdrop />}
        </div>

        {/* Readability: darken only behind the text (bottom, and left on wide screens). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(31_42_32/0.82)_0%,rgb(31_42_32/0.35)_45%,transparent_75%)] md:bg-[linear-gradient(to_top,rgb(31_42_32/0.7)_0%,transparent_60%),linear-gradient(to_right,rgb(31_42_32/0.6)_0%,transparent_65%)]"
        />

        <div className="mt-auto w-full px-6 pt-44 pb-7 sm:px-10 sm:pt-48 sm:pb-10 lg:px-14 lg:pb-14">
          <div className="flex max-w-[52rem] flex-col items-start gap-4 sm:gap-5 md:gap-6">
            <p
              className="nff-hero-rise inline-flex items-center gap-2 rounded-full border border-nff-border-strong bg-[rgb(247_245_239/0.07)] px-3.5 py-1.5 nff-overline text-foreground backdrop-blur-sm"
              style={delay(250)}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--nff-sage-200)]" />
              A staged practice
            </p>

            <h1 id="hero-heading" className="nff-display-xl text-balance text-foreground">
              <span className="nff-hero-line">
                <span style={delay(380)}>A gentler way to</span>
              </span>{' '}
              <span className="nff-hero-line">
                <span style={delay(500)}>
                  <em className="font-normal not-italic text-[var(--nff-sage-200)]">
                    understand your mind.
                  </em>
                </span>
              </span>
            </h1>

            <p
              className="nff-hero-rise max-w-[36rem] nff-body-lg text-pretty text-[rgb(247_245_239/0.9)]"
              style={delay(700)}
            >
              {BRAND.productName} brings together short explorations and guided
              meditations in six unhurried stages — so the practice fits into a
              real life, not the other way round.
            </p>

            <div className="mt-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                asChild
                className="nff-hero-rise group h-12 rounded-full px-6 nff-label-lg"
                style={delay(840)}
              >
                <Link to="/meditations">
                  Start a free meditation
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-0.5"
                  />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="nff-hero-rise h-12 rounded-full border-nff-border-strong bg-[rgb(247_245_239/0.08)] px-6 nff-label-lg text-foreground backdrop-blur-sm hover:bg-[rgb(247_245_239/0.16)] hover:text-foreground"
                style={delay(940)}
              >
                <a href="#how-it-works">How it works</a>
              </Button>
            </div>

            <p
              className="nff-hero-rise nff-body-sm text-[rgb(247_245_239/0.92)]"
              style={delay(1040)}
            >
              Free previews · No card needed · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

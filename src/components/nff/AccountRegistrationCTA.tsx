import { ArrowUpRight, Check } from 'lucide-react'
import { useId, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { usePrimaryCta } from '@/components/nff/header/navConfig'
import { ACCOUNT_BENEFITS } from '@/config/accountBenefits'
import { CTA_IMAGE, type CtaImage } from '@/config/ctaImage'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRevealOnce } from '@/lib/useRevealOnce'
import { cn } from '@/lib/utils'

const delay = (ms: number) => ({ '--nff-delay': `${ms}ms` }) as CSSProperties

export interface AccountRegistrationCTAProps {
  /** Section id, for in-page links (the home page uses "begin"). */
  id?: string
  /** Overline for visitors. */
  eyebrow?: string
  /** Overline for signed-in people, who see their own next step instead. */
  signedInEyebrow?: string
  /** First heading line. */
  heading?: string
  /** Second heading line, set in brand colour. Omit for a single line. */
  headingAccent?: string
  /** Optional supporting paragraph under the heading. */
  description?: string
  /** Verified account benefits; pass [] to hide the list. */
  benefits?: readonly string[]
  /** Visitor button label. The arrow is added by the component. */
  buttonLabel?: string
  /** Text before the log-in link. */
  loginPrompt?: string
  loginLabel?: string
  /** Photograph behind the frosted panel; null for a plain forest panel. */
  image?: CtaImage | null
  className?: string
}

/**
 * Registration panel shown near the end of public pages, before the footer.
 * Visitors get the existing sign-up and log-in routes. Signed-in people get
 * the header's primary destination (journey, or the CMS for staff) instead of
 * a sign-up prompt, and no log-in link.
 *
 * Not for the navbar, auth screens, the CMS or practitioner pages.
 */
export function AccountRegistrationCTA({
  id,
  eyebrow = 'Begin today',
  signedInEyebrow = 'Welcome back',
  heading = 'The whole library,',
  headingAccent = 'at your own pace.',
  description,
  benefits = ACCOUNT_BENEFITS,
  buttonLabel = 'Create your free account',
  loginPrompt = 'Already practising?',
  loginLabel = 'Log in',
  image = CTA_IMAGE,
  className,
}: AccountRegistrationCTAProps) {
  const { user } = useAuth()
  const primary = usePrimaryCta()
  const [ref, shown] = useRevealOnce<HTMLElement>(0.2)
  const headingId = useId()
  const signedIn = Boolean(user)
  const listDelay = description ? 520 : 420

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={headingId}
      data-reveal={shown ? 'shown' : 'pending'}
      className={cn('px-2 sm:px-3', className)}
    >
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-10 md:py-24 lg:px-14 lg:py-28">
        {/* Same language as the content cards: a full-bleed photograph with a
            frosted ivory panel and a forest action bar. */}
        <div
          className={cn(
            'nff-reveal-fade relative isolate flex flex-col justify-end overflow-hidden rounded-[28px] p-2 shadow-nff-1 ring-1 ring-nff-border-default sm:p-3 md:rounded-[36px] lg:min-h-[36rem] lg:flex-row lg:items-stretch lg:justify-start lg:p-4',
            image ? 'bg-nff-bg-tonal pt-44 sm:pt-56' : 'bg-[var(--nff-forest-800)] pt-2 sm:pt-3',
          )}
          style={delay(0)}
        >
          {image && (
            <img
              src={image.src}
              srcSet={image.srcSet}
              sizes="(min-width: 1464px) 1300px, 100vw"
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="pointer-events-none absolute inset-0 -z-10 size-full object-cover object-[70%_40%]"
            />
          )}

          <div className="flex w-full flex-col rounded-[22px] bg-[rgb(247_245_239/0.92)] p-6 shadow-[0_12px_32px_-16px_rgb(31_42_32/0.4)] ring-1 ring-[rgb(255_255_255/0.6)] backdrop-blur-md sm:p-10 md:rounded-[28px] lg:max-w-[40rem] lg:justify-between lg:p-12 xl:max-w-[44rem]">
            <div className="flex flex-col">
              <p
                className="nff-reveal-fade flex items-center gap-3 nff-overline text-nff-text-brand"
                style={delay(120)}
              >
                <span aria-hidden="true" className="h-px w-8 bg-current" />
                {signedIn ? signedInEyebrow : eyebrow}
              </p>
              <h2 id={headingId} className="mt-5 nff-heading-h1 text-balance text-foreground">
                <span className="nff-reveal-line">
                  <span style={delay(200)}>{heading}</span>
                </span>
                {headingAccent && (
                  <span className="nff-reveal-line">
                    <span style={delay(300)} className="text-nff-text-brand">
                      {headingAccent}
                    </span>
                  </span>
                )}
              </h2>

              {description && (
                <p
                  className="nff-reveal-fade mt-5 max-w-[34rem] nff-body-lg text-pretty text-nff-text-secondary"
                  style={delay(400)}
                >
                  {description}
                </p>
              )}

              {benefits.length > 0 && (
                <ul className="mt-8 flex flex-col gap-3.5">
                  {benefits.map((benefit, index) => (
                    <li
                      key={benefit}
                      className="nff-reveal-fade flex items-start gap-3 nff-body-md text-nff-text-secondary"
                      style={delay(listDelay + index * 90)}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-nff-bg-tonal text-[var(--nff-forest-700)]"
                      >
                        <Check className="size-3" strokeWidth={2.5} />
                      </span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Action bar, as on the cards: label bar plus arrow square, one link. */}
            <div
              className="nff-reveal-fade mt-10 flex flex-col gap-4"
              style={delay(listDelay + 140)}
            >
              <Link
                to={signedIn ? primary.to : '/signup'}
                className="group flex h-14 items-stretch gap-1.5 rounded-[16px] nff-focus-ring"
              >
                <span className="flex min-w-0 flex-1 items-center rounded-[16px] bg-[var(--nff-forest-900)] px-5 nff-label-lg whitespace-nowrap text-[var(--nff-ivory-50)] transition-colors duration-[var(--nff-duration-fast)] group-hover:bg-[var(--nff-forest-700)]">
                  {signedIn ? primary.label : buttonLabel}
                </span>
                <span
                  aria-hidden="true"
                  className="flex w-14 shrink-0 items-center justify-center rounded-[16px] bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)] transition-colors duration-[var(--nff-duration-fast)] group-hover:bg-[var(--nff-forest-700)]"
                >
                  <ArrowUpRight className="size-5 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
              {!signedIn && (
                <p className="nff-body-sm text-nff-text-secondary">
                  {loginPrompt}{' '}
                  <Link
                    to="/login"
                    className="rounded-sm font-medium text-nff-text-brand underline decoration-[rgb(69_86_65/0.35)] underline-offset-4 transition-colors hover:decoration-current nff-focus-ring"
                  >
                    {loginLabel}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

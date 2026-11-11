import { PlayCircle, Route, UserPlus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { HowItWorksStepCard, type HowItWorksStepCardProps } from '@/components/nff/HowItWorksStepCard'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRevealOnce } from '@/lib/useRevealOnce'

const delay = (ms: number) => ({ '--nff-delay': `${ms}ms` }) as CSSProperties

/**
 * Home "How it works" (S-WEB-01, "#how-it-works"): how a visitor starts, not
 * the curriculum itself. Each line matches current behaviour:
 * - Visitors hear the first 60 seconds of preview meditations and read the
 *   opening of each exploration (FLAGS.visitorFullExplorations is off).
 * - Sign-up asks for name, email and password, then email confirmation; the
 *   account is a practitioner account with full access, saved progress and the
 *   daily email preference.
 * - Six journey stages, each unlocked when the one before is complete; the
 *   library itself can be read in any order.
 * Links appear only where the step has a destination for this viewer.
 */
export function HomeHowItWorks() {
  const { user } = useAuth()
  const [ref, shown] = useRevealOnce<HTMLElement>(0.15)
  const isPractitioner = user?.role === 'practitioner'

  const steps: Omit<HowItWorksStepCardProps, 'step' | 'delayMs'>[] = [
    {
      icon: PlayCircle,
      title: 'Preview for free',
      description:
        'Listen to the first minute of selected meditations and read the opening of every exploration. No account needed.',
      action: { to: '/meditations', label: 'Try a free preview' },
    },
    {
      icon: UserPlus,
      title: 'Create your free account',
      description:
        'Sign up with your name and email, then confirm your address. Your account opens the full library and keeps your progress.',
      action: user ? undefined : { to: '/signup', label: 'Create an account' },
    },
    {
      icon: Route,
      title: 'Follow the stages',
      description:
        'Six stages, from Arriving to Integration. Each opens when you finish the one before, and the library stays open to explore in any order.',
      action: isPractitioner ? { to: '/journey', label: 'Open your journey' } : undefined,
    },
  ]

  return (
    <section
      ref={ref}
      id="how-it-works"
      aria-labelledby="how-heading"
      data-reveal={shown ? 'shown' : 'pending'}
      className="px-2 sm:px-3"
    >
      <div className="rounded-[28px] bg-nff-bg-surface-sunken md:rounded-[36px]">
        <div className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 md:py-24 lg:px-14 lg:py-28">
          <div className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-end md:gap-12">
            <div className="flex flex-col items-start gap-4">
              <p
                className="nff-reveal-fade flex items-center gap-3 nff-overline text-nff-text-brand"
                style={delay(0)}
              >
                <span aria-hidden="true" className="h-px w-8 bg-current" />
                How it works
              </p>
              <h2 id="how-heading" className="nff-heading-h1 text-balance text-foreground">
                <span className="nff-reveal-line">
                  <span style={delay(100)}>Three steps,</span>
                </span>
                <span className="nff-reveal-line">
                  <span style={delay(200)} className="text-nff-text-brand">
                    then your own pace.
                  </span>
                </span>
              </h2>
            </div>
            <p
              className="nff-reveal-fade max-w-[28rem] nff-body-lg text-pretty text-nff-text-secondary md:justify-self-end md:pb-1.5"
              style={delay(300)}
            >
              The first minute is free. The rest is yours to take slowly.
            </p>
          </div>

          <ol className="mt-10 grid auto-rows-fr gap-4 sm:mt-12 md:mt-16 md:gap-5 lg:grid-cols-3 lg:gap-6">
            {steps.map((step, index) => (
              <HowItWorksStepCard
                key={step.title}
                step={index + 1}
                delayMs={380 + index * 110}
                {...step}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Clock, LifeBuoy, Mail } from 'lucide-react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Field } from '@/pages/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthProvider'

const SUPPORT_EMAIL = 'support@meadow.example'

const TOPICS = ['Signing in', 'Playback or audio', 'My progress', 'Emails', 'My data and privacy', 'Something else'] as const

const FAQS = [
  {
    q: 'I did not get my sign-in code.',
    a: 'Codes can take a minute to arrive. Check your spam folder, then ask for a new code from the sign-in screen. Each code works for 10 minutes.',
  },
  {
    q: 'Audio stops or will not play.',
    a: 'Check your connection and try again. Meditations stream and cannot be downloaded, so they need a working internet connection.',
  },
  {
    q: 'How do I stop the daily emails?',
    a: 'Use the unsubscribe link at the bottom of any email, or turn them off in Account → Email preferences.',
  },
  {
    q: 'Can I download or delete my data?',
    a: 'Yes. Go to Account → Privacy & Security to export your data or delete your account.',
  },
]

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  topic: z.enum(TOPICS, { message: 'Choose a topic.' }),
  message: z.string().trim().min(10, 'Tell us a little more (at least 10 characters).'),
})
type Values = z.infer<typeof schema>

const CARD = 'rounded-lg border border-nff-border-default bg-nff-bg-surface'

/** Contact & support: quick ways to reach the team, common answers, and a message form. Demo only: nothing is sent. */
export function ContactPage() {
  const { user } = useAuth()
  const [sent, setSent] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', message: '' },
  })

  async function submit(values: Values) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    setSent(values.email)
    reset({ name: values.name, email: values.email, message: '' })
  }

  const quick = [
    { icon: Mail, title: 'Email us', body: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-nff-text-link underline underline-offset-4">{SUPPORT_EMAIL}</a> },
    { icon: Clock, title: 'Response time', body: 'We reply within 2 working days.' },
    { icon: LifeBuoy, title: 'Common questions', body: <a href="#faq" className="text-nff-text-link underline underline-offset-4">See answers below</a> },
  ]

  return (
    <div className="w-full flex flex-col gap-10 px-4 py-8 sm:px-6 md:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="nff-heading-h1 text-foreground">Contact &amp; support</h1>
        <p className="max-w-2xl nff-body-lg text-nff-text-secondary">
          Questions about your practice, your account or the platform? We are here to help.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-3">
        {quick.map(({ icon: Icon, title, body }) => (
          <li key={title} className={`${CARD} flex flex-col gap-3 p-5`}>
            <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-[var(--nff-sage-100)] text-[var(--nff-forest-800)]">
              <Icon className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="nff-label-lg text-foreground">{title}</h2>
              <p className="nff-body-sm text-nff-text-secondary">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section id="faq" aria-labelledby="faq-heading" className="flex scroll-mt-24 flex-col gap-4">
          <h2 id="faq-heading" className="nff-heading-h3 text-foreground">Common questions</h2>
          <AccordionPrimitive.Root type="single" collapsible className={`${CARD} divide-y divide-nff-border-default`}>
            {FAQS.map((faq, index) => (
              <AccordionPrimitive.Item key={faq.q} value={String(index)}>
                <AccordionPrimitive.Header asChild>
                  <h3>
                    <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left nff-label-md text-foreground nff-focus-ring">
                      {faq.q}
                      <span aria-hidden="true" className="text-nff-icon-secondary transition-transform group-data-[state=open]:rotate-180">⌄</span>
                    </AccordionPrimitive.Trigger>
                  </h3>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content className="px-5 pb-4 nff-body-sm text-nff-text-secondary">{faq.a}</AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            ))}
          </AccordionPrimitive.Root>
        </section>

        <section aria-labelledby="message-heading" className="flex flex-col gap-4">
          <h2 id="message-heading" className="nff-heading-h3 text-foreground">Send us a message</h2>
          <div className={`${CARD} p-5 sm:p-6`}>
            {sent ? (
              <div role="status" className="flex flex-col items-start gap-3">
                <CheckCircle2 aria-hidden="true" className="size-8 text-nff-text-success" />
                <p className="nff-heading-h4 text-foreground">Message sent</p>
                <p className="nff-body-sm text-nff-text-secondary">
                  Thank you. We will reply to {sent} within 2 working days.
                </p>
                <Button variant="outline" onClick={() => setSent(null)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" error={errors.name?.message}>
                    {(props) => <Input {...props} autoComplete="name" {...register('name')} />}
                  </Field>
                  <Field label="Email" error={errors.email?.message}>
                    {(props) => <Input {...props} type="email" autoComplete="email" {...register('email')} />}
                  </Field>
                </div>
                <Field label="Topic" error={errors.topic?.message}>
                  {(props) => (
                    <select
                      {...props}
                      defaultValue=""
                      {...register('topic')}
                      className="h-10 rounded-md border border-[var(--nff-border-strong)] bg-nff-bg-surface px-3 nff-body-sm text-foreground nff-focus-ring"
                    >
                      <option value="" disabled>
                        Choose a topic
                      </option>
                      {TOPICS.map((topic) => (
                        <option key={topic} value={topic}>
                          {topic}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Message" error={errors.message?.message}>
                  {(props) => <Textarea {...props} rows={5} {...register('message')} />}
                </Field>
                <Button type="submit" className="self-start" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Send message'}
                </Button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

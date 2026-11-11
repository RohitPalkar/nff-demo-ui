import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/features/auth/usePermissions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { stages } from '@/mocks/db'
import { PageHeader } from '@/components/cms/CmsParts'

const KNOWN = ['first_name', 'today_item', 'stage_name']
const SAMPLE: Record<string, string> = {
  first_name: 'Maya',
  today_item: 'Breath and steady attention',
  stage_name: 'Attention',
}

export function TemplateEditorPage() {
  const { can } = usePermissions()
  const { id = 'new' } = useParams()
  const [name, setName] = useState(id === 'new' ? '' : 'Daily practice email')
  const [subject, setSubject] = useState('Your practice for today, {first_name}')
  const [preheader, setPreheader] = useState('Five quiet minutes: {today_item}')
  const [greeting, setGreeting] = useState('Hello {first_name},')
  const [today, setToday] = useState('Today’s practice: {today_item}.')
  const [message, setMessage] = useState('You are in {stage_name}. Go gently.')
  const [cta, setCta] = useState('Open today’s practice')
  const [variant, setVariant] = useState(stages[1]!.id)
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop')

  const all = [subject, preheader, greeting, today, message, cta].join(' ')
  const unknown = useMemo(
    () =>
      [...all.matchAll(/\{([a-z_]+)\}/g)]
        .map((match) => match[1]!)
        .filter((token) => !KNOWN.includes(token)),
    [all],
  )

  function render(text: string) {
    return text.replace(/\{([a-z_]+)\}/g, (_, token: string) => SAMPLE[token] ?? `{${token}}`)
  }

  function save() {
    if (!name.trim()) {
      toast.error('Name the template first.')
      return
    }
    if (unknown.length > 0) {
      toast.error(`Unknown merge field: {${unknown[0]}}`)
      return
    }
    toast.success('Template saved.')
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={id === 'new' ? 'New template' : 'Edit template'}
        action={
          <div className="flex gap-2">
            <Button variant="outline" disabled={!can('campaigns.manage')} onClick={() => toast.success('Test email sent to you.')}>
              Send test
            </Button>
            <Button disabled={!can('campaigns.manage')} onClick={save}>Save</Button>
          </div>
        }
      />
      <Link to="/cms/templates" className="w-fit nff-body-sm text-nff-text-link hover:underline">
        Back to templates
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Editor" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-name">Template name</Label>
            <Input id="t-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-variant">Variant</Label>
            <Select value={variant} onValueChange={setVariant}>
              <SelectTrigger id="t-variant" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    Stage {entry.number} · {entry.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {[
            ['Subject', subject, setSubject],
            ['Preheader', preheader, setPreheader],
            ['Greeting', greeting, setGreeting],
            ['Today’s content', today, setToday],
            ['Stage message', message, setMessage],
            ['Call to action', cta, setCta],
          ].map(([label, value, set]) => (
            <div key={label as string} className="flex flex-col gap-1.5">
              <Label>{label as string}</Label>
              <Textarea
                aria-label={label as string}
                rows={2}
                value={value as string}
                onChange={(event) => (set as (v: string) => void)(event.target.value)}
              />
            </div>
          ))}
          <p className="nff-caption text-muted-foreground">
            Merge fields: {KNOWN.map((token) => `{${token}}`).join(', ')}. The footer
            always includes an unsubscribe link.
          </p>
          {unknown.length > 0 && (
            <p role="alert" className="nff-body-sm text-nff-text-error">
              Missing variable: {unknown.map((token) => `{${token}}`).join(', ')} is not
              a known merge field.
            </p>
          )}
        </section>

        <section aria-label="Preview" className="flex flex-col gap-3">
          <div className="flex gap-2" role="group" aria-label="Preview width">
            {(['desktop', 'mobile'] as const).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={width === key ? 'default' : 'outline'}
                aria-pressed={width === key}
                className="capitalize"
                onClick={() => setWidth(key)}
              >
                {key}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border bg-nff-bg-surface-sunken p-4">
            <article
              style={{ width: width === 'mobile' ? 360 : 600, maxWidth: '100%' }}
              className="mx-auto flex flex-col gap-3 rounded-lg border bg-white p-6 text-black"
            >
              <p className="text-xs text-neutral-500">{render(preheader)}</p>
              <h2 className="text-lg font-semibold">{render(subject)}</h2>
              <p>{render(greeting)}</p>
              <p>{render(today)}</p>
              <p>{render(message)}</p>
              <span className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
                {render(cta)}
              </span>
              <p className="border-t pt-3 text-xs text-neutral-500">
                You receive this because you joined Meadow. Unsubscribe.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}
